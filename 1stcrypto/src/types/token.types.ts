export interface Token {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  transaction_count: number;
  price_1hr_change: number;
  price_24hr_change?: number;
  price_7d_change?: number;
  protocol: string;
  last_updated: Date;
  source: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    next_cursor?: string;
    total?: number;
  };
}

export interface TokenFilter {
  time_period?: '1h' | '24h' | '7d';
  sort_by?: 'volume' | 'price_change' | 'market_cap' | 'liquidity';
  sort_order?: 'asc' | 'desc';
  min_volume?: number;
  min_market_cap?: number;
  limit?: number;
  cursor?: string;
}

export interface ProviderResponse {
  tokens: Token[];
  success: boolean;
  error?: string;
}

export interface WebSocketMessage {
  type: 'price_update' | 'volume_spike' | 'new_token';
  data: Token | Token[];
  timestamp: Date;
}