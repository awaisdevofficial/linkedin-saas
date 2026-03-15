# PostPilot / LinkedIn SaaS — Full database schema reference

Use this to verify your Supabase DB (e.g. with Supabase MCP or Dashboard). Tables are listed in dependency order. Columns are from migrations + code usage.

---

## 1. Auth (Supabase built-in)

- **auth.users** — Supabase Auth (id, email, …). App uses `profiles.id` = `auth.users.id`.

---

## 2. Public schema — core tables

### **profiles**
Extended user profile (often created via trigger from `auth.users`).  
**Columns (from migrations + code):**
- `id` UUID PK, references `auth.users(id)`
- `full_name` TEXT
- `email` TEXT
- `avatar_url` TEXT
- `status` TEXT DEFAULT 'pending' CHECK (pending, approved, banned, expired)
- `access_expires_at` TIMESTAMPTZ
- `approved_at` TIMESTAMPTZ
- `approved_by` TEXT
- `ban_reason` TEXT
- `notes` TEXT
- `plan` TEXT DEFAULT 'free'
- `created_at` TIMESTAMPTZ

**Used by:** server.js (OAuth upsert), admin.routes (users, approve, ban, notes), API guard, health, access-expiry job.

---

### **user_passwords**
Email/password login (magic link or password).  
**Columns:**
- `user_id` UUID PK, references auth/users
- `password_hash` TEXT

**Used by:** server.js (login, set-password, update-password).

---

### **linkedin_connections**
One row per user: LinkedIn tokens/cookies.  
**Columns (from code + migrations):**
- `user_id` UUID (PK or UNIQUE), references auth.users
- `access_token` TEXT
- `li_at_cookie` TEXT
- `person_urn` TEXT
- `jsessionid` TEXT (from linkedin_connections_jsessionid.sql)
- `is_active` BOOLEAN

**Used by:** server.js (OAuth), supabase.service (getConnectionByUserId, getUsersWithAutoLikeCommentEnabled), health.service, monitor.service, onboarding.

---

### **user_content_settings**
One row per user: niche, tone, prompts, generation options.  
**Columns (from code + migrations):**
- `user_id` UUID PK
- `niche` TEXT
- `post_tone` TEXT
- `use_default_post_prompt`, `use_default_comment_prompt`, `use_default_reply_prompt` BOOLEAN
- `cta_style` TEXT
- `custom_keywords` (array?), `topics_to_avoid` (array?)
- `generation_paused` BOOLEAN (user_content_generation_paused.sql)
- `generation_mode` TEXT DEFAULT 'auto', `custom_generation_prompt` TEXT (generation_mode_and_caption_options.sql)
- `image_caption_mode` TEXT DEFAULT 'content', `custom_image_caption` TEXT
- `video_caption_mode` TEXT DEFAULT 'content', `custom_video_caption` TEXT
- `enable_post_comment` BOOLEAN DEFAULT true (engagement_and_post_comment_options.sql)
- `kie_api_key` TEXT (rename_freepik_to_kie_api_key.sql)
- `updated_at` TIMESTAMPTZ

**Used by:** supabase.service (getUserContentSettings, updateUserContentSetting), onboarding, AuthCallback, AutomationSettings.

---

### **user_rss_feeds**
User’s RSS feeds for content.  
**Columns:**
- `user_id` UUID
- `feed_url` / `url` TEXT
- `label` TEXT
- `is_active` BOOLEAN

**Used by:** supabase.service (getUserRssFeeds).

---

### **niche_rss_feeds**
Default RSS feeds per niche.  
**Columns:**
- `niche` TEXT
- `url` TEXT
- `label` TEXT
- `is_active` BOOLEAN

**Used by:** supabase.service (getDefaultFeedsForNiche).

---

### **prompt_templates**
Templates by type and niche.  
**Columns:**
- `type` TEXT
- `niche` TEXT
- `is_default` BOOLEAN
- (content columns)

**Used by:** supabase.service (getPromptTemplate).

---

