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
  private isInbound: boolean = true;
  private isRecording: boolean = false;
  private justcallSession: string | null = null;

  constructor(
    private config: AudioConfig,
    private gradingService?: GradingService,
    private currentScript?: string,
    private objections?: Record<string, any>
  ) {}

  private async initializeJustCallSession(): Promise<string> {
    try {
      // Validate required configuration
      if (!this.config.dialerApiKey) {
        throw new Error('JustCall API key is required');
      }

      const [key, secret] = this.config.dialerApiKey.split(':');
      if (!key || !secret) {
        throw new Error('Invalid JustCall API key format. Expected format: key:secret');
      }

      console.log('Initializing JustCall session...');
      
      const apiUrl = process.env.NODE_ENV === 'production'
        ? `https://${process.env.DOMAIN}/api/justcall/init`
        : '/api/justcall/init';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recording_enabled: true,
          webhook_url: this.config.webhookUrl || window.location.origin + '/webhook'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('JustCall API error response:', error);
        throw new Error(error.error || 'Failed to initialize JustCall session');
      }

      const data = await response.json();
      if (!data.session_id) {
        throw new Error('No session ID received from JustCall');
      }

      this.justcallSession = data.session_id;
      console.log('JustCall session initialized:', this.justcallSession);
      return data.session_id;
    } catch (error: any) {
      console.error('JustCall initialization error:', error);
      throw new Error(`JustCall initialization failed: ${error.message}`);
    }
  }

  private async processAudioChunk(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];

    try {
      if (!this.config.sttApiKey) {
        throw new Error('Speech-to-Text API key is required');
      }

      const buffer = await audioBlob.arrayBuffer();
      const base64Audio = Buffer.from(buffer).toString('base64');

      const apiUrl = process.env.NODE_ENV === 'production'
        ? `https://${process.env.DOMAIN}/api/transcribe`
        : '/api/transcribe';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio: base64Audio
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      if (data.text?.trim()) {
        this.transcriptParts.push(data.text);
        
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.transcriptParts.join(' '));
        }
      }
    } catch (error: any) {
      console.error('Failed to process audio chunk:', error);
    }
  }

  public async startListening(): Promise<boolean> {
    try {
      console.log('Starting audio service...');

      // Validate required configuration
      if (!this.config.dialerApiKey) {
        throw new Error('JustCall API key is required');
      }

      if (!this.config.sttApiKey) {
        throw new Error('Speech-to-Text API key is required');
      }

      // Initialize JustCall session first
      await this.initializeJustCallSession();

      // Check microphone permissions
      const permissionResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permissionResult.state === 'denied') {
        throw new Error('Microphone permission is denied');
      }

      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');

      // Set up audio processing
      this.audioContext = new AudioContext();
      this.analyzer = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyzer);

      // Configure MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        void this.processAudioChunk();
      };

      // Start recording
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
      throw new Error(error.message || 'Failed to start audio service');
    }
  }

  public async stopListening(): Promise<void> {
    console.log('Stopping audio service...');
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      await this.audioContext.close();
    }

    if (this.justcallSession) {
      try {
        const apiUrl = process.env.NODE_ENV === 'production'
          ? `https://${process.env.DOMAIN}/api/justcall/end/${this.justcallSession}`
          : `/api/justcall/end/${this.justcallSession}`;

        const response = await fetch(apiUrl, {
          method: 'POST'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to end JustCall session');
        }

        console.log('JustCall session ended');
      } catch (error) {
        console.error('Failed to end JustCall session:', error);
      }
    }

    this.mediaStream = null;
    this.audioContext = null;
    this.analyzer = null;
    this.mediaRecorder = null;
    this.justcallSession = null;
    console.log('Audio service stopped');
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
      }
      return service;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start listening';
      setError(errorMessage);
      setIsListening(false);
      throw new Error(errorMessage);
    }
  };

  const stopListening = (service: AudioService) => {
    void service.stopListening();
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