import cron from 'node-cron';
import { AggregatorService } from './aggregator.service';
import { config } from '../config';
import logger from '../utils/logger';

export class SchedulerService {
  private aggregator: AggregatorService;
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.aggregator = new AggregatorService();
  }

  start(): void {
    // Schedule regular data fetching
    const fetchTask = cron.schedule(config.scheduler.fetchInterval, async () => {
      logger.info('Scheduled token fetch started');
      try {
        await this.aggregator.aggregateTokens();
        logger.info('Scheduled token fetch completed');
      } catch (error) {
        logger.error('Scheduled token fetch failed:', error);
      }
    }, {
      scheduled: false
    });

    // Schedule cache cleanup (every hour)
    const cleanupTask = cron.schedule('0 * * * *', async () => {
      logger.info('Cache cleanup started');
      try {
        // Implement cache cleanup logic here if needed
        logger.info('Cache cleanup completed');
      } catch (error) {
        logger.error('Cache cleanup failed:', error);
      }
    }, {
      scheduled: false
    });

    this.tasks.set('fetch', fetchTask);
    this.tasks.set('cleanup', cleanupTask);

    // Start all tasks
    this.tasks.forEach((task, name) => {
      task.start();
      logger.info(`Scheduled task '${name}' started`);
    });
  }

  stop(): void {
    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`Scheduled task '${name}' stopped`);
    });
  }

  restart(): void {
    this.stop();
    this.start();
  }
}
