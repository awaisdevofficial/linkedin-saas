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
          csrfToken: user.csrfToken,
        };

        for (const post of postedPosts) {
          const postUrn = post.linkedin_post_id;

          let comments = [];
          let activityUrn = null;
          try {
            const result = await linkedin.getPostComments(credentials, postUrn);
            comments = result.comments || [];
            activityUrn = result.activityUrn;
          } catch (e) {
            errors.push({ userId, postId: post.id, error: e.message });
            continue;
          }

          const cutoff = Date.now() - CUTOFF_MS;

          if (comments.length > 0) {
            console.log(JSON.stringify({ action: 'replyJob', postId: post.id, commentCount: comments.length }));
          }

          for (const comment of comments) {
            if (comment.authorUrn === user.person_urn) continue;

            const created = comment.createdAt ? new Date(comment.createdAt).getTime() : 0;
            if (created < cutoff) continue;

            const already = await supabase.hasReplied(userId, comment.commentUrn);
            if (already) continue;

            try {
              if (!activityUrn) {
                errors.push({ userId, commentUrn: comment.commentUrn, error: 'No activityUrn from getPostComments' });
                continue;
              }

              const userSettings = await supabase.getUserContentSettings(userId);
              const template = await supabase.getPromptTemplate('reply', userSettings?.niche || 'all');
              const prompt = template
                ? promptService.buildReplyPrompt(userSettings, template.prompt, post.content, comment.text)
                : `Reply to this LinkedIn comment on my post in one short, genuine, friendly sentence. No emojis. No hashtags. Comment: "${comment.text}". Return only the reply text.`;

              const replyText = await openai.generateReply(prompt);

              const delay = 60000 + Math.random() * 60000; // 1-2 min production delay
              await new Promise((r) => setTimeout(r, delay));

              await linkedin.replyToComment(credentials, activityUrn, comment.commentUrn, replyText);
              await supabase.logReply(userId, {
                post_id: post.id,
                post_uri: postUrn,
                comment_urn: comment.commentUrn,
                comment_text: comment.text,
                reply_text: replyText,
                status: 'completed',
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
