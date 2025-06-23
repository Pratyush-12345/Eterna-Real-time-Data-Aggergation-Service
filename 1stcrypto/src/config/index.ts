import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '30'), // seconds
    prefix: 'meme-coin:',
  },
  api: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },
  },
  providers: {
    dexscreener: {
      baseUrl: 'https://api.dexscreener.com/latest/dex',
      rateLimit: 300, // requests per minute
    },
    jupiter: {
      baseUrl: 'https://api.jup.ag',
      rateLimit: 600,
    },
    geckoterminal: {
      baseUrl: 'https://api.geckoterminal.com/api/v2',
      rateLimit: 300,
    },
  },
  scheduler: {
    fetchInterval: process.env.FETCH_INTERVAL || '*/30 * * * * *', // every 30 seconds
  },
};