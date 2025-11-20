// Ensure this is treated as a module to allow global augmentation
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }
}