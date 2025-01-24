/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUSTCALL_API_KEY: string | undefined
  readonly VITE_JUSTCALL_WEBHOOK_SECRET: string | undefined
  readonly VITE_OPENAI_API_KEY: string | undefined
  readonly VITE_WEBHOOK_URL: string | undefined
  readonly VITE_GOOGLE_SPREADSHEET_ID: string | undefined
  readonly VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL: string | undefined
  readonly VITE_GOOGLE_PRIVATE_KEY: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  webkitSpeechRecognition: any;
}