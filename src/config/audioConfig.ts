export interface AudioConfig {
  dialerApiKey: string;    // JustCall API key
  sttApiKey: string;       // OpenAI Whisper API key
  webhookUrl: string;      // Webhook endpoint URL
}

// Load saved config from localStorage if it exists
const getSavedConfig = (): AudioConfig => {
  const saved = localStorage.getItem('callAssistantConfig');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    dialerApiKey: '',
    sttApiKey: '',
    webhookUrl: '',
  };
};

export const defaultAudioConfig: AudioConfig = getSavedConfig();

export interface JustCallEvent {
  event_type: string;
  call_id: string;
  session_id: string;
  agent_number: string;
  customer_number: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'answered' | 'completed' | 'missed';
  duration: number;
  recording_url?: string;
  voicemail_url?: string;
  queue_name?: string;
  ai_report?: {
    summary: string;
    sentiment: string;
    action_items: string[];
    topics: string[];
  };
}