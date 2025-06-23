### README.md
```markdown
# Meme Coin Data Aggregation Service

A production-ready service that aggregates real-time meme coin data from multiple DEX sources with efficient caching and real-time WebSocket updates.

## Features

- **Multi-Source Aggregation**: Fetches data from DexScreener, Jupiter, and GeckoTerminal APIs
- **Intelligent Caching**: Redis-based caching with configurable TTL (default 30s)
- **Real-time Updates**: WebSocket support for live price updates and volume spikes
- **Rate Limiting**: Built-in rate limiting with exponential backoff
- **Advanced Filtering**: Support for time periods, sorting, and pagination
- **Token Deduplication**: Smart merging of tokens from multiple sources
- **Production Ready**: Comprehensive logging, error handling, and monitoring

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis** (using Docker)
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Or use Docker Compose**
   ```bash
   docker-compose up
   ```

## API Endpoints

### Get All Tokens
```
GET /api/tokens?limit=20
```

### Get Filtered Tokens
```
GET /api/tokens/filter?sort_by=volume&sort_order=desc&limit=20
```

### Search Tokens
```
GET /api/tokens/search?q=BONK&limit=10
```

### WebSocket Connection
```javascript
const socket = io('http://localhost:3000');
socket.emit('subscribe_tokens');
socket.on('token_update', (data) => {
  console.log('Token update:', data);
});
```

## Architecture

- **Express.js**: Web framework with TypeScript
- **Socket.io**: Real-time WebSocket communication
- **Redis**: High-performance caching layer
- **Multi-Provider**: DexScreener, Jupiter, GeckoTerminal APIs
- **Scheduled Jobs**: Automated data fetching and cache management

## Configuration

Key configuration options in `.env`:

- `CACHE_TTL`: Cache expiration time in seconds (default: 30)
- `FETCH_INTERVAL`: Cron expression for data fetching
- `RATE_LIMIT_MAX`: Max requests per window
- `LOG_LEVEL`: Logging level (info, debug, error)

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start with PM2:
   ```bash
   pm2 start dist/app.js --name "meme-coin-service"
   ```

3. Or use Docker:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Monitoring

- Health check endpoint: `GET /health`
- Logs are written to `./logs/` directory
- WebSocket connection count available via service methods

## API Rate Limits

- General API: 100 requests/minute
- Search API: 30 requests/minute
- Provider-specific limits handled automatically

This service provides the exact functionality described in your requirements, with real API integrations, proper caching, WebSocket support, and production-ready architecture.
```