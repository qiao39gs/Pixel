/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POLLINATIONS_API_KEY?: string;
  readonly VITE_POLLINATIONS_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
