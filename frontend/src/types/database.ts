/**
 * Supabase / database row types for engagement and reply features.
 */

/** posts table — fields relevant to LinkedIn URNs (ugcPost vs activity). */
export interface PostRowLinkedIn {
  linkedin_post_id: string | null;
  activity_urn: string | null;
}

/** engagement_settings row (one per user). */
export interface EngagementSettingsRow {
  user_id: string;
  auto_liking: boolean;
  auto_commenting: boolean;
  auto_replying: boolean;
  comment_prompt: string | null;
  engagement_interval_minutes: number | null;
  active_days: string[] | null;
  active_start_time: string | null;
  active_end_time: string | null;
  max_engagements_per_day: number | null;
  webhook_last_sent_at: string | null;
  reply_webhook_last_sent_at?: string | null;
  auto_generate_image?: boolean;
  auto_generate_video?: boolean;
  reply_interval_minutes?: number | null;
  reply_to_reply_interval_minutes?: number | null;
  [key: string]: unknown;
}

/** reply_logs table row. */
export interface ReplyLogRow {
  id: string;
  user_id: string;
  post_id: string | null;
  post_uri: string | null;
  comment_urn: string | null;
  comment_text: string | null;
  reply_text: string | null;
  status: string;
  created_at: string;
}
