import Redis from 'ioredis';
import redisClient from '../config/redis';
import { config } from '../config';
import { Token, PaginatedResponse } from '../types/token.types';
import logger from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private prefix: string;
  private defaultTtl: number;

  constructor() {
    this.redis = redisClient.getClient();
    this.prefix = config.cache.prefix;
    this.defaultTtl = config.cache.ttl;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTtl;
      await this.redis.setex(this.getKey(key), expiration, serialized);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async getTokens(cacheKey: string): Promise<Token[] | null> {
    return this.get<Token[]>(cacheKey);
  }

  async setTokens(cacheKey: string, tokens: Token[], ttl?: number): Promise<void> {
    await this.set(cacheKey, tokens, ttl);
  }

  async getPaginatedTokens(cacheKey: string): Promise<PaginatedResponse<Token> | null> {
    return this.get<PaginatedResponse<Token>>(cacheKey);
  }

  async setPaginatedTokens(
    cacheKey: string, 
    response: PaginatedResponse<Token>, 
    ttl?: number
  ): Promise<void> {
    await this.set(cacheKey, response, ttl);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
    }
  }

  generateCacheKey(
    provider: string,
    operation: string,
    params?: Record<string, any>
  ): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${provider}:${operation}:${Buffer.from(paramString).toString('base64')}`;
  }
}
