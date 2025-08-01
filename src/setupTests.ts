// Test setup file
import 'dotenv/config';
import { globalCache } from './utils/cache';
import { globalRateLimiter } from './utils/rate-limiter';

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.LL_USERNAME = 'test@example.com';
process.env.LL_PASSWORD = 'test-password';

// Cleanup function to clear background intervals
beforeAll(() => {
  // Disable logging during tests to reduce noise
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Clear any background intervals
  globalCache.clear();
  globalRateLimiter.clear();
  
  // Wait a bit for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 200));
});

// Global test configuration
// Note: Jest globals are available in test environment 