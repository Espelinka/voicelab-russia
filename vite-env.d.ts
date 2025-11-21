/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string | undefined;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};