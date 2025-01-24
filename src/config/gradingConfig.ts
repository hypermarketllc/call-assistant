import { z } from 'zod';

export interface GradingConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

const configSchema = z.object({
  spreadsheetId: z.string().optional().default(''),
  clientEmail: z.string().optional().default(''),
  privateKey: z.string().optional().default('')
});

const loadConfig = (): GradingConfig => {
  const config = {
    spreadsheetId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '',
    clientEmail: import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: import.meta.env.VITE_GOOGLE_PRIVATE_KEY || ''
  };

  try {
    return configSchema.parse(config);
  } catch (error) {
    console.error('Invalid grading configuration:', error);
    return {
      spreadsheetId: '',
      clientEmail: '',
      privateKey: ''
    };
  }
};

export const defaultGradingConfig: GradingConfig = loadConfig();

export const validateGradingConfig = (config: GradingConfig): string | null => {
  if (!config.spreadsheetId) return 'Google Sheets ID is required';
  if (!config.clientEmail) return 'Service account email is required';
  if (!config.privateKey) return 'Service account private key is required';
  return null;
};