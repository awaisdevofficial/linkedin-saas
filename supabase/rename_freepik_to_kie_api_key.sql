-- Replace Freepik with KIE: use kie_api_key for image/video generation
-- Run in Supabase SQL Editor. Get your key: https://kie.ai/api-key

-- Add KIE API key column if not present
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS kie_api_key text;

-- Migrate existing keys from freepik_api_key to kie_api_key
UPDATE public.user_content_settings
SET kie_api_key = COALESCE(kie_api_key, freepik_api_key)
WHERE freepik_api_key IS NOT NULL;

-- Drop old column
ALTER TABLE public.user_content_settings
DROP COLUMN IF EXISTS freepik_api_key;
