-- Freepik API key (per user) and post video URL
-- Run in Supabase SQL Editor

-- user_content_settings: store user's Freepik API key for image/video generation
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS freepik_api_key text;

-- posts: store generated video URL (from Freepik Kling etc.)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS video_url text;

-- posts: when true, publish to LinkedIn with video (if video_url set); else use image
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS publish_with_video boolean DEFAULT false;