### **posts**
User’s generated/scheduled posts.  
**Columns (from code):**
- `id` UUID PK
- `user_id` UUID
- `status` TEXT (pending, approved, ready_to_post, etc.)
- `content`, `hook`, `hashtags` TEXT
- `visual_prompt` TEXT
- `media_url` TEXT
- `scheduled_at` TIMESTAMPTZ
- `posted` BOOLEAN
- `posted_at` TIMESTAMPTZ
- `post_uri` TEXT
- `is_checked` BOOLEAN
- `publish_with_video` BOOLEAN

**Used by:** supabase.service (posts CRUD), PostsActivity, DashboardHome, check-posts-urn.

---

### **schedules**
User’s posting schedule.  
**Columns:**
- `user_id` UUID
- `enabled` BOOLEAN
- (time/slot columns)

**Used by:** supabase.service (getUserSchedule), onboarding.

---

### **engagement_settings**
One row per user: like/comment/reply automation.  
**Columns (from code + migrations):**
- `user_id` UUID PK
- `auto_liking`, `auto_commenting`, `auto_replying` BOOLEAN
- `engagement_interval_minutes` INTEGER
- `reply_interval_minutes`, `reply_to_reply_interval_minutes` INTEGER
- `max_engagements_per_day` INTEGER
- `webhook_last_sent_at` TIMESTAMPTZ (engagement_webhook_last_sent.sql)
- `auto_generate_image`, `auto_generate_video` BOOLEAN (engagement_settings_auto_image_video.sql)
- `comment_prompt`, `active_days`, `active_start_time`, `active_end_time` (from code)

**Used by:** supabase.service (getEngagementSettings, updateWebhookLastSent, getUsersWithAutoLikeCommentEnabled), AutomationSettings.

---

### **engagement_logs**
Log of like/comment actions.  
**Columns (from feed_post_engagement_logs.sql + migrations):**
- `id` UUID PK
- `user_id` UUID
- `action` TEXT ('like', 'comment')
- `post_uri`, `activity_id` TEXT
- `post_content`, `comment_text` TEXT
- `status` TEXT
- `executed_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ
- `author_urn`, `author_name`, `author_headline`, `author_profile_url` TEXT
- `permalink`, `media_type` TEXT

**Used by:** supabase.service (logEngagement, hasEngaged, getDailyEngagementCount), CommentsActivity, DashboardHome.

---

### **comment_replies**
Replies to comments.  
**Columns:**
- `user_id` UUID
- `post_id` UUID?
- `post_uri` TEXT
- `comment_urn` TEXT
- `comment_text`, `reply_text` TEXT
- `status` TEXT

**Used by:** supabase.service (logReply, hasReplied), CommentsActivity, DashboardHome.

---

### **user_notification_settings**
Referenced in health.service (user_notification_settings).  
**Columns:** (exact schema not in repo; likely user_id + notification prefs.)

---

## 3. Admin & billing

### **admins**
Admin users (email + API key auth).  
**Columns (admins_and_invoices.sql):**
- `id` BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY
- `email` TEXT NOT NULL UNIQUE
- `api_key` TEXT
- `role` TEXT NOT NULL DEFAULT 'viewer' CHECK (super_admin, admin, viewer)

**Used by:** admin.routes (login, requireAdmin).

---

### **admin_logs**
Audit log of admin actions.  
**Columns (admin_panel_migrations.sql + admins_and_invoices.sql):**
- `id` UUID PK
- `action` TEXT
- `target_user_id` UUID
- `target_email` TEXT
- `details` JSONB
- `performed_by` TEXT DEFAULT 'admin'
- `admin_id` BIGINT REFERENCES admins(id)
- `admin_email` TEXT
- `created_at` TIMESTAMPTZ

**Used by:** admin.routes (adminLog), monitor.service (logAdminAction), access-expiry job.

---

### **invoices**
Invoices per user.  
**Columns (admin_panel_migrations.sql + admins_and_invoices.sql):**
- `id` UUID PK
- `user_id` UUID REFERENCES profiles(id) ON DELETE CASCADE
- `amount` DECIMAL(10,2)
- `currency` TEXT DEFAULT 'USD'
- `description` TEXT
- `status` TEXT DEFAULT 'unpaid' CHECK (unpaid, paid, cancelled)
- `due_date` DATE
- `paid_at` TIMESTAMPTZ
- `invoice_number` TEXT UNIQUE
- `visible_to_user` BOOLEAN DEFAULT true
- `email_sent_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

