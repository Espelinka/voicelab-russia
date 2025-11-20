interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment global scope to add API_KEY to ProcessEnv.
// This avoids redeclaring 'process' which causes conflicts when @types/node is present.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }
}

export {};