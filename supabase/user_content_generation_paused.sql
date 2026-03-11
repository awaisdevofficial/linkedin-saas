-- Add generation_paused to user_content_settings (run in Supabase SQL Editor)
-- When true, hourly post generation is skipped for this user.

ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS generation_paused boolean DEFAULT false;
