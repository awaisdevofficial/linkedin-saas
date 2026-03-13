import * as supabase from '../services/supabase.service.js';
import * as promptService from '../services/prompt.service.js';
import * as groq from '../services/groq.service.js';
import * as linkedin from '../services/linkedin.service.js';
import * as feed from '../services/feed.service.js';
import { logger } from '../utils/logger.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Delay between like and comment on the same post (no time gap; comment right after like). */
const DELAY_LIKE_TO_COMMENT_MS = 5000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isInActiveWindow(settings) {
  if (!settings?.active_days?.length) return false;
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
  if (!settings.active_days.includes(dayName)) return false;
  const start = String(settings.active_start_time || '08:00').slice(0, 5);
  const end = String(settings.active_end_time || '20:00').slice(0, 5);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return timeStr >= start && timeStr <= end;
}

export async function runEngageJob() {
  const ts = new Date().toISOString();
  let engaged = 0;
  const errors = [];

  logger.automation('engage_job_start', { timestamp: ts });

  try {
    const users = await supabase.getAllActiveUsers();
    logger.automation('engage_job_users', { userCount: users.length });

    for (const user of users) {
      const userId = user.user_id;
      try {
        const settings = await supabase.getEngagementSettings(userId);
        if (!settings) continue;

        const inWindow = isInActiveWindow(settings);
        if (!inWindow) continue;

        const count = await supabase.getDailyEngagementCount(userId);
        if (count >= (settings.max_engagements_per_day || 50)) continue;

        logger.automation('engage_job_user_active', { userId, count, max: settings.max_engagements_per_day || 50 });

        const feedItems = await feed.fetchLinkedInFeed(user.li_at_cookie, user.csrfToken);
        const shuffled = shuffle(feedItems).slice(0, 5);

        const credentials = {
          accessToken: user.access_token,
          liAtCookie: user.li_at_cookie,
          personUrn: user.person_urn,
          csrfToken: user.csrfToken,
        };

        const rawMinutes = settings.engagement_interval_minutes ?? 15;
        const clampedMinutes = Math.min(10080, Math.max(15, Number(rawMinutes) || 15));
        const intervalMs = clampedMinutes * 60 * 1000;

        for (const item of shuffled) {
          const currentCount = await supabase.getDailyEngagementCount(userId);
          if (currentCount >= (settings.max_engagements_per_day || 50)) break;

          let justLikedThisPost = false;

          try {
            if (settings.auto_liking) {
              const alreadyLiked = await supabase.hasEngaged(userId, item.activity_id, 'like');
              if (!alreadyLiked) {
                const likeResult = await linkedin.likePost(credentials, item.activity_id);
                if (!likeResult?.error && !likeResult?.skipped) {
                  // Store the confirmed activity URN from like response for use in commenting
                  if (likeResult?.confirmedUrn) {
                    item._confirmedActivityUrn = likeResult.confirmedUrn;
                  }
                  await supabase.logEngagement(userId, {
                    action: 'like',
                    post_uri: item.uri,
                    activity_id: item.activity_id,
                    post_content: item.description ?? null,
                    author_urn: item.author_urn || null,
                    author_name: item.author_name || null,
                    author_headline: item.author_headline || null,
                    author_profile_url: item.author_profile_url || null,
                    status: 'completed',
                  });
                  engaged++;
                  justLikedThisPost = true;
                  logger.automation('engage_job_liked', { userId, activityId: item.activity_id });
                } else if (likeResult?.skipped) {
                  await supabase.logEngagement(userId, {
                    action: 'like',
                    post_uri: item.uri,
                    activity_id: item.activity_id,
                    post_content: item.description ?? null,
                    author_urn: item.author_urn || null,
                    author_name: item.author_name || null,
                    author_headline: item.author_headline || null,
                    author_profile_url: item.author_profile_url || null,
                    status: 'skipped',
                  });
                }
              }
            }

            // Comment on the same post 5 sec after like so both happen on one post with no visible time gap
            if (justLikedThisPost && settings.auto_commenting) {
              await sleep(DELAY_LIKE_TO_COMMENT_MS);
            }

            if (settings.auto_commenting) {
              const alreadyCommented = await supabase.hasEngaged(userId, item.activity_id, 'comment');
              if (!alreadyCommented) {
                const userSettings = await supabase.getUserContentSettings(userId);
                const niche = userSettings?.niche || 'all';

                let builtPrompt = settings.comment_prompt?.trim();
                if (!builtPrompt) {
                  const template = await supabase.getPromptTemplate('comment', niche);
                  builtPrompt = template
                    ? promptService.buildCommentPrompt(userSettings, template.prompt)
                    : 'Write a short, genuine, professional LinkedIn comment (max 15 words). No emojis. No hashtags. Return only the comment text.';
                }

                const commentText = await groq.generateComment(item.description, builtPrompt);
                if (commentText?.trim()) {
                  // Use confirmed URN from like response if available, otherwise fall back to activityId
                  const urnToComment = item._confirmedActivityUrn || item.activity_id;
                  const commentResult = await linkedin.commentOnPost(credentials, urnToComment, commentText.trim());
                  if (commentResult?.postUnavailable) {
                    await supabase.logEngagement(userId, {
                      action: 'comment',
                      post_uri: item.uri,
                      activity_id: item.activity_id,
                      comment_text: commentText.trim(),
                      post_content: item.description ?? null,
                      author_urn: item.author_urn || null,
                      author_name: item.author_name || null,
                      author_headline: item.author_headline || null,
                      author_profile_url: item.author_profile_url || null,
                      status: 'post_unavailable',
                    });
                    logger.automation('engage_job_post_unavailable', { userId, activityId: item.activity_id });
                  } else {
                    await supabase.logEngagement(userId, {
                      action: 'comment',
                      post_uri: item.uri,
                      activity_id: item.activity_id,
                      comment_text: commentText.trim(),
                      post_content: item.description ?? null,
                      author_urn: item.author_urn || null,
                      author_name: item.author_name || null,
                      author_headline: item.author_headline || null,
                      author_profile_url: item.author_profile_url || null,
                      status: 'completed',
                    });
                    engaged++;
                    logger.automation('engage_job_commented', { userId, activityId: item.activity_id, usedConfirmedUrn: !!item._confirmedActivityUrn });
                  }
                }
              }
            }
          } catch (e) {
            logger.automation('engage_job_item_error', { userId, postUri: item.uri, error: e.message });
            errors.push({ userId, action: 'engage', postUri: item.uri, error: e.message });
          }
        }
      } catch (e) {
        logger.automation('engage_job_user_error', { userId, error: e.message });
        errors.push({ userId, action: 'engage', error: e.message });
      }
    }

    logger.automation('engage_job_done', { usersProcessed: users.length, totalEngagements: engaged, errorCount: errors.length });
    return { usersProcessed: users.length, totalEngagements: engaged, errors };
  } catch (e) {
    logger.automation('engage_job_fatal', { error: e.message });
    return { usersProcessed: 0, totalEngagements: 0, errors: [...errors, { error: e.message }] };
  }
}
