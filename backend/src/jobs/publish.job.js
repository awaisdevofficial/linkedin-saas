import * as supabase from '../services/supabase.service.js';
import * as linkedin from '../services/linkedin.service.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shouldPostNow(schedules) {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5);
  for (const s of schedules || []) {
    if (!s.enabled || s.day !== dayName) continue;
    const slots = s.time_slots || [];
    for (const timeSlot of slots) {
      const slot = String(timeSlot).slice(0, 5);
      const [sh, sm] = slot.split(':').map(Number);
      const [ch, cm] = currentTime.split(':').map(Number);
      const diffMins = Math.abs((ch * 60 + cm) - (sh * 60 + sm));
      if (diffMins <= 5) return true;
    }
  }
  return false;
}

export async function runPublishJob() {
  let published = 0;
  const errors = [];

  try {
    const users = await supabase.getAllActiveUsers();

    for (const user of users) {
      const userId = user.user_id;
      try {
        const schedules = await supabase.getUserSchedule(userId);
        if (!shouldPostNow(schedules)) continue;

        const posts = await supabase.getReadyToPublishPosts(userId);
        const post = posts?.[0];
        if (!post) continue;

        const credentials = {
          accessToken: user.access_token,
          liAtCookie: user.li_at_cookie,
          personUrn: user.person_urn,
        };

        const postUrn = await linkedin.postToLinkedIn(credentials, {
          hook: post.hook,
          content: post.content,
          hashtags: post.hashtags || [],
          mediaUrl: post.media_url || null,
        });

        await supabase.updatePost(post.id, {
          posted: true,
          status: 'posted',
          posted_at: new Date().toISOString(),
          linkedin_post_id: postUrn,
        });
        published++;

        await sleep(120000);

        const suggestedComments = post.suggested_comments || [];
        for (let i = 0; i < Math.min(3, suggestedComments.length); i++) {
          try {
            await linkedin.commentOnPost(credentials, postUrn, suggestedComments[i]);
            await sleep(60000);
          } catch (_) {}
        }
      } catch (e) {
        errors.push({ userId, action: 'publish', error: e.message });
      }
    }

    return { published, errors };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), job: 'publish', error: e.message }));
    return { published: 0, errors: [...errors, { error: e.message }] };
  }
}
