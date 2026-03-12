-- Add JSESSIONID for Voyager API CSRF (used with li_at for getPostComments).
-- Run in Supabase SQL editor if linkedin_connections already exists.
ALTER TABLE linkedin_connections
  ADD COLUMN IF NOT EXISTS jsessionid text;
