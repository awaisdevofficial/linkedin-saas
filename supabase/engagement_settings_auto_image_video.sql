-- Add auto_generate_image and auto_generate_video to engagement_settings
-- Run this in Supabase Dashboard → SQL Editor if you get PGRST204 "Could not find the 'auto_generate_image' column"

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_generate_image boolean DEFAULT false;

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_generate_video boolean DEFAULT false;
