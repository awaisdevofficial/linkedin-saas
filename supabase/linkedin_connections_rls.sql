-- RLS for linkedin_connections so users can save/update their own li_at and jsessionid from Settings.
-- Run in Supabase Dashboard → SQL Editor.

-- Enable RLS (if not already)
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own connection row
CREATE POLICY "Users can select own linkedin_connection"
  ON public.linkedin_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own connection (e.g. when adding cookies only, no OAuth)
CREATE POLICY "Users can insert own linkedin_connection"
  ON public.linkedin_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own connection (e.g. update li_at_cookie, jsessionid in Settings)
CREATE POLICY "Users can update own linkedin_connection"
  ON public.linkedin_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (backend) bypasses RLS. Authenticated users can only manage their own row.
-- To recreate policies: DROP POLICY IF EXISTS "Users can select own linkedin_connection" ON public.linkedin_connections;
-- Same for "Users can insert own linkedin_connection" and "Users can update own linkedin_connection".
