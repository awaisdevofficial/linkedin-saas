import * as supabase from '../services/supabase.service.js';
import * as linkedin from '../services/linkedin.service.js';
import { logger } from '../utils/logger.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runPublishJob() {
  let published = 0;
  const errors = [];

  logger.automation('publish_job_start');

  try {
    const users = await supabase.getAllActiveUsers();
    logger.automation('publish_job_users', { userCount: users.length });

    for (const user of users) {
      const userId = user.user_id;
      try {
        const posts = await supabase.getReadyToPublishPosts(userId);
        const post = posts?.[0];
        if (!post) continue;

        logger.automation('publish_job_publishing', { userId, postId: post.id });

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
        logger.automation('publish_job_published', { userId, postId: post.id, postUrn });

        await sleep(120000);

        const suggestedComments = post.suggested_comments || [];
        for (let i = 0; i < Math.min(3, suggestedComments.length); i++) {
          try {
            await linkedin.commentOnPost(credentials, postUrn, suggestedComments[i]);
            await sleep(60000);
          } catch (_) {}
        }
      } catch (e) {
        logger.automation('publish_job_user_error', { userId, error: e.message });
        errors.push({ userId, action: 'publish', error: e.message });
      }
    }

    logger.automation('publish_job_done', { published, errorCount: errors.length });
    return { published, errors };
  } catch (e) {
    logger.automation('publish_job_fatal', { error: e.message });
    return { published: 0, errors: [...errors, { error: e.message }] };
  }
}
