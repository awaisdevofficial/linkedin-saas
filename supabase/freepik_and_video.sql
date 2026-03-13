-- KIE API key (per user) and post video URL
-- Run in Supabase SQL Editor. Get your key: https://kie.ai/api-key
-- If you previously ran this file with freepik_api_key, run rename_freepik_to_kie_api_key.sql to migrate.

-- user_content_settings: store user's KIE API key for image/video generation
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS kie_api_key text;

-- posts: store generated video URL (from KIE Kling etc.)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS video_url text;

-- posts: when true, publish to LinkedIn with video (if video_url set); else use image
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS publish_with_video boolean DEFAULT false;
