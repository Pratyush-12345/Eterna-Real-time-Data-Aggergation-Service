import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Token, ProviderResponse } from '../../types/token.types';
import { withRetry, RetryOptions } from '../../utils/retry';
import logger from '../../utils/logger';

export abstract class BaseProvider {
  protected client: AxiosInstance;
  protected rateLimit: number;
  protected lastRequestTime: number = 0;
  protected retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  constructor(baseURL: string, rateLimit: number) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'Memecoin-Aggregator/1.0',
      },
    });
    this.rateLimit = rateLimit;
  }

  protected async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    await this.enforceRateLimit();
    
    return withRetry(async () => {
      const response = await this.client.request<T>(config);
      return response.data;
    }, this.retryOptions);
  }

  private async enforceRateLimit(): Promise<void> {
    const minInterval = (60 * 1000) / this.rateLimit; // milliseconds between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  abstract fetchTokens(limit?: number): Promise<ProviderResponse>;
  abstract searchTokens(query: string): Promise<ProviderResponse>;
  abstract getName(): string;
}