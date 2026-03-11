import * as supabase from '../services/supabase.service.js';
import * as openai from '../services/openai.service.js';
import * as rss from '../services/rss.service.js';
import * as imageService from '../services/image.service.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runGenerateJob(optionUserId = null) {
  const ts = new Date().toISOString();
  let usersProcessed = 0;
  let postsCreated = 0;
  const errors = [];

  try {
    let users = await supabase.getAllActiveUsers();
    if (optionUserId) users = users.filter((u) => u.user_id === optionUserId);
    if (!users.length) {
      return { usersProcessed: 0, postsCreated: 0, errors: [] };
    }

    const nicheGroups = new Map();
    for (const user of users) {
      try {
        const settings = await supabase.getUserContentSettings(user.user_id);
        if (settings.generation_paused) continue;
        const niche = settings.niche || 'tech';
        if (!nicheGroups.has(niche)) nicheGroups.set(niche, []);
        nicheGroups.get(niche).push({ user, settings });
      } catch (e) {
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
        errors.push({ niche, error: e.message });
        continue;
      }
      const topArticles = (articles || []).slice(0, 1);
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
            if (postId) postsCreated++;

            // Generate and attach image so user sees post + picture together
            if (postId && result.visual_prompt) {
              try {
                const imageUrl = await openai.generateImage(result.visual_prompt);
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
                errors.push({ userId, postId, action: 'generateImage', error: imgErr.message });
              }
              await sleep(3000);
            }

            usersProcessed++;
            await sleep(2000);
          } catch (e) {
            errors.push({ userId, action: 'generatePost', error: e.message });
          }
        }
      }
    }

    return { usersProcessed, postsCreated, errors };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), job: 'generate', error: e.message }));
    return { usersProcessed, postsCreated, errors: [...errors, { error: e.message }] };
  }
}
