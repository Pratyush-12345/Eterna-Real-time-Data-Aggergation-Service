import logger from './logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxRetries) {
        logger.error(`Max retries (${options.maxRetries}) exceeded`, { error: lastError.message });
        throw lastError;
      }

      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error: lastError.message });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffFactor, options.maxDelay);
    }
  }

  throw lastError!;
}