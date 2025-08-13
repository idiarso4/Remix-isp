// Simple in-memory cache implementation
interface CacheItem<T> {
  value: T;
  expiry: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 500, defaultTTL: number = 1000 * 60 * 5) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: T, options?: { ttl?: number }): void {
    const ttl = options?.ttl || this.defaultTTL;
    const expiry = Date.now() + ttl;

    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  get size(): number {
    // Clean expired items
    this.cleanExpired();
    return this.cache.size;
  }

  get max(): number {
    return this.maxSize;
  }

  get hits(): number {
    return 0; // Simplified - not tracking hits/misses
  }

  get misses(): number {
    return 0; // Simplified - not tracking hits/misses
  }

  get calculatedSize(): number {
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  keys(): IterableIterator<string> {
    this.cleanExpired();
    return this.cache.keys();
  }
}

// In-memory cache for frequently accessed data
const cache = new SimpleCache<any>(500, 1000 * 60 * 5);

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard:stats',
  CUSTOMER_LIST: 'customers:list',
  EMPLOYEE_LIST: 'employees:list',
  PACKAGE_LIST: 'packages:list',
  TICKET_STATS: 'tickets:stats',
  PAYMENT_STATS: 'payments:stats',
  PERFORMANCE_METRICS: 'performance:metrics',
} as const;

export class CacheService {
  static get<T>(key: string): T | undefined {
    return cache.get(key);
  }

  static set<T>(key: string, value: T, ttl?: number): void {
    cache.set(key, value, { ttl });
  }

  static delete(key: string): void {
    cache.delete(key);
  }

  static clear(): void {
    cache.clear();
  }

  static has(key: string): boolean {
    return cache.has(key);
  }

  // Invalidate related caches
  static invalidatePattern(pattern: string): void {
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    });
  }

  // Cache with automatic invalidation
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  // Batch cache operations
  static setMany(entries: Array<{ key: string; value: any; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  // Get cache statistics
  static getStats() {
    return {
      size: cache.size,
      max: cache.max,
      calculatedSize: cache.calculatedSize,
      hits: cache.hits,
      misses: cache.misses,
      hitRate: cache.hits / (cache.hits + cache.misses) || 0,
    };
  }
}

// Cache invalidation helpers
export const invalidateCustomerCache = () => {
  CacheService.invalidatePattern('customers');
  CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
};

export const invalidateTicketCache = () => {
  CacheService.invalidatePattern('tickets');
  CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
  CacheService.delete(CACHE_KEYS.TICKET_STATS);
};

export const invalidateEmployeeCache = () => {
  CacheService.invalidatePattern('employees');
  CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
  CacheService.delete(CACHE_KEYS.PERFORMANCE_METRICS);
};

export const invalidatePaymentCache = () => {
  CacheService.invalidatePattern('payments');
  CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
  CacheService.delete(CACHE_KEYS.PAYMENT_STATS);
};

export const invalidatePackageCache = () => {
  CacheService.invalidatePattern('packages');
  CacheService.delete(CACHE_KEYS.DASHBOARD_STATS);
};