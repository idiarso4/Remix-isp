import { CacheService } from "~/lib/cache.server";

// Performance monitoring and metrics collection
export class PerformanceMonitor {
  private static metrics: Map<string, any[]> = new Map();
  private static readonly MAX_METRICS_PER_KEY = 100;

  // Track database query performance
  static trackQuery(queryName: string, duration: number, recordCount?: number) {
    const metric = {
      timestamp: Date.now(),
      duration,
      recordCount,
      type: 'database'
    };

    this.addMetric(`query:${queryName}`, metric);
  }

  // Track API endpoint performance
  static trackEndpoint(endpoint: string, method: string, duration: number, statusCode: number) {
    const metric = {
      timestamp: Date.now(),
      duration,
      statusCode,
      method,
      type: 'endpoint'
    };

    this.addMetric(`endpoint:${endpoint}`, metric);
  }

  // Track cache performance
  static trackCache(operation: 'hit' | 'miss' | 'set', key: string, duration?: number) {
    const metric = {
      timestamp: Date.now(),
      operation,
      key,
      duration,
      type: 'cache'
    };

    this.addMetric('cache:operations', metric);
  }

  // Add metric to collection
  private static addMetric(key: string, metric: any) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only the latest metrics
    if (metrics.length > this.MAX_METRICS_PER_KEY) {
      metrics.shift();
    }
  }

  // Get performance statistics
  static getStats(key?: string) {
    if (key) {
      const metrics = this.metrics.get(key) || [];
      return this.calculateStats(metrics);
    }

    const allStats: Record<string, any> = {};
    for (const [metricKey, metrics] of this.metrics.entries()) {
      allStats[metricKey] = this.calculateStats(metrics);
    }

    return allStats;
  }

  // Calculate statistics from metrics
  private static calculateStats(metrics: any[]) {
    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }

    const durations = metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const count = metrics.length;
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    const minDuration = durations[0] || 0;
    const maxDuration = durations[durations.length - 1] || 0;
    const p95Duration = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99Duration = durations[Math.floor(durations.length * 0.99)] || 0;

    return {
      count,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration,
      maxDuration,
      p95Duration,
      p99Duration,
      recentMetrics: metrics.slice(-10) // Last 10 metrics
    };
  }

  // Get system performance overview
  static getSystemOverview() {
    const cacheStats = CacheService.getStats();
    const queryStats = this.getStats('query:customers') || {};
    const endpointStats = this.getStats('endpoint:/customers') || {};

    return {
      cache: {
        hitRate: Math.round(cacheStats.hitRate * 100),
        size: cacheStats.size,
        maxSize: cacheStats.max,
        hits: cacheStats.hits,
        misses: cacheStats.misses
      },
      database: {
        avgQueryTime: queryStats.avgDuration || 0,
        slowQueries: this.getSlowQueries(),
        totalQueries: queryStats.count || 0
      },
      endpoints: {
        avgResponseTime: endpointStats.avgDuration || 0,
        slowEndpoints: this.getSlowEndpoints(),
        totalRequests: endpointStats.count || 0
      },
      memory: this.getMemoryUsage()
    };
  }

  // Get slow queries (> 1000ms)
  private static getSlowQueries() {
    const slowQueries: any[] = [];
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith('query:')) {
        const slow = metrics.filter(m => m.duration > 1000);
        if (slow.length > 0) {
          slowQueries.push({
            query: key.replace('query:', ''),
            count: slow.length,
            avgDuration: slow.reduce((sum, m) => sum + m.duration, 0) / slow.length
          });
        }
      }
    }

    return slowQueries.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  // Get slow endpoints (> 2000ms)
  private static getSlowEndpoints() {
    const slowEndpoints: any[] = [];
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith('endpoint:')) {
        const slow = metrics.filter(m => m.duration > 2000);
        if (slow.length > 0) {
          slowEndpoints.push({
            endpoint: key.replace('endpoint:', ''),
            count: slow.length,
            avgDuration: slow.reduce((sum, m) => sum + m.duration, 0) / slow.length
          });
        }
      }
    }

    return slowEndpoints.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  // Get memory usage (Node.js specific)
  private static getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100 // MB
      };
    }
    return null;
  }

  // Clear old metrics
  static clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - olderThanMs;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
  }

  // Export metrics for external monitoring
  static exportMetrics() {
    const exported: Record<string, any> = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      exported[key] = {
        stats: this.calculateStats(metrics),
        recentSamples: metrics.slice(-5)
      };
    }

    return {
      timestamp: Date.now(),
      system: this.getSystemOverview(),
      metrics: exported
    };
  }
}

// Middleware to track endpoint performance
export function withPerformanceTracking(
  handler: (request: Request, ...args: any[]) => Promise<Response>
) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const start = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    
    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - start;
      
      PerformanceMonitor.trackEndpoint(
        endpoint,
        request.method,
        duration,
        response.status
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      PerformanceMonitor.trackEndpoint(
        endpoint,
        request.method,
        duration,
        500
      );
      
      throw error;
    }
  };
}

// Database query wrapper with performance tracking
export async function withQueryTracking<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    // Try to get record count if result is an array
    const recordCount = Array.isArray(result) ? result.length : undefined;
    
    PerformanceMonitor.trackQuery(queryName, duration, recordCount);
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    PerformanceMonitor.trackQuery(queryName, duration);
    throw error;
  }
}