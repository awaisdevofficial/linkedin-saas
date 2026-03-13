# Project verification – post generation, video/image, comments, replies

Quick reference to confirm all main flows are wired and what to check in production.

---

## 1. Post generation

| Layer | Status | Notes |
|-------|--------|--------|
| **Cron** | OK | `scheduler/index.js`: generate job runs hourly (`0 * * * *`), UTC. |
| **Job** | OK | `generate.job.js`: custom mode → `groq.generatePostFromCustomPrompt`; auto mode → RSS + `groq.generatePost`. Creates post then `handleMediaGeneration` if KIE key + auto image/video toggles. |
| **Groq** | OK | `groq.service.js`: `generatePost`, `generatePostFromCustomPrompt` (JSON with hook, content, hashtags, visual_prompt, suggested_comments). |
| **API** | OK | `POST /api/generate` runs `runGenerateJob(userId, { force })` and waits for completion. |
| **Frontend** | OK | `apiCalls.generate(token)` → trigger; PostsActivity uses it for “Generate” button. |

**Requires:** `GROQ_API_KEY` in backend `.env`. User content settings (niche, mode, custom prompt). For auto image/video: user `kie_api_key` (valid + paid) and engagement_settings `auto_generate_image` / `auto_generate_video`.

---

## 2. Image generation

| Layer | Status | Notes |
|-------|--------|--------|
| **KIE** | OK | `kie.service.js`: `generateImage(apiKey, prompt, aspectRatio)` → Flux-2 text-to-image, polls `recordInfo` until success. |
| **API** | OK | `POST /api/generate-image-for-post`, `POST /api/regenerate-image`: require KIE key, build prompt from post (groq.buildPromptFromPostContent / buildImagePromptFromVisual), then KIE → `image.service.processAndUploadImage`. |
| **Upload** | OK | `image.service.js`: download image, resize 1200×627, watermark, upload to Supabase `post-media` bucket. |
| **Frontend** | OK | Image button disabled when `kieKeyPaid !== true`; calls `generateImageForPost` / `regenerateImage`. |

**Requires:** User KIE API key in Automation Settings (valid + credits > 0). Nginx `proxy_read_timeout` ≥ 600s for long KIE polling.

---

## 3. Video generation

| Layer | Status | Notes |
|-------|--------|--------|
| **KIE** | OK | `kie.service.js`: `generateVideo(apiKey, prompt, duration, aspectRatio)` → Kling 2.6 text-to-video, no image required. |
| **API** | OK | `POST /api/generate-video-for-post`: prompt from post content, then KIE → `image.service.uploadVideoFromUrl`. |
| **Job** | OK | `handleMediaGeneration`: if `auto_generate_video`, calls `kie.generateVideo` with content-based prompt. |
| **Frontend** | OK | Video button disabled when `kieKeyPaid !== true`; calls `generateVideoForPost`. |

**Requires:** Same KIE key as image. Long timeout as for image.

---

## 4. Comments (engage job – like + comment on feed)

| Layer | Status | Notes |
|-------|--------|--------|
| **Cron** | OK | Engage job every 30 min (`*/30 * * * *`), UTC. |
| **Job** | OK | `engage.job.js`: active users, in active window, under daily cap → fetch feed → like then 5s delay then comment on same post. Uses `linkedin.likePost`, `groq.generateComment`, `linkedin.commentOnPost`. |
| **Groq** | OK | `generateComment(postDescription, systemPrompt)` returns single comment text. |
| **LinkedIn** | OK | `likePost(credentials, activityId)`; `commentOnPost(credentials, postUrn, commentText)` (v2 API, Bearer). |
| **DB** | OK | `hasEngaged(userId, activityId, action)`, `logEngagement(..., executed_at)`, `getDailyEngagementCount(userId)` (by `executed_at`). |

**Requires:** `linkedin_connections` with valid tokens/cookies; engagement_settings (auto_liking, auto_commenting, active_days, active_start_time/end_time, max_engagements_per_day). `engagement_logs` should have `executed_at` for daily cap.

