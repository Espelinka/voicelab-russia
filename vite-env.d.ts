// Fix: Remove reference to missing 'vite/client' types
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Fix: Remove conflicting 'declare const process' to resolve "Cannot redeclare block-scoped variable" error.
// Augment NodeJS.ProcessEnv to strictly type process.env.API_KEY, relying on the existing 'process' declaration.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}