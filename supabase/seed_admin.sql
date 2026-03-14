-- Ensure one super_admin exists so you can log in at /admin/login
-- Run this in Supabase SQL Editor if your admins table exists but has no row or wrong api_key.
-- Table must have: id, email, role, api_key and a UNIQUE constraint/index on (email).

-- Upsert: add or update admin by email (use your own email and choose a strong api_key)
INSERT INTO public.admins (email, api_key, role)
  VALUES ('contact.awais.ai@gmail.com', 'Lassi.0', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  api_key = EXCLUDED.api_key;

-- Then log in at https://your-domain/admin/login with:
--   Email: contact.awais.ai@gmail.com
--   API key: Lassi.0
-- (Change the values above and re-run if you prefer a different email/key.)
