import { getCacheConfig } from "../config";
import { CacheEntry } from "../types";
import { logger } from "./logger";

// LRU Cache implementation with TTL
export class InMemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize: number = 1000, defaultTtl: number = 300000) {
    // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
    
    // Only start cleanup interval if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanupInterval();
    }
  }

  // Set a value in the cache
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.defaultTtl;

    // Remove old entry if it exists
    this.delete(key);

    // Add new entry
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: entryTtl,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);

    // Evict if cache is full
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }

    logger.debug(`Cache set: ${key}`, {
      operation: "cache_set",
      cache_size: this.cache.size,
      ttl: entryTtl,
    });
  }

  // Get a value from the cache
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug(`Cache miss: ${key}`, { operation: "cache_miss" });
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.delete(key);
      logger.debug(`Cache expired: ${key}`, { operation: "cache_expired" });
      return null;
    }

    // Update access order (move to end)
    this.updateAccessOrder(key);

    logger.debug(`Cache hit: ${key}`, { operation: "cache_hit" });
    return entry.data;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // Delete a key from the cache
  delete(key: string): boolean {
    const existed = this.cache.has(key);

    if (existed) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }

      logger.debug(`Cache delete: ${key}`, { operation: "cache_delete" });
    }

    return existed;
  }

  // Clear all entries
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    
    // Clear background interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info("Cache cleared", { operation: "cache_clear" });
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.missCount / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      missRate,
      evictionCount: this.evictionCount,
    };
  }

  // Get all keys (for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  get size(): number {
    return this.cache.size;
  }

  // Private methods
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift();
    if (!oldestKey) return;
    this.cache.delete(oldestKey);
    this.evictionCount++;

    logger.debug(`Cache eviction: ${oldestKey}`, {
      operation: "cache_eviction",
      eviction_count: this.evictionCount,
    });
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.debug(
        `Cache cleanup: removed ${expiredKeys.length} expired entries`,
        {
          operation: "cache_cleanup",
          expired_count: expiredKeys.length,
        },
      );
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  // Statistics tracking
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  // Update statistics
  private recordHit(): void {
    this.hitCount++;
  }

  private recordMiss(): void {
    this.missCount++;
  }
}

// Global cache instance
const cacheConfig = getCacheConfig();
export const globalCache = new InMemoryCache(
  cacheConfig.maxSize,
  cacheConfig.ttl,
);

// Cache decorator for methods
export function cached(ttl?: number) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const cacheKeyPrefix = `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      // Generate cache key from method name and arguments
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`;

      // Try to get from cache first
      const cachedResult = globalCache.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      globalCache.set(cacheKey, result, ttl);

      return result;
    };
  };
}

// Cache utilities
export class CacheUtils {
  // Generate cache key from multiple parts
  static generateKey(...parts: any[]): string {
    return parts
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join(":");
  }

  // Cache with custom key generator
  static cachedWithKey(keyGenerator: (...args: any[]) => string, ttl?: number) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = keyGenerator(...args);

        const cachedResult = globalCache.get(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }

        const result = await method.apply(this, args);
        globalCache.set(cacheKey, result, ttl);

        return result;
      };
    };
  }

  // Invalidate cache by pattern
  static invalidatePattern(pattern: string): number {
    const keys = globalCache.keys();
    const matchingKeys = keys.filter((key) => key.includes(pattern));

    let invalidatedCount = 0;
    for (const key of matchingKeys) {
      if (globalCache.delete(key)) {
        invalidatedCount++;
      }
    }

    logger.info(
      `Cache invalidation: ${invalidatedCount} keys matching pattern "${pattern}"`,
      {
        operation: "cache_invalidation",
        pattern,
        invalidated_count: invalidatedCount,
      },
    );

    return invalidatedCount;
  }
}
