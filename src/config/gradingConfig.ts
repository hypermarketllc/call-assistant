export interface GradingConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

export const defaultGradingConfig: GradingConfig = {
  spreadsheetId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '',
  clientEmail: import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  privateKey: import.meta.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
};