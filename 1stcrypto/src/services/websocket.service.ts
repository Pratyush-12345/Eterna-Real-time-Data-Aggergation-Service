import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { Token, WebSocketMessage } from '../types/token.types';
import { AggregatorService } from './aggregator.service';
import logger from '../utils/logger';

export class WebSocketService {
  private io: SocketIOServer;
  private aggregator: AggregatorService;
  private lastTokenData: Map<string, Token> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.aggregator = new AggregatorService();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('subscribe_tokens', () => {
        socket.join('token_updates');
        logger.info(`Client ${socket.id} subscribed to token updates`);
      });

      socket.on('unsubscribe_tokens', () => {
        socket.leave('token_updates');
        logger.info(`Client ${socket.id} unsubscribed from token updates`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async startRealTimeUpdates(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.checkAndBroadcastUpdates();
    }, 30000);

    logger.info('Real-time updates started');
  }

  async stopRealTimeUpdates(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info('Real-time updates stopped');
  }

  private async checkAndBroadcastUpdates(): Promise<void> {
    try {
      const currentTokens = await this.aggregator.aggregateTokens(100);
      
      for (const token of currentTokens) {
        const lastToken = this.lastTokenData.get(token.token_address);
        
        if (!lastToken) {
          // New token detected
          this.broadcastMessage({
            type: 'new_token',
            data: token,
            timestamp: new Date(),
          });
        } else {
          // Check for significant price changes (>5%)
          const priceChangeThreshold = 0.05; // 5%
          const priceDiff = Math.abs(token.price_sol - lastToken.price_sol) / lastToken.price_sol;
          
          if (priceDiff > priceChangeThreshold) {
            this.broadcastMessage({
              type: 'price_update',
              data: token,
              timestamp: new Date(),
            });
          }

          // Check for volume spikes (>50% increase)
          const volumeSpike = token.volume_sol > lastToken.volume_sol * 1.5;
          if (volumeSpike) {
            this.broadcastMessage({
              type: 'volume_spike',
              data: token,
              timestamp: new Date(),
            });
          }
        }

        this.lastTokenData.set(token.token_address, token);
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
    }
  }

  private broadcastMessage(message: WebSocketMessage): void {
    this.io.to('token_updates').emit('token_update', message);
    logger.debug(`Broadcasted ${message.type} for token`, { 
      token: (message.data as Token).token_ticker 
    });
  }

  getConnectedClients(): number {
    return this.io.engine.clientsCount;
  }
}