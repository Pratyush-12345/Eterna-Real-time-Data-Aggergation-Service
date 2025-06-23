import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import tokensRoutes from './routes/tokens.routes';
import { errorHandler } from './middleware/errorHandler';
import { WebSocketService } from './services/websocket.service';
import { SchedulerService } from './services/scheduler.service';
import logger from './utils/logger';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/tokens', tokensRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling
app.use(errorHandler);

// Services
const websocketService = new WebSocketService(server);
const schedulerService = new SchedulerService();

// Only start server if run directly
if (require.main === module) {
  const PORT = config.port;

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);

    // Start background services
    websocketService.startRealTimeUpdates();
    schedulerService.start();

    logger.info('All services started successfully');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    await websocketService.stopRealTimeUpdates();
    schedulerService.stop();

    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Export app for testing
export { app };
