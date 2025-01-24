import { useState, useEffect, useCallback } from 'react';
import { GradingService } from './gradingService';
import type { AudioConfig } from '../config/audioConfig';

export class AudioService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private transcriptParts: string[] = [];
  private onTranscriptUpdate: ((transcript: string) => void) | null = null;
  private isInbound: boolean = true;
  private isRecording: boolean = false;
  private justcallSession: string | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second delay between retries

  constructor(
    private config: AudioConfig,
    private gradingService?: GradingService,
    private currentScript?: string,
    private objections?: Record<string, any>
  ) {}

  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.config.sttApiKey) {
      throw new Error('Speech-to-Text API key is not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.sttApiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Failed to transcribe audio' } }));
        throw new Error(error.error?.message || 'Failed to transcribe audio');
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error('Transcription error:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying transcription (attempt ${this.retryCount}/${this.maxRetries})...`);
        
        // Add exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, this.retryCount - 1)));
        
        return this.transcribeAudio(audioBlob);
      }
      
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  private async processAudioChunk() {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = []; // Clear the chunks after processing

    try {
      const transcript = await this.transcribeAudio(audioBlob);
      if (transcript.trim()) { // Only add non-empty transcripts
        this.transcriptParts.push(transcript);
        
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.transcriptParts.join(' '));
        }
      }
    } catch (error: any) {
      console.error('Failed to process audio chunk:', error);
      // Don't throw here to keep recording going
    }
  }

  public async startListening() {
    try {
      console.log('Starting audio service...');
      
      // Reset retry count
      this.retryCount = 0;

      // Check API keys
      if (!this.config.dialerApiKey) {
        throw new Error('JustCall API key is required');
      }
      if (!this.config.sttApiKey) {
        throw new Error('Speech-to-Text API key is required');
      }

      const permissionResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionResult.state === 'denied') {
        throw new Error('Microphone permission is denied. Please allow microphone access in your browser settings.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');

      this.audioContext = new AudioContext();
      this.analyzer = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyzer);

      // Set up MediaRecorder for Whisper API
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudioChunk();
      };

      // Start recording in chunks
      this.isRecording = true;
      this.mediaRecorder.start();
      console.log('Recording started');

      // Process chunks every 5 seconds
      const processInterval = setInterval(() => {
        if (this.isRecording && this.mediaRecorder) {
          this.mediaRecorder.stop();
          this.mediaRecorder.start();
        } else {
          clearInterval(processInterval);
        }
      }, 5000);

      return true;
    } catch (error: any) {
      console.error('Failed to start listening:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone access was denied. Please allow microphone access to use this feature.');
      } else {
        throw error;
      }
    }
  }

  public stopListening() {
    console.log('Stopping audio service...');
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.mediaStream = null;
    this.audioContext = null;
    this.analyzer = null;
    this.mediaRecorder = null;
    console.log('Audio service stopped');
  }

  public setTranscriptUpdateCallback(callback: (transcript: string) => void) {
    this.onTranscriptUpdate = callback;
  }

  public clearTranscript() {
    this.transcriptParts = [];
  }
}

export const useAudioService = (config: AudioConfig) => {
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

    checkPermission();
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
      }
      return service;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start listening';
      setError(errorMessage);
      setIsListening(false);
      throw err;
    }
  };

  const stopListening = (service: AudioService) => {
    service.stopListening();
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
};