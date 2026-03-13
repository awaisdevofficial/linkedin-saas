-- Generation mode, custom prompt, and image/video caption options (run in Supabase SQL Editor FIRST)
-- Then apply code changes to generate.job.js, groq.service.js, AutomationSettings.tsx

-- user_content_settings: generation mode (auto = RSS/niche, custom = user instructions)
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'auto';

ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS custom_generation_prompt text;

-- user_content_settings: image caption source (content = from post, custom = user prompt)
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS image_caption_mode text DEFAULT 'content';

ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS custom_image_caption text;

-- user_content_settings: video caption source (content = from post, custom = user prompt)
ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS video_caption_mode text DEFAULT 'content';

ALTER TABLE public.user_content_settings
ADD COLUMN IF NOT EXISTS custom_video_caption text;

-- engagement_settings: toggles for auto-generate image/video when creating posts
ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_generate_image boolean DEFAULT false;

ALTER TABLE public.engagement_settings
ADD COLUMN IF NOT EXISTS auto_generate_video boolean DEFAULT false;
