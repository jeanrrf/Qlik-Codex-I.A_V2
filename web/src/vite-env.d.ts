/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CONVEX_URL: string;
  readonly VITE_USE_CONVEX: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}