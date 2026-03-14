-- Track when we last sent this user's data to the Like&Comment webhook (for per-user interval).
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS webhook_last_sent_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.engagement_settings.webhook_last_sent_at IS 'Last time user data was sent to auto.nsolbpo.com webhook for feed like/comment; used to respect engagement_interval_minutes per user.';
