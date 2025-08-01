import { getRateLimitConfig } from "../config";
import { logger } from "./logger";

// Rate limiter entry
interface RateLimitEntry {
  timestamp: number;
  count: number;
}

// Rate limiter implementation with sliding window
export class RateLimiter {
  private requests = new Map<string, RateLimitEntry[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Only start cleanup interval if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanupInterval();
    }
  }

  // Check if request is allowed
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let entries = this.requests.get(key) || [];

    // Remove expired entries
    entries = entries.filter((entry) => entry.timestamp > windowStart);

    // Count total requests in current window
    const totalRequests = entries.reduce((sum, entry) => sum + entry.count, 0);

    // Check if under limit
    const allowed = totalRequests < this.maxRequests;

    if (allowed) {
      // Add current request
      entries.push({ timestamp: now, count: 1 });
      this.requests.set(key, entries);
    }

    logger.debug(`Rate limit check: ${key}`, {
      operation: "rate_limit_check",
      key,
      total_requests: totalRequests,
      max_requests: this.maxRequests,
      allowed,
      window_ms: this.windowMs,
    });

    return allowed;
  }

  // Get remaining requests for a key
  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entries = this.requests.get(key) || [];
    const validEntries = entries.filter(
      (entry) => entry.timestamp > windowStart,
    );
    const totalRequests = validEntries.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    return Math.max(0, this.maxRequests - totalRequests);
  }

  // Get reset time for a key
  getResetTime(key: string): number {
    const entries = this.requests.get(key) || [];
    if (entries.length === 0) {
      return Date.now();
    }

    // Find the oldest entry
    const oldestEntry = entries.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest,
    );

    return oldestEntry.timestamp + this.windowMs;
  }

  // Reset rate limit for a key
  reset(key: string): void {
    this.requests.delete(key);
    logger.debug(`Rate limit reset: ${key}`, {
      operation: "rate_limit_reset",
      key,
    });
  }

  // Get rate limit info for a key
  getInfo(key: string): {
    remaining: number;
    resetTime: number;
    limit: number;
    windowMs: number;
  } {
    return {
      remaining: this.getRemaining(key),
      resetTime: this.getResetTime(key),
      limit: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  // Get all active keys
  getActiveKeys(): string[] {
    return Array.from(this.requests.keys());
  }

  // Clear all rate limits
  clear(): void {
    this.requests.clear();
    
    // Clear background interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info("Rate limiter cleared", { operation: "rate_limiter_clear" });
  }

  // Get statistics
  getStats(): {
    activeKeys: number;
    totalRequests: number;
    maxRequests: number;
    windowMs: number;
  } {
    const totalRequests = Array.from(this.requests.values()).reduce(
      (sum, entries) => sum + entries.length,
      0,
    );

    return {
      activeKeys: this.requests.size,
      totalRequests,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  // Private methods
  private cleanupExpired(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, entries] of this.requests.entries()) {
      const validEntries = entries.filter(
        (entry) => entry.timestamp > windowStart,
      );

      if (validEntries.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validEntries);
      }
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 30000);
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Global rate limiter instance
const rateLimitConfig = getRateLimitConfig();
export const globalRateLimiter = new RateLimiter(
  rateLimitConfig.requests,
  rateLimitConfig.windowMs,
);

// Rate limiting decorator
export function rateLimited(keyGenerator?: (...args: any[]) => string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Generate rate limit key
      const key = keyGenerator
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyName}`;

      // Check rate limit
      if (!globalRateLimiter.isAllowed(key)) {
        const info = globalRateLimiter.getInfo(key);
        const resetTime = new Date(info.resetTime).toISOString();

        throw new Error(
          `Rate limit exceeded. Limit: ${info.limit} requests per ${info.windowMs}ms. ` +
            `Reset time: ${resetTime}`,
        );
      }

      // Execute method
      return await method.apply(this, args);
    };
  };
}

// Rate limiting utilities
export class RateLimitUtils {
  // Check rate limit with custom key
  static checkRateLimit(key: string): boolean {
    return globalRateLimiter.isAllowed(key);
  }

  // Get rate limit info
  static getRateLimitInfo(key: string) {
    return globalRateLimiter.getInfo(key);
  }

  // Reset rate limit for key
  static resetRateLimit(key: string): void {
    globalRateLimiter.reset(key);
  }

  // Get rate limiter statistics
  static getStats() {
    return globalRateLimiter.getStats();
  }
}
