-- Engagement toggles and "post comment on my post" option (run in Supabase SQL Editor)
-- Enables: auto-like, comment on feed posts, reply to comments, and optional suggested comments when publishing.

-- user_content_settings: when publishing, optionally post suggested comments on own post
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS enable_post_comment boolean DEFAULT true;

-- engagement_settings: toggles for engage job (like, comment on feed) and reply job
ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_liking boolean DEFAULT true;

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_commenting boolean DEFAULT true;

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_replying boolean DEFAULT true;

-- Interval between each like/comment on other posts (minutes). Min 15, max 10080 (1 week).
ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS engagement_interval_minutes integer DEFAULT 15;
