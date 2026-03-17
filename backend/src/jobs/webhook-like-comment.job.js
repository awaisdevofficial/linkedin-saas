import axios from 'axios';
import * as supabase from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

const WEBHOOK_URL = process.env.N8N_LIKE_COMMENT_WEBHOOK_URL || 'https://auto.nsolbpo.com/webhook/Like&Comment';

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
 * Returns true if this user is due for a webhook send.
 * Each user has their own engagement_interval_minutes and webhook_last_sent_at;
 * we only send when (now - webhook_last_sent_at) >= that user's interval.
 */
function isDueForWebhook(user) {
  const lastSent = user.webhook_last_sent_at ? new Date(user.webhook_last_sent_at) : null;
  const intervalMinutes = Number(user.engagement_interval_minutes) || 30;
  const intervalMs = intervalMinutes * 60 * 1000;
  if (!lastSent) return true;
  const elapsed = Date.now() - lastSent.getTime();
  return elapsed >= intervalMs;
}

/** Build payload to send to Like&Comment webhook (all data for that user). */
function buildWebhookPayload(user) {
  return {
    user_id: user.user_id,
    person_urn: user.person_urn || null,
    auto_liking: user.auto_liking,
    auto_commenting: user.auto_commenting,
    engagement_interval_minutes: user.engagement_interval_minutes,
    comment_prompt: user.comment_prompt || null,
    active_days: user.active_days || [],
    active_start_time: user.active_start_time || '08:00',
    active_end_time: user.active_end_time || '20:00',
    max_engagements_per_day: user.max_engagements_per_day ?? 50,
    sent_at: new Date().toISOString(),
  };
}

/**
 * For each user with auto like/comment enabled, at their configured interval,
 * send their data to https://auto.nsolbpo.com/webhook/Like&Comment.
 */
export async function runWebhookLikeCommentJob() {
  const ts = new Date().toISOString();
  let sent = 0;
  const errors = [];

  logger.automation('webhook_like_comment_start', { timestamp: ts });

  try {
    const users = await supabase.getUsersWithAutoLikeCommentEnabled();
    logger.automation('webhook_like_comment_users', { userCount: users.length });

    for (const user of users) {
      try {
        if (!isInActiveWindow(user)) {
          logger.automation('webhook_like_comment_skipped_window', { userId: user.user_id });
          continue;
        }
        if (!isDueForWebhook(user)) {
          logger.automation('webhook_like_comment_skipped_interval', {
            userId: user.user_id,
            intervalMinutes: user.engagement_interval_minutes ?? 30,
            webhook_last_sent_at: user.webhook_last_sent_at || null,
          });
          continue;
        }

        const payload = buildWebhookPayload(user);
        const res = await axios.post(WEBHOOK_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000, // n8n workflow can take a while; avoid "timeout of 15000ms exceeded"
          validateStatus: () => true,
          maxRedirects: 0,
        });

        if (res.status >= 200 && res.status < 300) {
          await supabase.updateWebhookLastSent(user.user_id);
          sent++;
          logger.automation('webhook_like_comment_sent', { userId: user.user_id, status: res.status });
        } else {
          errors.push({ userId: user.user_id, status: res.status, data: res.data });
          logger.automation('webhook_like_comment_failed', { userId: user.user_id, status: res.status });
        }
      } catch (e) {
        errors.push({ userId: user.user_id, error: e.message });
        logger.automation('webhook_like_comment_error', { userId: user.user_id, error: e.message });
      }
    }

    logger.automation('webhook_like_comment_done', { usersProcessed: users.length, sent, errorCount: errors.length });
    return { usersProcessed: users.length, sent, errors };
  } catch (e) {
    logger.automation('webhook_like_comment_fatal', { error: e.message });
    return { usersProcessed: 0, sent: 0, errors: [...errors, { error: e.message }] };
  }
}
