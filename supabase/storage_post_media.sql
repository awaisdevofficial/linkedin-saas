-- FIX 4 — Supabase Storage bucket for post-media (run in Supabase SQL Editor)

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read post-media" ON storage.objects;
CREATE POLICY "Public read post-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Service role upload post-media" ON storage.objects;
CREATE POLICY "Service role upload post-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-media');
