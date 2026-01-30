import { CacheEntry } from '../types/github.types';

/**
 * In-memory cache service with TTL (Time To Live) support
 * Implements Singleton pattern for global cache state
 */
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<unknown>>;
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  private constructor() {
    this.cache = new Map();
  }

  /**
   * Get singleton instance of CacheService
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Store data in cache with optional TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (defaults to 5 minutes)
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };
    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Retrieve data from cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if a key exists in cache and is not expired
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from cache
   * @param key - Cache key to remove
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache size and entry count
   */
  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate a cache key from repository owner and name
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param suffix - Optional suffix for different cache types
   */
  public static generateKey(owner: string, repo: string, suffix?: string): string {
    const base = `${owner}/${repo}`;
    return suffix ? `${base}:${suffix}` : base;
  }
}
