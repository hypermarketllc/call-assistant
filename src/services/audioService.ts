import { useState, useEffect, useCallback } from 'react';
import type { GradingService } from './gradingService';
import type { AudioConfig } from '../config/audioConfig';

export class AudioService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private transcriptParts: string[] = [];
  private onTranscriptUpdate: ((transcript: string) => void) | null = null;
  private isRecording: boolean = false;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;

  constructor(
    private config: AudioConfig,
    private gradingService?: GradingService,
    private currentScript?: string,
    private objections?: Record<string, any>
  ) {}

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        latencyHint: 'interactive'
      });
    }

    // Wait for audio context to be ready
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }

    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 2048;
  }

  public async startListening(): Promise<boolean> {
    try {
      // Check if already recording
      if (this.isRecording) {
        console.log('Already recording');
        return true;
      }

      console.log('Requesting microphone access...');
      
      // Initialize audio context first
      await this.initializeAudioContext();
      
      // Request microphone access with specific constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1 // Mono audio is sufficient for speech
        }
      });

      // Connect audio nodes
      if (this.audioContext && this.analyzer) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyzer);
      }

      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      // Initialize media recorder with optimal settings
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          // Process immediately if we have data
          if (this.isRecording) {
            await this.processAudioChunk();
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(3000); // Collect data every 3 seconds
      this.isRecording = true;
      this.retryCount = 0;

      console.log('Recording started with settings:', {
        mimeType,
        sampleRate: this.audioContext?.sampleRate ?? 48000,
        channelCount: 1
      });

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  private async processAudioChunk(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      if (!this.config.sttApiKey) {
        throw new Error('Speech-to-Text API key is required');
      }

      const audioBlob = new Blob(this.audioChunks, { 
        type: this.mediaRecorder?.mimeType || 'audio/webm' 
      });
      this.audioChunks = []; // Clear processed chunks

      // Skip processing if blob is too small
      if (audioBlob.size < 1024) {
        return;
      }

      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      
      if (data.text?.trim()) {
        this.transcriptParts.push(data.text);
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.transcriptParts.join(' '));
        }
      }

      // Reset retry count on successful processing
      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
      
      // Implement retry logic
      this.retryCount++;
      if (this.retryCount < this.MAX_RETRIES) {
        console.log(`Retrying audio processing (attempt ${this.retryCount + 1}/${this.MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.processAudioChunk();
      }
    }
  }

  private async cleanup() {
    // Stop media recorder
    if (this.mediaRecorder?.state !== 'inactive') {
      try {
        this.mediaRecorder?.stop();
      } catch (error) {
        console.error('Error stopping media recorder:', error);
      }
    }

    // Process any remaining audio chunks
    if (this.audioChunks.length > 0) {
      await this.processAudioChunk();
    }

    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping media track:', error);
        }
      });
    }

    // Close audio context
    if (this.audioContext?.state !== 'closed') {
      try {
        await this.audioContext?.close();
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }

    // Reset properties
    this.mediaStream = null;
    this.audioContext = null;
    this.analyzer = null;
    this.mediaRecorder = null;
    this.isRecording = false;
    this.audioChunks = [];
  }

  public async stopListening(): Promise<void> {
    console.log('Stopping audio service...');
    this.isRecording = false;
    await this.cleanup();
  }

  public setTranscriptUpdateCallback(callback: (transcript: string) => void): void {
    this.onTranscriptUpdate = callback;
  }

  public clearTranscript(): void {
    this.transcriptParts = [];
  }

  public async getCallAnalysis(): Promise<{
    transcript: string;
    analysis: {
      grades: any;
      notes: string;
    };
  } | null> {
    if (!this.gradingService || !this.currentScript || !this.objections) {
      return null;
    }

    const transcript = this.transcriptParts.join(' ');
    const analysis = await this.gradingService.analyzeCall(
      transcript,
      this.currentScript,
      this.objections
    );

    return {
      transcript,
      analysis
    };
  }
}

export function useAudioService(config: AudioConfig) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
        });
      } catch (err) {
        console.error('Failed to check microphone permission:', err);
      }
    };

    void checkPermission();
  }, []);

  const createAudioService = useCallback((
    gradingService?: GradingService,
    currentScript?: string,
    objections?: Record<string, any>
  ) => {
    const service = new AudioService(config, gradingService, currentScript, objections);
    service.setTranscriptUpdateCallback((newTranscript: string) => {
      setTranscript(newTranscript);
    });
    return service;
  }, [config]);

  const startListening = async (
    gradingService?: GradingService,
    currentScript?: string,
    objections?: Record<string, any>
  ) => {
    try {
      setError(null);
      const service = createAudioService(gradingService, currentScript, objections);
      const success = await service.startListening();
      if (success) {
        setIsListening(true);
        return service;
      }
      throw new Error('Failed to start listening');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start listening';
      console.error('Audio service error:', {
        message: errorMessage,
        stack: err.stack
      });
      setError(errorMessage);
      setIsListening(false);
      throw new Error(errorMessage);
    }
  };

  const stopListening = async (service: AudioService) => {
    await service.stopListening();
    setIsListening(false);
    setError(null);
  };

  return {
    isListening,
    error,
    permissionStatus,
    transcript,
    startListening,
    stopListening
  };
}