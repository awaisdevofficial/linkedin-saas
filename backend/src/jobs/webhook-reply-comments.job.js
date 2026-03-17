import axios from 'axios';
import * as supabase from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

const WEBHOOK_URL = process.env.N8N_REPLY_WEBHOOK_URL;

/** Normalize active_days from DB (can be array or JSON string). Returns array of day names. */
function normalizeActiveDays(activeDays) {
  if (activeDays == null) return [];
  if (Array.isArray(activeDays)) return activeDays.filter((d) => d != null && String(d).trim());
  if (typeof activeDays === 'string') {
    try {
      const parsed = JSON.parse(activeDays);
      return Array.isArray(parsed) ? parsed.filter((d) => d != null && String(d).trim()) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Returns true if we should send (no active window restriction, or current time is inside window). */
function isInActiveWindow(settings) {
  const days = normalizeActiveDays(settings?.active_days);
  if (days.length === 0) return true; // no days set = always active, send whenever interval is due
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  if (!days.includes(dayName)) return false;
  const start = String(settings.active_start_time || '08:00').slice(0, 5);
  const end = String(settings.active_end_time || '20:00').slice(0, 5);
  const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  return timeStr >= start && timeStr <= end;
}

/**
 * Returns true if this user is due for a reply webhook send.
 * Uses reply_interval_minutes and reply_webhook_last_sent_at per user.
 */
function isDueForReplyWebhook(user) {
  const lastSent = user.reply_webhook_last_sent_at ? new Date(user.reply_webhook_last_sent_at) : null;
  const intervalMinutes = Number(user.reply_interval_minutes) || 30;
  const intervalMs = intervalMinutes * 60 * 1000;
  if (!lastSent) return true;
  const elapsed = Date.now() - lastSent.getTime();
  return elapsed >= intervalMs;
}

/** Build payload to send to reply-to-comments webhook (same shape as frontend). */
function buildReplyWebhookPayload(user) {
  return {
    user_id: user.user_id,
    person_urn: user.person_urn || null,
    auto_replying: true,
    comment_prompt: user.comment_prompt || null,
    reply_interval_minutes: user.reply_interval_minutes ?? 30,
    active_days: user.active_days || [],
    active_start_time: user.active_start_time || '08:00',
    active_end_time: user.active_end_time || '20:00',
    sent_at: new Date().toISOString(),
  };
}

/**
 * For each user with auto_replying enabled, at their configured reply_interval_minutes,
 * send their data to the reply-to-comments webhook (same as frontend "Run Reply Job Now").
 */
export async function runWebhookReplyCommentsJob() {
  const ts = new Date().toISOString();
  let sent = 0;
  const errors = [];

  logger.automation('webhook_reply_comments_start', { timestamp: ts });

  if (!WEBHOOK_URL) {
    logger.automation('webhook_reply_comments_missing_url', {
      error: 'N8N_REPLY_WEBHOOK_URL not set in environment',
    });
    return { usersProcessed: 0, sent: 0, errors: [{ error: 'N8N_REPLY_WEBHOOK_URL not set' }] };
  }

  try {
    const users = await supabase.getUsersWithAutoReplyEnabled();
    logger.automation('webhook_reply_comments_users', { userCount: users.length });

    for (const user of users) {
      try {
        if (!isInActiveWindow(user)) {
          logger.automation('webhook_reply_comments_skipped_window', { userId: user.user_id });
          continue;
        }
        if (!isDueForReplyWebhook(user)) {
          logger.automation('webhook_reply_comments_skipped_interval', {
            userId: user.user_id,
            reply_interval_minutes: user.reply_interval_minutes ?? 30,
            reply_webhook_last_sent_at: user.reply_webhook_last_sent_at || null,
          });
          continue;
        }

        const payload = buildReplyWebhookPayload(user);
        const res = await axios.post(WEBHOOK_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000, // reply workflow can take longer
          validateStatus: () => true,
          maxRedirects: 0,
        });

        if (res.status >= 200 && res.status < 300) {
          await supabase.updateReplyWebhookLastSent(user.user_id);
          sent++;
          logger.automation('webhook_reply_comments_sent', { userId: user.user_id, status: res.status });
        } else {
          errors.push({ userId: user.user_id, status: res.status, data: res.data });
          logger.automation('webhook_reply_comments_failed', { userId: user.user_id, status: res.status });
        }
      } catch (e) {
        errors.push({ userId: user.user_id, error: e.message });
        logger.automation('webhook_reply_comments_error', { userId: user.user_id, error: e.message });
      }
    }

    logger.automation('webhook_reply_comments_done', { usersProcessed: users.length, sent, errorCount: errors.length });
    return { usersProcessed: users.length, sent, errors };
  } catch (e) {
    logger.automation('webhook_reply_comments_fatal', { error: e.message });
    return { usersProcessed: 0, sent: 0, errors: [...errors, { error: e.message }] };
  }
}
