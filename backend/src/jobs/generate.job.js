import * as supabase from '../services/supabase.service.js';
import * as openai from '../services/openai.service.js';
import * as freepik from '../services/freepik.service.js';
import * as rss from '../services/rss.service.js';
import * as imageService from '../services/image.service.js';
import { logger } from '../utils/logger.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runGenerateJob(optionUserId = null, options = {}) {
  const { force: forceGenerate = false } = options;
  const ts = new Date().toISOString();
  let usersProcessed = 0;
  let postsCreated = 0;
  const errors = [];

  logger.automation('generate_job_start', { optionUserId, timestamp: ts, force: forceGenerate });

  try {
    let users = await supabase.getAllActiveUsers();
    if (optionUserId) users = users.filter((u) => u.user_id === optionUserId);
    logger.automation('generate_job_users', { userCount: users.length, userIds: users.map((u) => u.user_id) });
    if (!users.length) {
      logger.automation('generate_job_skip', { reason: 'no_users' });
      return { usersProcessed: 0, postsCreated: 0, errors: [] };
    }

    const nicheGroups = new Map();
    for (const user of users) {
      try {
        const settings = await supabase.getUserContentSettings(user.user_id);
        if (settings.generation_paused && !forceGenerate) {
          logger.automation('generate_job_user_skipped', { userId: user.user_id, reason: 'generation_paused' });
          continue;
        }
        const niche = settings.niche || 'tech';
        if (!nicheGroups.has(niche)) nicheGroups.set(niche, []);
        nicheGroups.get(niche).push({ user, settings });
      } catch (e) {
        logger.automation('generate_job_user_error', { userId: user.user_id, error: e.message });
        errors.push({ userId: user.user_id, error: e.message });
      }
    }

    for (const [niche, group] of nicheGroups) {
      if (!group.length) continue;
      const first = group[0];
      let articles = [];
      try {
        articles = await rss.fetchFeedsForUser(
          first.user.user_id,
          supabase.getUserRssFeeds,
          supabase.getDefaultFeedsForNiche,
          supabase.getUserContentSettings
        );
      } catch (e) {
        logger.automation('generate_job_rss_error', { niche, error: e.message });
        errors.push({ niche, error: e.message });
        continue;
      }
      const topArticles = (articles || []).slice(0, 1);
      logger.automation('generate_job_articles', { niche, articleCount: topArticles.length });
      if (!topArticles.length) continue;

      for (const article of topArticles) {
        for (const { user, settings } of group) {
          const userId = user.user_id;
          try {
            const result = await openai.generatePost(article, settings);
            if (!result) continue;
            const postId = await supabase.createPost(userId, {
              hook: result.headline_hook || result.hook || '',
              content: result.post_copy || result.content || '',
              hashtags: result.hashtags || [],
              hashtags_raw: result.hashtags || [],
              suggested_comments: result.suggested_comments || [],
              visual_prompt: result.visual_prompt || null,
              status: 'pending',
              posted: false,
            });
            if (postId) {
              postsCreated++;
              logger.automation('generate_job_post_created', { userId, postId });
            }

            // Auto-generate image only (no video). Prompt = post caption/content.
            const imagePrompt = openai.buildPromptFromPostContent(result.headline_hook || result.hook || '', result.post_copy || result.content || '') || openai.buildImagePromptFromVisual(result.visual_prompt);
            if (postId && imagePrompt && settings?.freepik_api_key?.trim()) {
              try {
                const prompt = imagePrompt;
                const imageUrl = await freepik.generateImage(settings.freepik_api_key.trim(), prompt, 'widescreen_16_9');
                if (imageUrl) {
                  const mediaUrl = await imageService.processAndUploadImage(userId, imageUrl);
                  if (mediaUrl) {
                    await supabase.updatePost(postId, {
                      media_url: mediaUrl,
                      has_media: true,
                      is_checked: true,
                      updated_at: new Date().toISOString(),
                    });
                  }
                }
              } catch (imgErr) {
                logger.automation('generate_job_image_error', { userId, postId, error: imgErr.message });
                errors.push({ userId, postId, action: 'generateImage', error: imgErr.message });
              }
              await sleep(3000);
            }

            usersProcessed++;
            await sleep(2000);
          } catch (e) {
            logger.automation('generate_job_post_error', { userId, action: 'generatePost', error: e.message });
            errors.push({ userId, action: 'generatePost', error: e.message });
          }
        }
      }
    }

    logger.automation('generate_job_done', { usersProcessed, postsCreated, errorCount: errors.length });
    return { usersProcessed, postsCreated, errors };
  } catch (e) {
    logger.automation('generate_job_fatal', { error: e.message });
    return { usersProcessed, postsCreated, errors: [...errors, { error: e.message }] };
  }
}
