import { Request, Response } from 'express';
import { AggregatorService } from '../services/aggregator.service';
import { TokenFilter } from '../types/token.types';
import logger from '../utils/logger';

export class TokensController {
  private aggregator: AggregatorService;

  constructor() {
    this.aggregator = new AggregatorService();
  }

  async getTokens(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tokens = await this.aggregator.aggregateTokens(limit);

      res.json({
        success: true,
        data: tokens,
        count: tokens.length,
      });
    } catch (error) {
      logger.error('Get tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tokens',
      });
    }
  }

  async getFilteredTokens(req: Request, res: Response): Promise<void> {
    try {
      const filter: TokenFilter = {
        time_period: req.query.time_period as '1h' | '24h' | '7d',
        sort_by: req.query.sort_by as 'volume' | 'price_change' | 'market_cap' | 'liquidity',
        sort_order: req.query.sort_order as 'asc' | 'desc',
        min_volume: req.query.min_volume ? parseFloat(req.query.min_volume as string) : undefined,
        min_market_cap: req.query.min_market_cap ? parseFloat(req.query.min_market_cap as string) : undefined,
        limit: parseInt(req.query.limit as string) || 20,
        cursor: req.query.cursor as string,
      };

      const result = await this.aggregator.getFilteredTokens(filter);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Get filtered tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch filtered tokens',
      });
    }
  }

  async searchTokens(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query parameter is required',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const tokens = await this.aggregator.searchTokens(query, limit);

      res.json({
        success: true,
        data: tokens,
        count: tokens.length,
      });
    } catch (error) {
      logger.error('Search tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search tokens',
      });
    }
  }

  async invalidateCache(req: Request, res: Response): Promise<void> {
    try {
      await this.aggregator.invalidateCache();
      res.json({
        success: true,
        message: 'Cache invalidated successfully',
      });
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache',
      });
    }
  }
}