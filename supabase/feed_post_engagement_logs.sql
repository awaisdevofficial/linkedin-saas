-- =============================================================================
-- Feed post likes and comments: full schema to store all details.
-- Run in Supabase Dashboard → SQL Editor.
-- Use this to create the table from scratch or add missing columns to existing.
-- =============================================================================

-- Create table if it doesn't exist (e.g. new project)
CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('like', 'comment')),
  post_uri text,
  activity_id text,
  post_content text,
  comment_text text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'skipped', 'failed', 'post_unavailable', 'error')),
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Post author details
  author_urn text,
  author_name text,
  author_headline text,
  author_profile_url text,
  -- Optional extras
  permalink text,
  media_type text
);

-- Add any missing columns (for existing engagement_logs table)
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS executed_at timestamptz DEFAULT now();
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS post_content text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS author_urn text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS author_headline text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS author_profile_url text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS permalink text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.engagement_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_engagement_logs_user_id ON public.engagement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_executed_at ON public.engagement_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_user_action ON public.engagement_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_activity_id ON public.engagement_logs(user_id, activity_id, action);

-- RLS: users can only see and insert their own logs (backend uses service role for writes)
ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own engagement_logs" ON public.engagement_logs;
CREATE POLICY "Users can select own engagement_logs"
  ON public.engagement_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Optional: allow insert from frontend for same user (if you log from client)
-- DROP POLICY IF EXISTS "Users can insert own engagement_logs" ON public.engagement_logs;
-- CREATE POLICY "Users can insert own engagement_logs"
--   ON public.engagement_logs FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.engagement_logs IS 'Feed post likes and comments performed by the user (or by automation). All details for display and analytics.';
COMMENT ON COLUMN public.engagement_logs.post_uri IS 'LinkedIn post URN e.g. urn:li:activity:123';
COMMENT ON COLUMN public.engagement_logs.activity_id IS 'LinkedIn activity ID';
COMMENT ON COLUMN public.engagement_logs.action IS 'like or comment';
COMMENT ON COLUMN public.engagement_logs.author_urn IS 'LinkedIn URN of the post author';
COMMENT ON COLUMN public.engagement_logs.executed_at IS 'When the like/comment was performed (for daily caps and ordering)';
