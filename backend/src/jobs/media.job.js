import * as supabase from '../services/supabase.service.js';
import * as openai from '../services/openai.service.js';
import * as freepik from '../services/freepik.service.js';
import * as imageService from '../services/image.service.js';
import { logger } from '../utils/logger.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runMediaJob() {
  let processed = 0;
  const errors = [];

  logger.automation('media_job_start');

  try {
    const users = await supabase.getAllActiveUsers();
    logger.automation('media_job_users', { userCount: users.length });

    for (const user of users) {
      const userId = user.user_id;
      try {
        const posts = await supabase.getPendingMediaPosts(userId);
        logger.automation('media_job_pending', { userId, pendingCount: posts?.length ?? 0 });

        const settings = await supabase.getUserContentSettings(userId);
        const apiKey = settings?.freepik_api_key?.trim();
        if (!apiKey) {
          logger.automation('media_job_skip', { userId, reason: 'no_freepik_key' });
          continue;
        }
        for (const post of posts) {
          try {
            logger.automation('media_job_step', { postId: post.id, step: 'generateImage' });
            const prompt = openai.buildImagePromptFromVisual(post.visual_prompt);
            const imageUrl = await freepik.generateImage(apiKey, prompt, 'widescreen_16_9');
            if (!imageUrl) {
              logger.automation('media_job_skip', { postId: post.id, step: 'generateImage', reason: 'null' });
              continue;
            }

            logger.automation('media_job_step', { postId: post.id, step: 'processAndUploadImage' });
            const mediaUrl = await imageService.processAndUploadImage(userId, imageUrl);
            if (!mediaUrl) {
              logger.automation('media_job_skip', { postId: post.id, step: 'processAndUploadImage', reason: 'null' });
              continue;
            }

            logger.automation('media_job_step', { postId: post.id, step: 'updatePost', mediaUrl });
            await supabase.updatePost(post.id, {
              media_url: mediaUrl,
              status: 'ready_to_post',
              is_checked: true,
              has_media: true,
              updated_at: new Date().toISOString(),
            });
            processed++;
            logger.automation('media_job_post_done', { postId: post.id, userId });
            await sleep(5000);
          } catch (e) {
            logger.automation('media_job_post_error', { postId: post.id, userId, error: e.message });
            errors.push({ userId, postId: post.id, error: e.message });
          }
        }
      } catch (e) {
        logger.automation('media_job_user_error', { userId, action: 'getPendingMediaPosts', error: e.message });
        errors.push({ userId, action: 'getPendingMediaPosts', error: e.message });
      }
    }

    logger.automation('media_job_done', { processed, errorCount: errors.length });
    return { processed, errors };
  } catch (e) {
    logger.automation('media_job_fatal', { error: e.message });
    return { processed, errors: [...errors, { error: e.message }] };
  }
}
