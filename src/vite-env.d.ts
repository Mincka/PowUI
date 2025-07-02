// Vite environment variable typings
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  // Add more env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
