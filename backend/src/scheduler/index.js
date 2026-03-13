import cron from 'node-cron';
import { runGenerateJob } from '../jobs/generate.job.js';
import { runPublishJob } from '../jobs/publish.job.js';
import { runEngageJob } from '../jobs/engage.job.js';
import { runReplyJob } from '../jobs/reply.job.js';
import { runHealthJob } from '../jobs/health.job.js';
import { runResetJob } from '../jobs/reset.job.js';
import { logger } from '../utils/logger.js';

const TZ_UTC = { timezone: 'UTC' };

/** Run a job with overlap guard: skip if the same job is already running. */
const running = new Set();
async function runWithGuard(name, fn) {
  if (running.has(name)) {
    logger.automation('cron_skipped_overlap', { job: name });
    return;
  }
  running.add(name);
  try {
    return await fn();
  } finally {
    running.delete(name);
  }
}

export function startScheduler() {
  const jobList = ['generate', 'publish', 'engage', 'reply', 'health', 'reset'];
  logger.automation('scheduler_registering', { jobs: jobList, timezone: 'UTC' });

  // Generate: new posts from RSS (auto) or custom prompt; optional auto image/video. Every hour (UTC).
  cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'generate', schedule: '0 * * * *', timestamp });
    try {
      const result = await runWithGuard('generate', () => runGenerateJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'generate', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'generate', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Publish: send ready-to-post items to LinkedIn (one per user), then post suggested comments. Every 5 min (UTC).
  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'publish', schedule: '*/5 * * * *', timestamp });
    try {
      const result = await runWithGuard('publish', () => runPublishJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'publish', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'publish', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Engage: like/comment on feed items (respects active window + daily cap). Every 30 min (UTC).
  cron.schedule('*/30 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'engage', schedule: '*/30 * * * *', timestamp });
    try {
      const result = await runWithGuard('engage', () => runEngageJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'engage', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'engage', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Reply: reply to comments on user's posts (last 7 days, AI-generated replies). Every 15 min (UTC).
  cron.schedule('*/15 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'reply', schedule: '*/15 * * * *', timestamp });
    try {
      const result = await runWithGuard('reply', () => runReplyJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'reply', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'reply', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Health: run health check (LinkedIn tokens, etc.) and store result. Daily at 08:00 UTC.
  cron.schedule('0 8 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'health', schedule: '0 8 * * *', timestamp });
    try {
      const result = await runWithGuard('health', () => runHealthJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'health', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'health', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Reset: weekly maintenance (extend in reset.job.js as needed). Sunday 00:00 UTC.
  cron.schedule('0 0 * * 0', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'reset', schedule: '0 0 * * 0', timestamp });
    try {
      const result = await runWithGuard('reset', () => runResetJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'reset', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'reset', error: e.message, timestamp });
    }
  }, TZ_UTC);

  logger.automation('scheduler_registered', { message: 'All cron jobs active', timezone: 'UTC' });
}
