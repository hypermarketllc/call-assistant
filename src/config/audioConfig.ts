import { z } from 'zod';

export interface AudioConfig {
  dialerApiKey: string;    // JustCall API key
  sttApiKey: string;       // OpenAI Whisper API key
  webhookUrl: string;      // Webhook endpoint URL
}

// Validate JustCall API key format (40-char hex keys separated by colon)
const justCallApiKeyRegex = /^[a-f0-9]{40}:[a-f0-9]{40}$/i;

// Validate OpenAI API key format (starts with 'sk-' followed by base58 chars)
const openAIApiKeyRegex = /^sk-[a-zA-Z0-9]{32,}$/;

export const configSchema = z.object({
  dialerApiKey: z.string()
    .min(1, 'JustCall API key is required')
    .regex(justCallApiKeyRegex, 'Invalid JustCall API key format. Expected format: 40-char-hex:40-char-hex'),
  sttApiKey: z.string()
    .min(1, 'OpenAI API key is required')
    .regex(openAIApiKeyRegex, 'Invalid OpenAI API key format. Should start with sk- followed by at least 32 characters'),
  webhookUrl: z.string()
    .url('Invalid webhook URL')
    .default('http://localhost:3002/webhook')
});

const getSavedConfig = (): AudioConfig => {
  const defaultConfig = {
    dialerApiKey: '',
    sttApiKey: '',
    webhookUrl: 'http://localhost:3002/webhook'
  };

  try {
    // First try environment variables
    const envConfig = {
      dialerApiKey: import.meta.env.VITE_JUSTCALL_API_KEY || '',
      sttApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      webhookUrl: import.meta.env.VITE_WEBHOOK_URL || defaultConfig.webhookUrl
    };

    // Validate environment variables
    const validatedEnvConfig = configSchema.safeParse(envConfig);
    if (validatedEnvConfig.success) {
      return validatedEnvConfig.data;
    }

    // Try loading from localStorage
    const savedConfig = localStorage.getItem('callAssistantConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      const mergedConfig = {
        dialerApiKey: envConfig.dialerApiKey || parsed.dialerApiKey || defaultConfig.dialerApiKey,
        sttApiKey: envConfig.sttApiKey || parsed.sttApiKey || defaultConfig.sttApiKey,
        webhookUrl: envConfig.webhookUrl || parsed.webhookUrl || defaultConfig.webhookUrl
      };

      const validatedConfig = configSchema.safeParse(mergedConfig);
      if (validatedConfig.success) {
        return validatedConfig.data;
      }
    }

    // Return default config if no valid config found
    return defaultConfig;
  } catch (error) {
    console.error('Failed to load config:', error);
    return defaultConfig;
  }
};

export const defaultAudioConfig: AudioConfig = getSavedConfig();

export const saveAudioConfig = (config: AudioConfig): boolean => {
  try {
    const cleanedConfig = {
      ...config,
      dialerApiKey: config.dialerApiKey.trim(),
      sttApiKey: config.sttApiKey.trim(),
      webhookUrl: config.webhookUrl.trim()
    };

    // Validate the configuration
    const validatedConfig = configSchema.safeParse(cleanedConfig);
    if (!validatedConfig.success) {
      console.error('Config validation failed:', validatedConfig.error);
      return false;
    }

    // Only save values that aren't in environment variables
    const envConfig = {
      dialerApiKey: import.meta.env.VITE_JUSTCALL_API_KEY,
      sttApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      webhookUrl: import.meta.env.VITE_WEBHOOK_URL
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
  const cleaned = key.trim();
  return justCallApiKeyRegex.test(cleaned);
};

export const validateOpenAIApiKey = (key: string): boolean => {
  const cleaned = key.trim();
  return openAIApiKeyRegex.test(cleaned);
};