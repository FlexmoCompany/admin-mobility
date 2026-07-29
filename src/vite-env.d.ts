/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_BACKOFFICE_ENV?: string;
  readonly VITE_AUTH_PRODUCT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
