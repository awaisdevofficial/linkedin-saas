// Media job disabled — media generation is now user-controlled via PostsActivity buttons
// Users click the image/video icon on a post to generate media manually
// This file is kept to avoid import errors

export async function runMediaJob() {
  return { skipped: true, reason: 'media_job_disabled_user_controlled' };
}
