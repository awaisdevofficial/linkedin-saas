-- Supabase Storage bucket for user avatars (LinkedIn profile pictures)
-- Run in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read for avatar images
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow service role to upload (backend uses service role)
DROP POLICY IF EXISTS "Service role upload avatars" ON storage.objects;
CREATE POLICY "Service role upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Allow service role to update (for re-upload on re-login)
DROP POLICY IF EXISTS "Service role update avatars" ON storage.objects;
CREATE POLICY "Service role update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');
