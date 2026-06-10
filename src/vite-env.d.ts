/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_VIDEO_DB_UPLOAD_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
