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

// Always prioritize environment variables, only use localStorage as fallback
const getSavedConfig = (): AudioConfig => {
  const envConfig = {
    dialerApiKey: import.meta.env.JUSTCALL_API_KEY,
    sttApiKey: import.meta.env.OPENAI_API_KEY,
    webhookUrl: import.meta.env.WEBHOOK_URL
  };

  // If all environment variables are present, use them
  if (envConfig.dialerApiKey && envConfig.sttApiKey && envConfig.webhookUrl) {
    return envConfig;
  }

  // Otherwise, try to get from localStorage and fall back to env vars for missing values
  try {
    const saved = localStorage.getItem('callAssistantConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      return configSchema.parse({
        dialerApiKey: envConfig.dialerApiKey || parsed.dialerApiKey || '',
        sttApiKey: envConfig.sttApiKey || parsed.sttApiKey || '',
        webhookUrl: envConfig.webhookUrl || parsed.webhookUrl || 'https://acc-projects.com/webhook'
      });
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  
  // Fall back to environment variables or empty strings
  return {
    dialerApiKey: envConfig.dialerApiKey || '',
    sttApiKey: envConfig.sttApiKey || '',
    webhookUrl: envConfig.webhookUrl || 'https://acc-projects.com/webhook'
  };
};

export const defaultAudioConfig: AudioConfig = getSavedConfig();

// Only save to localStorage if environment variables are not present
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
    
    // Only save values that aren't in environment variables
    const envConfig = {
      dialerApiKey: import.meta.env.JUSTCALL_API_KEY,
      sttApiKey: import.meta.env.OPENAI_API_KEY,
      webhookUrl: import.meta.env.WEBHOOK_URL
    };

    const storageConfig = {
      dialerApiKey: envConfig.dialerApiKey ? '' : cleanedConfig.dialerApiKey,
      sttApiKey: envConfig.sttApiKey ? '' : cleanedConfig.sttApiKey,
      webhookUrl: envConfig.webhookUrl ? '' : cleanedConfig.webhookUrl
    };

    localStorage.setItem('callAssistantConfig', JSON.stringify(storageConfig));
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