---

## 5. Replies (reply job – reply to comments on user’s posts)

| Layer | Status | Notes |
|-------|--------|--------|
| **Cron** | OK | Reply job every 15 min (`*/15 * * * *`), UTC. |
| **Job** | OK | `reply.job.js`: users with `auto_replying` → posted posts (last 7 days) → `linkedin.getPostComments` → for each comment (not own), if not already replied → `groq.generateReply` → `linkedin.replyToComment` → `logReply`. |
| **Groq** | OK | `generateReply(systemPrompt)` returns reply text. |
| **LinkedIn** | OK | `getPostComments(credentials, postUrn)` (voyager, needs `liAtCookie` + `csrfToken`); `replyToComment(credentials, activityUrn, commentUrn, replyText)`. |
| **DB** | OK | `hasReplied(userId, commentUrn)`, `comment_replies` table. |

**Requires:** `getAllActiveUsers` provides `jsessionid` as `csrfToken` for getPostComments. Posted posts must have `linkedin_post_id` (set by publish).

---

## 6. Publish (scheduled + manual)

| Layer | Status | Notes |
|-------|--------|--------|
| **Cron** | OK | Publish job every 5 min; picks posts with `status = 'ready_to_post'`, `posted = false`, `scheduled_at` not null and ≤ now. |
| **Job** | OK | `publish.job.js`: `linkedin.postToLinkedIn` (with optional video), then update post (posted, linkedin_post_id), then post up to 3 suggested_comments with 60s delay. |
| **API** | OK | `POST /api/publish-now`: same flow for one post; can generate image on-the-fly if missing and KIE key set. |
| **Frontend** | OK | Schedule sets `status: 'ready_to_post'`, `scheduled_at`; Publish now calls `publishNow(token, postId)`. |

**Requires:** LinkedIn connection (person_urn, access_token, etc.). For video: `publish_with_video` and `video_url` set.

---

## 7. KIE key validation and gating

| Layer | Status | Notes |
|-------|--------|--------|
| **Backend** | OK | `GET /api/kie-key-status` (stored key → credits); `POST /api/validate-kie-key` (body apiKey → valid + paid). Paid = credits > 0. |
| **Frontend** | OK | AutomationSettings: save content only if KIE key validates and paid; auto image/video toggles disabled when `!kieKeyPaid`. PostsActivity: image/video buttons and Create New Post checkboxes disabled when `!kieKeyPaid`. |

---

## 8. Environment and config

- **Backend:** `GROQ_API_KEY`, Supabase URL + service role key, LinkedIn OAuth client id/secret. Optional: KIE is per-user.
- **Frontend:** `VITE_API_URL` / same-origin for `/api`; Nginx proxies `/api/` to backend and uses long timeouts for image/video endpoints.
- **DB:** Run migrations so `user_content_settings.kie_api_key`, `engagement_settings.auto_generate_image` / `auto_generate_video`, and `engagement_logs.executed_at` exist (add `executed_at` if daily engagement cap is wrong).

---

## 9. Quick sanity checks

1. **Post generation:** Trigger “Generate” from dashboard; check backend logs for `generate_triggered` / `generate_completed` and new row in `posts`.
2. **Image:** Add valid KIE key with credits → Generate image on a post; expect long request then `media_url` on post.
3. **Video:** Same key → Generate video on same/different post; expect `video_url` on post.
4. **Comments:** Enable auto like + comment, set active window; wait for engage cron or inspect logs for `engage_job_liked` / `engage_job_commented`.
5. **Replies:** Publish a post, get a comment from someone else; enable auto reply; wait for reply cron or check logs for `reply_job_replied`.
6. **Publish:** Schedule a post for a few minutes ahead with status ready_to_post; wait for publish cron and confirm post on LinkedIn and `posted = true`, `linkedin_post_id` set.

All core flows are wired end-to-end; the main dependencies are env vars, DB schema, and (for image/video) a valid, paid KIE key.
