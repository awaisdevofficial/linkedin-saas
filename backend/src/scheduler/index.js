import cron from 'node-cron';
import { runGenerateJob } from '../jobs/generate.job.js';
import { runPublishJob } from '../jobs/publish.job.js';
import { runEngageJob } from '../jobs/engage.job.js';
import { runReplyJob } from '../jobs/reply.job.js';
import { runHealthJob } from '../jobs/health.job.js';
import { runResetJob } from '../jobs/reset.job.js';
import { logger } from '../utils/logger.js';

export function startScheduler() {
  logger.automation('scheduler_registering', { jobs: ['generate', 'publish', 'engage', 'reply', 'health', 'reset'] });

  // Generate: every hour
  cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'generate', schedule: '0 * * * *', timestamp });
    try {
      const result = await runGenerateJob();
      logger.automation('cron_completed', { job: 'generate', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'generate', error: e.message, timestamp });
    }
  });

  // Publish: every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'publish', schedule: '*/5 * * * *', timestamp });
    try {
      const result = await runPublishJob();
      logger.automation('cron_completed', { job: 'publish', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'publish', error: e.message, timestamp });
    }
  });

  // Engage: every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'engage', schedule: '0 */2 * * *', timestamp });
    try {
      const result = await runEngageJob();
      logger.automation('cron_completed', { job: 'engage', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'engage', error: e.message, timestamp });
    }
  });

  // Reply: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'reply', schedule: '*/15 * * * *', timestamp });
    try {
      const result = await runReplyJob();
      logger.automation('cron_completed', { job: 'reply', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'reply', error: e.message, timestamp });
    }
  });

  // Health: daily at 8am
  cron.schedule('0 8 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'health', schedule: '0 8 * * *', timestamp });
    try {
      const result = await runHealthJob();
      logger.automation('cron_completed', { job: 'health', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'health', error: e.message, timestamp });
    }
  });

  // Reset: weekly Sunday midnight
  cron.schedule('0 0 * * 0', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'reset', schedule: '0 0 * * 0', timestamp });
    try {
      const result = await runResetJob();
      logger.automation('cron_completed', { job: 'reset', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'reset', error: e.message, timestamp });
    }
  });

  logger.automation('scheduler_registered', { message: 'All cron jobs active' });
}
