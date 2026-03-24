import cron from 'node-cron';
import { runGenerateJob } from '../jobs/generate.job.js';
import { runPublishJob } from '../jobs/publish.job.js';
import { runWebhookLikeCommentJob } from '../jobs/webhook-like-comment.job.js';
import { runWebhookReplyCommentsJob } from '../jobs/webhook-reply-comments.job.js';
import { runScheduleApprovedDailyJob } from '../jobs/schedule-approved-daily.job.js';
import { runHealthJob } from '../jobs/health.job.js';
import { runResetJob } from '../jobs/reset.job.js';
import { runAccessExpiryJob } from '../jobs/access-expiry.job.js';
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
  const jobList = ['generate', 'publish', 'webhook_like_comment', 'webhook_reply_comments', 'schedule_approved_daily', 'health', 'reset'];
  logger.automation('scheduler_registering', { jobs: jobList, timezone: 'UTC' });

  // Generate: new posts from RSS (auto) or custom prompt; optional auto image/video. Every 12 hours (UTC: 00:00 and 12:00).
  cron.schedule('0 0,12 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'generate', schedule: '0 0,12 * * *', timestamp });
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

  // Webhook Like&Comment: send user data to auto.nsolbpo.com at each user's interval (minimum 1 hr). Every 5 min (UTC).
  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'webhook_like_comment', schedule: '*/5 * * * *', timestamp });
    try {
      const result = await runWithGuard('webhook_like_comment', () => runWebhookLikeCommentJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'webhook_like_comment', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'webhook_like_comment', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Webhook Reply-to-Comments: send user data to reply-to-comments webhook at each user's reply_interval_minutes. Every 5 min (UTC).
  cron.schedule('*/5 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'webhook_reply_comments', schedule: '*/5 * * * *', timestamp });
    try {
      const result = await runWithGuard('webhook_reply_comments', () => runWebhookReplyCommentsJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'webhook_reply_comments', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'webhook_reply_comments', error: e.message, timestamp });
    }
  }, TZ_UTC);

  // Schedule approved: pick 1 random approved post per user per day, generate image/video if needed, set ready_to_post + scheduled_at. Daily at 06:00 UTC.
  cron.schedule('0 6 * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'schedule_approved_daily', schedule: '0 6 * * *', timestamp });
    try {
      const result = await runWithGuard('schedule_approved_daily', () => runScheduleApprovedDailyJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'schedule_approved_daily', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'schedule_approved_daily', error: e.message, timestamp });
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

  // Access expiry: set status='expired' for approved users where access_expires_at < NOW(). Every hour (UTC).
  cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    logger.automation('cron_triggered', { job: 'access_expiry', schedule: '0 * * * *', timestamp });
    try {
      const result = await runWithGuard('access_expiry', () => runAccessExpiryJob());
      if (result !== undefined) logger.automation('cron_completed', { job: 'access_expiry', result, timestamp });
    } catch (e) {
      logger.automation('cron_failed', { job: 'access_expiry', error: e.message, timestamp });
    }
  }, TZ_UTC);

  logger.automation('scheduler_registered', { message: 'All cron jobs active', timezone: 'UTC' });
}
