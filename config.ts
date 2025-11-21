// Centralized configuration for the application
export const AppConfig = {
  // Audio generation settings
  MAX_CHUNK_SIZE: 800,
  REQUEST_DELAY_MS: 1000,
  MAX_RETRIES: 3,
  
  // Audio format settings
  DEFAULT_SAMPLE_RATE: 24000,
  DEFAULT_CHANNELS: 1,
  
  // Cache settings
  ENABLE_CACHING: true,
  CACHE_TTL: 3600000, // 1 hour in milliseconds
  
  // Rate limiting settings
  RATE_LIMIT_MAX_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  
  // Progress reporting
  PROGRESS_UPDATE_INTERVAL: 500, // ms
  
  // Validation settings
  MAX_TEXT_LENGTH: 100000, // 100k characters
};