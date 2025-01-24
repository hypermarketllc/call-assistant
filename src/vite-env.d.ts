/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly JUSTCALL_API_KEY: string
  readonly JUSTCALL_WEBHOOK_SECRET: string
  readonly OPENAI_API_KEY: string
  readonly WEBHOOK_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  webkitSpeechRecognition: any;
}