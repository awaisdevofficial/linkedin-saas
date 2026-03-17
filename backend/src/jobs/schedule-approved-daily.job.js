import * as supabase from '../services/supabase.service.js';
import * as groq from '../services/groq.service.js';
import * as kie from '../services/kie.service.js';
import * as imageService from '../services/image.service.js';
import { logger } from '../utils/logger.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Get today's date in UTC and a random time for scheduling. Uses user's schedule if available. */
function getScheduledTimeTodayUtc(userSchedule) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[now.getUTCDay()];

  let timeStr = '12:00';
  if (userSchedule?.length) {
    const todaySchedule = userSchedule.find((s) => s.day === todayName);
    const slots = todaySchedule?.time_slots || ['09:00', '12:00', '18:00'];
    timeStr = slots[Math.floor(Math.random() * slots.length)];
  }
  const [h, m] = timeStr.split(':').map(Number);
  let scheduled = new Date(Date.UTC(year, month, date, h || 12, m || 0, 0, 0));
  if (scheduled <= now) {
    scheduled = new Date(scheduled.getTime() + 60 * 60 * 1000);
  }
  return scheduled.toISOString();
}

/**
 * Generate image and/or video for an existing approved post based on user settings.
 * Uses engagement_settings.auto_generate_image / auto_generate_video and content settings (KIE key, caption mode).
 */
async function ensureMediaForApprovedPost(post, userId, contentSettings, engageSettings, errors) {
  const kieKey = contentSettings?.kie_api_key?.trim();
  if (!kieKey) return;

  const shouldImage = engageSettings?.auto_generate_image === true && !post.media_url;
  const shouldVideo = engageSettings?.auto_generate_video === true && !post.video_url;
  const hook = post.hook || '';
  const content = post.post_copy || post.content || '';
  const visualPrompt = post.visual_prompt;

  if (shouldImage) {
    try {
      const imagePrompt =
        contentSettings.image_caption_mode === 'custom' && contentSettings.custom_image_caption?.trim()
          ? contentSettings.custom_image_caption.trim()
          : groq.buildPromptFromPostContent(hook, content) || groq.buildImagePromptFromVisual(visualPrompt);
      if (imagePrompt) {
        logger.automation('schedule_approved_image_start', { userId, postId: post.id });
        const imageUrl = await kie.generateImage(kieKey, imagePrompt, '16:9');
        if (imageUrl) {
          const mediaUrl = await imageService.processAndUploadImage(userId, imageUrl);
          if (mediaUrl) {
            await supabase.updatePost(post.id, {
              media_url: mediaUrl,
              video_url: post.video_url || null,
              has_media: true,
              updated_at: new Date().toISOString(),
            });
            post.media_url = mediaUrl;
            logger.automation('schedule_approved_image_done', { userId, postId: post.id });
          }
        }
      }
      await sleep(2000);
    } catch (e) {
      logger.automation('schedule_approved_image_error', { userId, postId: post.id, error: e.message });
      errors.push({ userId, postId: post.id, action: 'image', error: e.message });
    }
  }

  if (shouldVideo) {
    try {
      const videoPrompt =
        contentSettings.video_caption_mode === 'custom' && contentSettings.custom_video_caption?.trim()
          ? contentSettings.custom_video_caption.trim()
          : groq.buildPromptFromPostContent(hook, content) || groq.buildImagePromptFromVisual(visualPrompt) || 'Professional, subtle motion suitable for LinkedIn.';
      logger.automation('schedule_approved_video_start', { userId, postId: post.id });
      const videoUrl = await kie.generateVideo(kieKey, videoPrompt, '5', '16:9');
      if (videoUrl) {
        const uploadedVideoUrl = await imageService.uploadVideoFromUrl(userId, videoUrl);
        if (uploadedVideoUrl) {
          await supabase.updatePost(post.id, {
            video_url: uploadedVideoUrl,
            updated_at: new Date().toISOString(),
          });
          post.video_url = uploadedVideoUrl;
          logger.automation('schedule_approved_video_done', { userId, postId: post.id });
        }
      }
      await sleep(2000);
    } catch (e) {
      logger.automation('schedule_approved_video_error', { userId, postId: post.id, error: e.message });
      errors.push({ userId, postId: post.id, action: 'video', error: e.message });
    }
  }
}

/**
 * Daily job: for each user, pick 1 random approved post, generate image/video if needed (per user settings),
 * then set status=ready_to_post and scheduled_at=today. Publish job will publish when time comes.
 */
export async function runScheduleApprovedDailyJob() {
  const ts = new Date().toISOString();
  let scheduled = 0;
  const errors = [];

  logger.automation('schedule_approved_daily_start', { timestamp: ts });

  try {
    const users = await supabase.getAllActiveUsers();
    logger.automation('schedule_approved_daily_users', { userCount: users.length });

    for (const user of users) {
      const userId = user.user_id;
      try {
        const alreadyScheduled = await supabase.hasPostScheduledForToday(userId);
        if (alreadyScheduled) {
          logger.automation('schedule_approved_daily_skip_today', { userId });
          continue;
        }

        const approved = await supabase.getApprovedPostsForDailySchedule(userId);
        if (!approved.length) {
          logger.automation('schedule_approved_daily_skip_no_approved', { userId });
          continue;
        }

        const shuffled = shuffle(approved);
        const post = shuffled[0];

        const [contentSettings, engageSettings, userSchedule] = await Promise.all([
          supabase.getUserContentSettings(userId),
          supabase.getEngagementSettings(userId),
          supabase.getUserSchedule(userId),
        ]);

        await ensureMediaForApprovedPost(post, userId, contentSettings, engageSettings || {}, errors);

        const scheduledAt = getScheduledTimeTodayUtc(userSchedule);
        await supabase.updatePost(post.id, {
          status: 'ready_to_post',
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        });

        scheduled++;
        logger.automation('schedule_approved_daily_scheduled', {
          userId,
          postId: post.id,
          scheduled_at: scheduledAt,
        });
      } catch (e) {
        logger.automation('schedule_approved_daily_user_error', { userId, error: e.message });
        errors.push({ userId, error: e.message });
      }
    }

    logger.automation('schedule_approved_daily_done', { scheduled, errorCount: errors.length });
    return { scheduled, errors };
  } catch (e) {
    logger.automation('schedule_approved_daily_fatal', { error: e.message });
    return { scheduled: 0, errors: [...errors, { error: e.message }] };
  }
}
