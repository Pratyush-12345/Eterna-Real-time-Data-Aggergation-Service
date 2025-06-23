import { BaseProvider } from './base.provider';
import { Token, ProviderResponse } from '../../types/token.types';
import { config } from '../../config';
import logger from '../../utils/logger';

interface GeckoTerminalPool {
  attributes: {
    dex_name: string;
    reserve_in_usd: string;
    volume_usd: {
      h24: string;
    };
    token0: {
      address: string;
      name: string;
      symbol: string;
      price_usd: string;
      price_change_percentage?: {
        h1: string;
        h24: string;
      };
    };
  };
}

export class GeckoTerminalProvider extends BaseProvider {
  constructor() {
    super(config.providers.geckoterminal.baseUrl, config.providers.geckoterminal.rateLimit);
  }

  getName(): string {
    return 'GeckoTerminal';
  }

  async fetchTokens(limit: number = 50): Promise<ProviderResponse> {
    try {
      const response = await this.makeRequest<{ data: GeckoTerminalPool[] }>({
        url: '/networks/solana/tokens',
        params: {
          page: 1,
          limit: Math.min(limit, 100),
        },
        headers: {
          accept: 'application/json',
        },
      });

      const tokens: Token[] = [];

      for (const pool of response.data) {
        const attr = pool.attributes;
        const tokenData = attr.token0;

        if (!tokenData || !tokenData.price_usd) continue;

        const priceUsd = parseFloat(tokenData.price_usd);
        const solPrice = 130; // TODO: Fetch live price later if needed
        const priceSol = priceUsd / solPrice;

        const token: Token = {
          token_address: tokenData.address,
          token_name: tokenData.name,
          token_ticker: tokenData.symbol,
          price_sol: priceSol,
          market_cap_sol: 0, // not available from API
          volume_sol: parseFloat(attr.volume_usd.h24 || '0') / (priceSol || 1),
          liquidity_sol: parseFloat(attr.reserve_in_usd || '0') / (priceSol || 1),
          transaction_count: 0,
          price_1hr_change: parseFloat(tokenData.price_change_percentage?.h1 || '0'),
          price_24hr_change: parseFloat(tokenData.price_change_percentage?.h24 || '0'),
          protocol: attr.dex_name || 'geckoterminal',
          last_updated: new Date(),
          source: 'geckoterminal',
        };

        tokens.push(token);
      }

      logger.info(`GeckoTerminal: Fetched ${tokens.length} tokens from pools`);
      return {
        tokens,
        success: true,
      };
    } catch (error: any) {
      logger.error('GeckoTerminal fetch error', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        tokens: [],
        success: false,
        error: error.message,
      };
    }
  }

  async searchTokens(_query: string): Promise<ProviderResponse> {
    return {
      tokens: [],
      success: false,
      error: 'Search not implemented for GeckoTerminal',
    };
  }
}
