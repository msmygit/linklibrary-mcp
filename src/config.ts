import * as dotenv from 'dotenv';
import { ServerConfig } from './types';

// Load environment variables
dotenv.config();

// Default configuration
const DEFAULT_CONFIG: ServerConfig = {
  api_base_url: 'https://linklibrary.ai/api',
  timeout_ms: 30000,
  max_retries: 3,
  cache_ttl_seconds: 300, // 5 minutes
  cache_max_size: 1000,
  rate_limit_requests: 100,
  rate_limit_window_ms: 60000, // 1 minute
};

// Environment-based configuration
export const config: ServerConfig = {
  api_base_url: process.env.LINKLIBRARY_API_URL || DEFAULT_CONFIG.api_base_url,
  timeout_ms: parseInt(process.env.API_TIMEOUT_MS || DEFAULT_CONFIG.timeout_ms.toString()),
  max_retries: parseInt(process.env.API_MAX_RETRIES || DEFAULT_CONFIG.max_retries.toString()),
  cache_ttl_seconds: parseInt(process.env.CACHE_TTL_SECONDS || DEFAULT_CONFIG.cache_ttl_seconds.toString()),
  cache_max_size: parseInt(process.env.CACHE_MAX_SIZE || DEFAULT_CONFIG.cache_max_size.toString()),
  rate_limit_requests: parseInt(process.env.RATE_LIMIT_REQUESTS || DEFAULT_CONFIG.rate_limit_requests.toString()),
  rate_limit_window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || DEFAULT_CONFIG.rate_limit_window_ms.toString()),
};

// Authentication configuration
export const authConfig = {
  username: process.env.LL_USERNAME,
  password: process.env.LL_PASSWORD,
  token: process.env.LL_TOKEN,
};

// Logging configuration
export const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json',
  enable_metrics: process.env.ENABLE_METRICS === 'true',
};

// Validation functions
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.api_base_url) {
    errors.push('API base URL is required');
  }

  if (config.timeout_ms < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.max_retries < 0) {
    errors.push('Max retries must be non-negative');
  }

  if (config.cache_ttl_seconds < 0) {
    errors.push('Cache TTL must be non-negative');
  }

  if (config.cache_max_size < 1) {
    errors.push('Cache max size must be at least 1');
  }

  if (config.rate_limit_requests < 1) {
    errors.push('Rate limit requests must be at least 1');
  }

  if (config.rate_limit_window_ms < 1000) {
    errors.push('Rate limit window must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

// Configuration getters with validation
export function getApiBaseUrl(): string {
  return config.api_base_url;
}

export function getTimeoutMs(): number {
  return config.timeout_ms;
}

export function getMaxRetries(): number {
  return config.max_retries;
}

export function getCacheConfig() {
  return {
    ttl: config.cache_ttl_seconds * 1000, // Convert to milliseconds
    maxSize: config.cache_max_size,
  };
}

export function getRateLimitConfig() {
  return {
    requests: config.rate_limit_requests,
    windowMs: config.rate_limit_window_ms,
  };
}

// Environment validation
export function validateEnvironment(): void {
  const errors: string[] = [];

  if (!authConfig.username && !authConfig.token) {
    errors.push('Either LL_USERNAME or LL_TOKEN environment variable is required');
  }

  if (authConfig.username && !authConfig.password) {
    errors.push('LL_PASSWORD is required when using LL_USERNAME');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
}

// Configuration summary for logging
export function getConfigSummary(): Record<string, any> {
  return {
    api_base_url: config.api_base_url,
    timeout_ms: config.timeout_ms,
    max_retries: config.max_retries,
    cache_ttl_seconds: config.cache_ttl_seconds,
    cache_max_size: config.cache_max_size,
    rate_limit_requests: config.rate_limit_requests,
    rate_limit_window_ms: config.rate_limit_window_ms,
    has_username: !!authConfig.username,
    has_token: !!authConfig.token,
    log_level: logConfig.level,
    metrics_enabled: logConfig.enable_metrics,
  };
} 