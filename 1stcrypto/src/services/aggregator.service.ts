import { DexScreenerProvider } from './providers/dexscreener.provider';
import { JupiterProvider } from './providers/jupiter.provider';
import { GeckoTerminalProvider } from './providers/geckoterminal.provider';
import { CacheService } from './cache.service';
import { Token, TokenFilter, PaginatedResponse } from '../types/token.types';
import logger from '../utils/logger';

export class AggregatorService {
  private providers: Array<DexScreenerProvider | JupiterProvider | GeckoTerminalProvider>;
  private cache: CacheService;

  constructor() {
    this.providers = [
      new DexScreenerProvider(),
      new JupiterProvider(),
      new GeckoTerminalProvider(),
    ];
    this.cache = new CacheService();
  }

  async aggregateTokens(limit: number = 50): Promise<Token[]> {
    const cacheKey = this.cache.generateCacheKey('aggregated', 'tokens', { limit });
    
    // Try to get from cache first
    const cached = await this.cache.getTokens(cacheKey);
    if (cached) {
      logger.info('Returning cached aggregated tokens');
      return cached;
    }

    // Fetch from all providers concurrently
    const providerPromises = this.providers.map(async (provider) => {
      try {
        const result = await provider.fetchTokens(limit);
        return result.success ? result.tokens : [];
      } catch (error) {
        logger.error(`Provider ${provider.getName()} failed:`, error);
        return [];
      }
    });

    const providerResults = await Promise.all(providerPromises);
    const allTokens = providerResults.flat();

    // Merge duplicate tokens (same address)
    const mergedTokens = this.mergeTokens(allTokens);

    // Sort by volume (default)
    const sortedTokens = mergedTokens
      .sort((a, b) => b.volume_sol - a.volume_sol)
      .slice(0, limit);

    // Cache the results
    await this.cache.setTokens(cacheKey, sortedTokens);

    logger.info(`Aggregated ${sortedTokens.length} tokens from ${this.providers.length} providers`);
    return sortedTokens;
  }

