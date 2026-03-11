import * as supabase from '../services/supabase.service.js';
import * as openai from '../services/openai.service.js';
import * as imageService from '../services/image.service.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runMediaJob() {
  let processed = 0;
  const errors = [];

  try {
    const users = await supabase.getAllActiveUsers();
    const ts = () => new Date().toISOString();

    for (const user of users) {
      const userId = user.user_id;
      try {
        const posts = await supabase.getPendingMediaPosts(userId);
        console.log(JSON.stringify({ timestamp: ts(), job: 'media', userId, pendingCount: posts?.length ?? 0 }));

        for (const post of posts) {
          try {
            console.log(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, step: 'generateImage' }));
            const imageUrl = await openai.generateImage(post.visual_prompt);
            if (!imageUrl) {
              console.log(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, step: 'generateImage', result: 'skipped_null' }));
              continue;
            }

            console.log(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, step: 'processAndUploadImage' }));
            const mediaUrl = await imageService.processAndUploadImage(userId, imageUrl);
            if (!mediaUrl) {
              console.log(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, step: 'processAndUploadImage', result: 'skipped_null' }));
              continue;
            }

            console.log(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, step: 'updatePost', mediaUrl }));
            await supabase.updatePost(post.id, {
              media_url: mediaUrl,
              status: 'ready_to_post',
              is_checked: true,
              has_media: true,
              updated_at: new Date().toISOString(),
            });
            processed++;
            await sleep(5000);
          } catch (e) {
            console.error(JSON.stringify({ timestamp: ts(), job: 'media', postId: post.id, error: e.message }));
            errors.push({ userId, postId: post.id, error: e.message });
          }
        }
      } catch (e) {
        console.error(JSON.stringify({ timestamp: ts(), job: 'media', userId, action: 'getPendingMediaPosts', error: e.message }));
        errors.push({ userId, action: 'getPendingMediaPosts', error: e.message });
      }
    }

    return { processed, errors };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), job: 'media', error: e.message }));
    return { processed, errors: [...errors, { error: e.message }] };
  }
}
