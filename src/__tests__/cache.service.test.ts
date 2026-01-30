import { CacheService } from '../services/cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = CacheService.getInstance();
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const data = { name: 'test', value: 123 };
      cache.set('test-key', data);

      const retrieved = cache.get<typeof data>('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should store different types of data', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('object', { key: 'value' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('object')).toEqual({ key: 'value' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire data after TTL', async () => {
      const shortTTL = 100; // 100ms
      cache.set('expiring-key', 'will expire', shortTTL);

      // Should exist immediately
      expect(cache.get('expiring-key')).toBe('will expire');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be null after expiration
      expect(cache.get('expiring-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cache.set('default-ttl', 'data');
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it('should not expire before TTL', async () => {
      const longTTL = 5000; // 5 seconds
      cache.set('long-lived', 'data', longTTL);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get('long-lived')).toBe('data');
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('existing', 'data');
      expect(cache.has('existing')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cache.set('expiring', 'data', 50);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.has('expiring')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('to-delete', 'data');
      expect(cache.has('to-delete')).toBe(true);

      const deleted = cache.delete('to-delete');
      expect(deleted).toBe(true);
      expect(cache.has('to-delete')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('generateKey', () => {
    it('should generate key without suffix', () => {
      const key = CacheService.generateKey('owner', 'repo');
      expect(key).toBe('owner/repo');
    });

    it('should generate key with suffix', () => {
      const key = CacheService.generateKey('owner', 'repo', 'prs-open');
      expect(key).toBe('owner/repo:prs-open');
    });
  });
});
