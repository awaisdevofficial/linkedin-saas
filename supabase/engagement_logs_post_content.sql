-- Add post_content to engagement_logs for displaying which post was liked/commented
-- Run in Supabase SQL Editor if the column doesn't exist
ALTER TABLE engagement_logs
ADD COLUMN IF NOT EXISTS post_content TEXT;
