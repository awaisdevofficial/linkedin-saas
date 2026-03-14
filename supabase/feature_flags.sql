-- Admin-controlled feature flags: enable/disable dashboard pages and set message (Coming soon, Maintenance, etc.)

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  message_type TEXT DEFAULT 'coming_soon' CHECK (message_type IN ('coming_soon', 'maintenance', 'custom')),
  custom_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Seed default flags for dashboard pages (route path -> key)
INSERT INTO feature_flags (key, label, enabled, message_type) VALUES
  ('posts_activity', 'Posts', true, 'coming_soon'),
  ('comments_activity', 'Comments & Replies', true, 'coming_soon'),
  ('automation', 'Automation', true, 'coming_soon')
ON CONFLICT (key) DO NOTHING;
