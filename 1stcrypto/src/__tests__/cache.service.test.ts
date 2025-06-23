// cache.service.test.ts
import { CacheService } from '../services/cache.service';

describe('CacheService', () => {
  const cache = new CacheService();

  it('should set and get cache correctly', async () => {
    await cache.set('test-key', { foo: 'bar' });
    const result = await cache.get('test-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return null for missing key', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should overwrite cache value', async () => {
    await cache.set('overwrite-key', { foo: 'bar' });
    await cache.set('overwrite-key', { foo: 'baz' });
    const result = await cache.get('overwrite-key');
    expect(result).toEqual({ foo: 'baz' });
  });
});