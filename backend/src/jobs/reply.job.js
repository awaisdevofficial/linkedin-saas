import * as supabase from '../services/supabase.service.js';
import * as promptService from '../services/prompt.service.js';
import * as openai from '../services/openai.service.js';
import * as linkedin from '../services/linkedin.service.js';

const CUTOFF_MS = 48 * 60 * 60 * 1000;

export async function runReplyJob() {
  const ts = new Date().toISOString();
  let replied = 0;
  const errors = [];

  try {
    const users = await supabase.getAllActiveUsers();

    for (const user of users) {
      const userId = user.user_id;
      try {
        const settings = await supabase.getEngagementSettings(userId);
        if (!settings?.auto_replying) continue;

        const postedPosts = await supabase.getPostedPosts(userId);
        const credentials = {
          accessToken: user.access_token,
          liAtCookie: user.li_at_cookie,
          personUrn: user.person_urn,
        };

        for (const post of postedPosts) {
          const postUrn = post.linkedin_post_id;
          // Skip share URNs — comments API doesn't accept them (needs urn:li:ugcPost:)
          if (!postUrn || postUrn.includes('urn:li:share:')) continue;

          let comments = [];
          try {
            comments = await linkedin.getPostComments(credentials, postUrn);
          } catch (e) {
            errors.push({ userId, postId: post.id, error: e.message });
            continue;
          }

          const cutoff = Date.now() - CUTOFF_MS;

          for (const comment of comments) {
            if (comment.authorUrn === user.person_urn) continue;
            const created = comment.createdAt ? new Date(comment.createdAt).getTime() : 0;
            if (created < cutoff) continue;

            const already = await supabase.hasReplied(userId, comment.commentUrn);
            if (already) continue;

            try {
              const userSettings = await supabase.getUserContentSettings(userId);
              const template = await supabase.getPromptTemplate('reply', userSettings.niche || 'all');
              const builtPrompt = template
                ? promptService.buildReplyPrompt(userSettings, template.prompt, post.content, comment.text)
                : `Reply to this comment on my post. Post: ${(post.content || '').slice(0, 200)}. Comment: ${comment.text}. Max 20 words. Return only the reply.`;

              const replyText = await openai.generateReply(builtPrompt);
              const delay = 60000 + Math.random() * 60000;
              await new Promise((r) => setTimeout(r, delay));

              await linkedin.replyToComment(credentials, postUrn, comment.commentUrn, replyText);
              await supabase.logReply(userId, {
                post_id: post.id,
                post_uri: postUrn,
                comment_urn: comment.commentUrn,
                comment_text: comment.text,
                reply_text: replyText,
                status: 'success',
              });
              replied++;
            } catch (e) {
              errors.push({ userId, commentUrn: comment.commentUrn, error: e.message });
            }
          }
        }
      } catch (e) {
        errors.push({ userId, action: 'reply', error: e.message });
      }
    }

    console.log(JSON.stringify({ timestamp: new Date().toISOString(), job: 'reply', replied, errors }));
    return { replied, errors };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), job: 'reply', status: 'error', error: e.message }));
    return { replied: 0, errors: [...errors, { error: e.message }] };
  }
}