  async getFilteredTokens(filter: TokenFilter): Promise<PaginatedResponse<Token>> {
    const cacheKey = this.cache.generateCacheKey('filtered', 'tokens', filter);
    
    // Try cache first
    const cached = await this.cache.getPaginatedTokens(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all tokens
    const allTokens = await this.aggregateTokens(1000); // Get more for filtering

    // Apply filters
    let filteredTokens = this.applyFilters(allTokens, filter);

    // Apply sorting
    filteredTokens = this.applySorting(filteredTokens, filter);

    // Apply pagination
    const paginatedResult = this.applyPagination(filteredTokens, filter);

    // Cache the result
    await this.cache.setPaginatedTokens(cacheKey, paginatedResult);

    return paginatedResult;
  }

  async searchTokens(query: string, limit: number = 20): Promise<Token[]> {
    const cacheKey = this.cache.generateCacheKey('search', 'tokens', { query, limit });
    
    // Try cache first
    const cached = await this.cache.getTokens(cacheKey);
    if (cached) {
      return cached;
    }

    // Search across all providers
    const searchPromises = this.providers.map(async (provider) => {
      try {
        const result = await provider.searchTokens(query);
        return result.success ? result.tokens : [];
      } catch (error) {
        logger.error(`Search failed for provider ${provider.getName()}:`, error);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const allTokens = searchResults.flat();

    // Merge and deduplicate
    const mergedTokens = this.mergeTokens(allTokens);
    
    // Sort by relevance (name/ticker match first, then by volume)
    const sortedTokens = mergedTokens
      .sort((a, b) => {
        const aNameMatch = a.token_name.toLowerCase().includes(query.toLowerCase());
        const bNameMatch = b.token_name.toLowerCase().includes(query.toLowerCase());
        const aTickerMatch = a.token_ticker.toLowerCase().includes(query.toLowerCase());
        const bTickerMatch = b.token_ticker.toLowerCase().includes(query.toLowerCase());

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        if (aTickerMatch && !bTickerMatch) return -1;
        if (!aTickerMatch && bTickerMatch) return 1;
        
        return b.volume_sol - a.volume_sol;
      })
      .slice(0, limit);

    // Cache the results
    await this.cache.setTokens(cacheKey, sortedTokens, 60); // Cache search for 1 minute

    return sortedTokens;
  }

  private mergeTokens(tokens: Token[]): Token[] {
    const tokenMap = new Map<string, Token>();

    for (const token of tokens) {
      const existing = tokenMap.get(token.token_address);
      
      if (!existing) {
        tokenMap.set(token.token_address, token);
      } else {
        // Merge data from multiple sources - take the most recent and complete data
        const merged: Token = {
          ...existing,
          // Use non-zero values preferentially
          price_sol: token.price_sol || existing.price_sol,
          market_cap_sol: Math.max(token.market_cap_sol, existing.market_cap_sol),
          volume_sol: Math.max(token.volume_sol, existing.volume_sol),
          liquidity_sol: Math.max(token.liquidity_sol, existing.liquidity_sol),
          transaction_count: Math.max(token.transaction_count, existing.transaction_count),
          price_1hr_change: token.price_1hr_change || existing.price_1hr_change,
          price_24hr_change: token.price_24hr_change || existing.price_24hr_change,
          price_7d_change: token.price_7d_change || existing.price_7d_change,
          last_updated: new Date(),
          source: `${existing.source},${token.source}`,
        };
        tokenMap.set(token.token_address, merged);
      }
    }

    return Array.from(tokenMap.values());
  }

  private applyFilters(tokens: Token[], filter: TokenFilter): Token[] {
    let filtered = tokens;

    if (filter.min_volume) {
      filtered = filtered.filter(token => token.volume_sol >= filter.min_volume!);
    }

    if (filter.min_market_cap) {
      filtered = filtered.filter(token => token.market_cap_sol >= filter.min_market_cap!);
    }

    // Time period filtering would require historical data
    // For now, we'll just return the filtered tokens

    return filtered;
  }

  private applySorting(tokens: Token[], filter: TokenFilter): Token[] {
    const sortBy = filter.sort_by || 'volume';
    const sortOrder = filter.sort_order || 'desc';

    const sorted = tokens.sort((a, b) => {
      let valueA: number, valueB: number;

      switch (sortBy) {
        case 'volume':
          valueA = a.volume_sol;
          valueB = b.volume_sol;
          break;
        case 'price_change':
          valueA = a.price_1hr_change;
          valueB = b.price_1hr_change;
          break;
        case 'market_cap':
          valueA = a.market_cap_sol;
          valueB = b.market_cap_sol;
          break;
        case 'liquidity':
          valueA = a.liquidity_sol;
          valueB = b.liquidity_sol;
          break;
        default:
          valueA = a.volume_sol;
          valueB = b.volume_sol;
      }

      if (sortOrder === 'asc') {
        return valueA - valueB;
      }
      return valueB - valueA;
    });

    return sorted;
  }

  private applyPagination(tokens: Token[], filter: TokenFilter): PaginatedResponse<Token> {
    const limit = filter.limit || 20;
    const cursor = filter.cursor;

    let startIndex = 0;
    if (cursor) {
      // Decode cursor to get start index
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        startIndex = decodedCursor.offset || 0;
      } catch (error) {
        logger.warn('Invalid cursor provided, starting from beginning');
      }
    }

    const endIndex = startIndex + limit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);

    let nextCursor: string | undefined;
    if (endIndex < tokens.length) {
      nextCursor = Buffer.from(JSON.stringify({ offset: endIndex })).toString('base64');
    }

    return {
      data: paginatedTokens,
      pagination: {
        limit,
        next_cursor: nextCursor,
        total: tokens.length,
      },
    };
  }

  async invalidateCache(): Promise<void> {
    await this.cache.invalidatePattern('*');
    logger.info('All cache invalidated');
  }
}