**Used by:** admin.routes (create, list, status, resend, visibility, preview), server.js (GET /api/invoices, GET /api/invoices/:id/html).

---

### **email_templates**
Editable email templates (HTML + text).  
**Columns (email_templates.sql):**
- `id` BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL PRIMARY KEY
- `key` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- `subject` TEXT NOT NULL
- `body_html` TEXT NOT NULL
- `text_body` TEXT NULL
- `description` TEXT NULL
- `created_at` TIMESTAMPTZ NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NULL DEFAULT now()

**Trigger:** `email_templates_updated` BEFORE UPDATE → `email_templates_updated_at()`.

**Used by:** template.service.js (getEmailTemplate by key).

---

### **feature_flags**
Admin-controlled flags for dashboard pages.  
**Columns (feature_flags.sql):**
- `key` TEXT PRIMARY KEY
- `label` TEXT NOT NULL
- `enabled` BOOLEAN DEFAULT true
- `message_type` TEXT DEFAULT 'coming_soon' CHECK (coming_soon, maintenance, custom)
- `custom_message` TEXT
- `updated_at` TIMESTAMPTZ
- `updated_by` TEXT

**Used by:** admin.routes (GET/PATCH feature-flags), server.js (GET /api/feature-flags).

---

## 4. Monitoring / health

### **system_errors**
Backend error log.  
**Columns (from code):**
- (id, message, context, created_at, etc.)

**Used by:** monitor.service (insert, select for admin errors).

---

### **system_health**
Health check results.  
**Columns (from code):**
- (id, check type, status, details, created_at, etc.)

**Used by:** health.service (insert, getLatestHealth).

---

## 5. Storage (Supabase Storage)

- **avatars** — public bucket; user avatars (backend uploads via service role).
- **post-media** — public bucket; post images/videos.

Policies: public read; service role insert/update for avatars and post-media (see storage_avatars.sql, storage_post_media.sql).

---

## 6. RLS

- **engagement_logs** — RLS enabled; users can SELECT own rows (feed_post_engagement_logs.sql).
- **linkedin_connections** — RLS enabled; users can SELECT/INSERT/UPDATE own row (linkedin_connections_rls.sql).
- Other tables: backend uses service role (bypasses RLS). Frontend may use anon/key with RLS where configured.

---

## Quick checklist for Supabase MCP / Dashboard

- [ ] **profiles** — has status, access_expires_at, approved_at, ban_reason, notes, plan, created_at
- [ ] **user_passwords** — user_id, password_hash
- [ ] **linkedin_connections** — user_id, access_token, li_at_cookie, person_urn, jsessionid, is_active
- [ ] **user_content_settings** — user_id, generation_paused, generation_mode, enable_post_comment, kie_api_key, image/video caption columns
- [ ] **engagement_settings** — user_id, auto_liking, auto_commenting, auto_replying, webhook_last_sent_at, auto_generate_image, auto_generate_video
- [ ] **engagement_logs** — executed_at, post_content, author_*, created_at
- [ ] **admins** — email, api_key, role
- [ ] **admin_logs** — admin_id, admin_email
- [ ] **invoices** — visible_to_user, email_sent_at
- [ ] **email_templates** — key, subject, body_html, text_body; trigger email_templates_updated
- [ ] **feature_flags** — key, enabled, message_type, custom_message
- [ ] **system_errors** — exists and writable by backend
- [ ] **system_health** — exists and writable by backend
- [ ] Storage buckets **avatars** and **post-media** with correct policies

Run your Supabase MCP (or Dashboard SQL) to list tables and columns and compare with this file.
