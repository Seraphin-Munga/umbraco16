/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UMBRACO_API_BASE_URL: string;
  readonly VITE_ONLINE_UPLOAD_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
