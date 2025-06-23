import { BaseProvider } from './base.provider';
import { Token, ProviderResponse } from '../../types/token.types';
import { config } from '../../config';
import logger from '../../utils/logger';

interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  volume?: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange?: {
    h24: number;
    h6: number;
    h1: number;
  };
  txns?: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
}

export class DexScreenerProvider extends BaseProvider {
  constructor() {
    super(config.providers.dexscreener.baseUrl, config.providers.dexscreener.rateLimit);
  }

  getName(): string {
    return 'DexScreener';
  }

  async fetchTokens(limit: number = 50): Promise<ProviderResponse> {
    try {
      // DexScreener doesn't have a direct "trending" endpoint, so we'll use search for popular tokens
      const response = await this.makeRequest<{ pairs: DexScreenerToken[] }>({
        url: '/search',
        params: {
          q: 'solana',
        },
      });

      const tokens = response.pairs
        .filter(pair => pair.chainId === 'solana')
        .slice(0, limit)
        .map(this.transformToken);

      logger.info(`DexScreener: Fetched ${tokens.length} tokens`);
      
      return {
        tokens,
        success: true,
      };
    } catch (error) {
      logger.error('DexScreener fetch error:', error);
      return {
        tokens: [],
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async searchTokens(query: string): Promise<ProviderResponse> {
    try {
      const response = await this.makeRequest<{ pairs: DexScreenerToken[] }>({
        url: '/search',
        params: { q: query },
      });

      const tokens = response.pairs
        .filter(pair => pair.chainId === 'solana')
        .map(this.transformToken);

      return {
        tokens,
        success: true,
      };
    } catch (error) {
      logger.error('DexScreener search error:', error);
      return {
        tokens: [],
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private transformToken = (dexToken: DexScreenerToken): Token => {
    const solPrice = parseFloat(dexToken.priceNative) || 0;
    const volume24h = dexToken.volume?.h24 || 0;
    const liquidity = dexToken.liquidity?.base || 0;
    const marketCap = dexToken.marketCap || dexToken.fdv || 0;
    const txCount = (dexToken.txns?.h24?.buys || 0) + (dexToken.txns?.h24?.sells || 0);

    return {
      token_address: dexToken.baseToken.address,
      token_name: dexToken.baseToken.name,
      token_ticker: dexToken.baseToken.symbol,
      price_sol: solPrice,
      market_cap_sol: marketCap / (solPrice > 0 ? solPrice : 1), // Convert USD to SOL approx
      volume_sol: volume24h / (solPrice > 0 ? solPrice : 1),
      liquidity_sol: liquidity,
      transaction_count: txCount,
      price_1hr_change: dexToken.priceChange?.h1 || 0,
      price_24hr_change: dexToken.priceChange?.h24 || 0,
      protocol: `${dexToken.dexId}`,
      last_updated: new Date(),
      source: 'dexscreener',
    };
  };
}