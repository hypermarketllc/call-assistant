import { z } from 'zod';

export interface AudioConfig {
  dialerApiKey: string;    // JustCall API key
  sttApiKey: string;       // OpenAI Whisper API key
  webhookUrl: string;      // Webhook endpoint URL
}

// Validate JustCall API key format (key:secret)
const justCallApiKeyRegex = /^[a-f0-9]{32}:[a-f0-9]{32}$/i;

const configSchema = z.object({
  dialerApiKey: z.string().min(1, 'JustCall API key is required'),
  sttApiKey: z.string().min(1, 'Speech-to-Text API key is required'),
  webhookUrl: z.string().url().default('https://acc-projects.com/webhook')
});

// Load saved config from localStorage if it exists
const getSavedConfig = (): AudioConfig => {
  try {
    const saved = localStorage.getItem('callAssistantConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      return configSchema.parse({
        dialerApiKey: parsed.dialerApiKey || '',
        sttApiKey: parsed.sttApiKey || '',
        webhookUrl: parsed.webhookUrl || 'https://acc-projects.com/webhook'
      });
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  
  return {
    dialerApiKey: '',
    sttApiKey: '',
    webhookUrl: 'https://acc-projects.com/webhook'
  };
};

export const defaultAudioConfig: AudioConfig = getSavedConfig();

export const saveAudioConfig = (config: AudioConfig): boolean => {
  try {
    const cleanedConfig = {
      ...config,
      dialerApiKey: config.dialerApiKey.trim().replace(/\s+/g, '')
    };

    // Validate JustCall API key format
    if (!validateJustCallApiKey(cleanedConfig.dialerApiKey)) {
      throw new Error('Invalid JustCall API key format');
    }

    configSchema.parse(cleanedConfig);
    localStorage.setItem('callAssistantConfig', JSON.stringify(cleanedConfig));
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
};

export const validateJustCallApiKey = (key: string): boolean => {
  const cleaned = key.trim().replace(/\s+/g, '');
  return justCallApiKeyRegex.test(cleaned);
};