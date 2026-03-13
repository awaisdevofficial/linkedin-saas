-- engagement_logs.executed_at used for daily engagement cap (getDailyEngagementCount)
-- Run in Supabase SQL Editor if the column doesn't exist
ALTER TABLE public.engagement_logs
ADD COLUMN IF NOT EXISTS executed_at timestamptz;
