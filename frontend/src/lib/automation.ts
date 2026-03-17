const LIKE_COMMENT_WEBHOOK_URL = 'https://auto.nsolbpo.com/webhook/Like&Comment';
const REPLY_TO_COMMENTS_WEBHOOK_URL = 'https://auto.nsolbpo.com/webhook/reply-to-comments';

export type EngagementSettingsPayload = {
  user_id: string;
  auto_liking?: boolean;
  auto_commenting?: boolean;
  auto_replying?: boolean;
  engagement_interval_minutes?: number;
  comment_prompt?: string | null;
  active_days?: string[];
  active_start_time?: string;
  active_end_time?: string;
  max_engagements_per_day?: number;
};

export type LinkedInConnectionPayload = {
  person_urn: string;
  [key: string]: unknown;
};

/**
 * Builds and sends the Like&Comment webhook payload.
 */
export async function triggerLikeAndComment(
  settings: EngagementSettingsPayload,
  connection: LinkedInConnectionPayload
): Promise<Response> {
  const payload = {
    user_id: settings.user_id,
    person_urn: connection.person_urn,
    auto_liking: settings.auto_liking,
    auto_commenting: settings.auto_commenting,
    engagement_interval_minutes: settings.engagement_interval_minutes ?? 60,
    comment_prompt: settings.comment_prompt ?? null,
    active_days: settings.active_days ?? [],
    active_start_time: settings.active_start_time ?? '08:00',
    active_end_time: settings.active_end_time ?? '20:00',
    max_engagements_per_day: settings.max_engagements_per_day ?? 50,
    sent_at: new Date().toISOString(),
  };
  const res = await fetch(LIKE_COMMENT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook failed: ${res.status} ${text || res.statusText}`);
  }
  return res;
}

/**
 * Builds and sends the reply-to-comments webhook payload.
 */
export async function triggerReplyToComments(
  settings: EngagementSettingsPayload,
  connection: LinkedInConnectionPayload
): Promise<Response> {
  const payload = {
    user_id: settings.user_id,
    person_urn: connection.person_urn,
    auto_replying: settings.auto_replying,
    comment_prompt: settings.comment_prompt ?? null,
    active_days: settings.active_days ?? [],
    active_start_time: settings.active_start_time ?? '08:00',
    active_end_time: settings.active_end_time ?? '20:00',
    sent_at: new Date().toISOString(),
  };
  const res = await fetch(REPLY_TO_COMMENTS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook failed: ${res.status} ${text || res.statusText}`);
  }
  return res;
}
