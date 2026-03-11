export function getCTAText(userSettings) {
  const style = userSettings?.cta_style || 'dm';
  const custom = userSettings?.custom_cta;
  switch (style) {
    case 'dm':
      return 'Want to discuss? Send me a DM.';
    case 'comment':
      return 'What do you think? Drop a comment.';
    case 'follow':
      return 'Follow for more insights.';
    case 'newsletter':
      return 'Subscribe to my newsletter.';
    case 'custom':
      return custom || "Let's connect.";
    default:
      return "Let's connect.";
  }
}

export function buildPostPrompt(userSettings, templatePrompt) {
  if (userSettings.use_default_post_prompt === false && userSettings.custom_post_prompt) {
    return userSettings.custom_post_prompt;
  }
  let prompt = templatePrompt;
  prompt = prompt.replace(/\{target_audience\}/g, userSettings.target_audience || 'professionals and founders');
  prompt = prompt.replace(/\{brand_voice\}/g, userSettings.brand_voice_description || 'authoritative and direct');
  prompt = prompt.replace(/\{keywords\}/g, (userSettings.custom_keywords && userSettings.custom_keywords.length) ? userSettings.custom_keywords.join(', ') : 'none specified');
  prompt = prompt.replace(/\{topics_to_avoid\}/g, (userSettings.topics_to_avoid && userSettings.topics_to_avoid.length) ? userSettings.topics_to_avoid.join(', ') : 'none');
  prompt = prompt.replace(/\{cta_style\}/g, getCTAText(userSettings));
  return prompt;
}

export function buildCommentPrompt(userSettings, templatePrompt) {
  if (userSettings.use_default_comment_prompt === false && userSettings.custom_comment_prompt) {
    return userSettings.custom_comment_prompt;
  }
  let prompt = templatePrompt;
  prompt = prompt.replace(/\{comment_tone\}/g, userSettings.comment_tone || 'thoughtful');
  return prompt;
}

export function buildReplyPrompt(userSettings, templatePrompt, postContent, commentText) {
  if (userSettings.use_default_reply_prompt === false && userSettings.custom_reply_prompt) {
    return userSettings.custom_reply_prompt
      .replace(/\{post_content\}/g, postContent || '')
      .replace(/\{comment_text\}/g, commentText || '')
      .replace(/\{reply_tone\}/g, userSettings.comment_tone || 'professional');
  }
  let prompt = templatePrompt;
  prompt = prompt.replace(/\{post_content\}/g, postContent || '');
  prompt = prompt.replace(/\{comment_text\}/g, commentText || '');
  prompt = prompt.replace(/\{reply_tone\}/g, userSettings.comment_tone || 'professional');
  return prompt;
}
