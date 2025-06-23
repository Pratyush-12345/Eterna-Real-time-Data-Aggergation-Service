import { BaseProvider } from './base.provider';
import { Token, ProviderResponse } from '../../types/token.types';
import { config } from '../../config';
import logger from '../../utils/logger';

interface JupiterPriceData {
  id: string;
  type: string;
  price: string;
  extraInfo?: {
    lastSwappedPrice?: {
      lastJupiterSellAt: number;
      lastJupiterSellPrice: string;
      lastJupiterBuyAt: number;
      lastJupiterBuyPrice: string;
    };
    quotedPrice?: {
      buyPrice: string;
      buyAt: number;
      sellPrice: string;
      sellAt: number;
    };
    confidenceLevel?: string;
  };
}

interface JupiterApiResponse {
  data: { [key: string]: JupiterPriceData | null };
  timeTaken: number;
}

export class JupiterProvider extends BaseProvider {
  private popularTokens = [
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    'So11111111111111111111111111111111111111112', // SOL
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
    'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
    'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL
  ];

  constructor() {
    // Updated to use the correct Jupiter Price API V2 base URL
    super(config.providers.jupiter.baseUrl, config.providers.jupiter.rateLimit); // 600 requests/min rate limit as per docs
  }

  getName(): string {
    return 'Jupiter';
  }

  async fetchTokens(limit: number = 50): Promise<ProviderResponse> {
    try {
      const tokenIds = this.popularTokens.slice(0, Math.min(limit, this.popularTokens.length));

      // Updated endpoint to use Price API V2
      const response = await this.makeRequest<JupiterApiResponse>({
        url: '/price/v2',
        params: {
          ids: tokenIds.join(','),
          showExtraInfo: 'true', // Get additional info for better data
        },
        timeout: 15000, // Increased timeout
      });

      // Filter out null responses and transform valid tokens
      const tokens = Object.values(response.data)
        .filter((tokenData): tokenData is JupiterPriceData => tokenData !== null)
        .map(this.transformToken);

      logger.info(`Jupiter: Fetched ${tokens.length} tokens`);

      return {
        tokens,
        success: true,
      };
    } catch (error) {
      logger.error('Jupiter fetch error:', error);
      return {
        tokens: [],
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async searchTokens(query: string): Promise<ProviderResponse> {
    // Jupiter Price API doesn't support search, return empty
    return {
      tokens: [],
      success: true,
    };
  }

  private transformToken = (jupiterData: JupiterPriceData): Token => {
    const price = parseFloat(jupiterData.price);
    
    // Calculate price changes if extraInfo is available
    let price24hrChange = 0;
    if (jupiterData.extraInfo?.lastSwappedPrice) {
      const currentPrice = jupiterData.extraInfo.quotedPrice?.buyPrice || jupiterData.price;
      const lastPrice = jupiterData.extraInfo.lastSwappedPrice.lastJupiterBuyPrice;
      if (currentPrice && lastPrice) {
        price24hrChange = ((parseFloat(currentPrice) - parseFloat(lastPrice)) / parseFloat(lastPrice)) * 100;
      }
    }

    // Get token symbol from popular tokens mapping
    const tokenSymbol = this.getTokenSymbol(jupiterData.id);

    return {
      token_address: jupiterData.id,
      token_name: tokenSymbol,
      token_ticker: tokenSymbol,
      price_sol: price,
      market_cap_sol: 0, // Jupiter doesn't provide market cap
      volume_sol: 0, // Jupiter doesn't provide volume
      liquidity_sol: 0, // Jupiter doesn't provide liquidity directly
      transaction_count: 0, // Jupiter doesn't provide transaction count
      price_1hr_change: 0, // Jupiter doesn't provide 1hr change
      price_24hr_change: price24hrChange,
      protocol: 'Jupiter',
      last_updated: new Date(),
      source: 'jupiter',
    };
  };

  private getTokenSymbol(address: string): string {
    const tokenMap: { [key: string]: string } = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'So11111111111111111111111111111111111111112': 'SOL',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'JitoSOL',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'bSOL',
    };
    
    return tokenMap[address] || address.slice(0, 8);
  }
}


