import * as supabase from '../services/supabase.service.js';
import * as promptService from '../services/prompt.service.js';
import * as openai from '../services/openai.service.js';
import * as linkedin from '../services/linkedin.service.js';
import * as feed from '../services/feed.service.js';

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
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
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

  try {
    const users = await supabase.getAllActiveUsers();

    for (const user of users) {
      const userId = user.user_id;
      try {
        const settings = await supabase.getEngagementSettings(userId);
        if (!settings) continue;
        if (!isInActiveWindow(settings)) continue;

        const count = await supabase.getDailyEngagementCount(userId);
        if (count >= (settings.max_engagements_per_day || 50)) continue;

        const feedItems = await feed.fetchLinkedInFeed(user.li_at_cookie);
        const shuffled = shuffle(feedItems).slice(0, 5);

        const credentials = {
          accessToken: user.access_token,
          liAtCookie: user.li_at_cookie,
          personUrn: user.person_urn,
        };

        const intervalMs = (settings.engagement_interval_minutes || 15) * 60 * 1000;

        for (const item of shuffled) {
          const currentCount = await supabase.getDailyEngagementCount(userId);
          if (currentCount >= (settings.max_engagements_per_day || 50)) break;

          try {
            if (settings.auto_liking) {
              const likeResult = await linkedin.likePost(credentials, item.activity_id);
              await supabase.logEngagement(userId, {
                action: 'like',
                post_uri: item.uri,
                activity_id: item.activity_id,
                status: likeResult?.skipped ? 'skipped' : 'completed',
              });
              if (!likeResult?.error) engaged++;
              await new Promise((r) => setTimeout(r, intervalMs));
            }

            if (settings.auto_commenting) {
              const userSettings = await supabase.getUserContentSettings(userId);
              const template = await supabase.getPromptTemplate('comment', userSettings.niche || 'all');
              const builtPrompt = template ? promptService.buildCommentPrompt(userSettings, template.prompt) : 'Generate a short professional LinkedIn comment (max 15 words). Return only the comment.';
              const commentText = await openai.generateComment(item.description, builtPrompt);
              await linkedin.commentOnPost(credentials, item.uri, commentText);
              await supabase.logEngagement(userId, {
                action: 'comment',
                post_uri: item.uri,
                activity_id: item.activity_id,
                comment_text: commentText,
                status: 'completed',
              });
              engaged++;
              await new Promise((r) => setTimeout(r, intervalMs));
            }
          } catch (e) {
            errors.push({ userId, action: 'engage', postUri: item.uri, error: e.message });
          }
        }
      } catch (e) {
        errors.push({ userId, action: 'engage', error: e.message });
      }
    }

    return { usersProcessed: users.length, totalEngagements: engaged, errors };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), job: 'engage', error: e.message }));
    return { usersProcessed: 0, totalEngagements: 0, errors: [...errors, { error: e.message }] };
  }
}
