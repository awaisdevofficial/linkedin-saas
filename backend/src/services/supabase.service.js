import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;
if (url && key) {
  client = createClient(url, key);
}

export function getClient() {
  if (!client) throw new Error('Supabase client not initialized: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return client;
}

export async function getAllActiveUsers() {
  try {
    const supabase = getClient();
    const { data: conn, error: connErr } = await supabase
      .from('linkedin_connections')
      .select('user_id, access_token, li_at_cookie, person_urn, jsessionid, is_active')
      .eq('is_active', true);
    if (connErr) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getAllActiveUsers', error: connErr.message }));
      return [];
    }
    if (!conn?.length) return [];
    return conn.map((c) => ({
      user_id: c.user_id,
      access_token: c.access_token || 'cookie-auth',
      li_at_cookie: c.li_at_cookie || '',
      person_urn: c.person_urn || '',
      csrfToken: c.jsessionid || undefined,
      is_active: c.is_active,
    }));
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getAllActiveUsers', error: e.message }));
    return [];
  }
}

export async function getUserContentSettings(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_content_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getUserContentSettings', userId, error: error.message }));
      return {
        niche: 'tech',
        post_tone: 'authoritative',
        use_default_post_prompt: true,
        use_default_comment_prompt: true,
        use_default_reply_prompt: true,
        cta_style: 'dm',
        custom_keywords: [],
        topics_to_avoid: [],
        enable_post_comment: true,
      };
    }
    if (!data) {
      return {
        niche: 'tech',
        post_tone: 'authoritative',
        comment_tone: 'thoughtful',
        use_default_post_prompt: true,
        use_default_comment_prompt: true,
        use_default_reply_prompt: true,
        cta_style: 'dm',
        custom_keywords: [],
        topics_to_avoid: [],
        target_audience: null,
        brand_voice_description: null,
        custom_post_prompt: null,
        custom_comment_prompt: null,
        custom_reply_prompt: null,
        custom_cta: null,
        generation_paused: false,
        enable_post_comment: true,
      };
    }
    return { ...data, generation_paused: data.generation_paused === true, enable_post_comment: data.enable_post_comment !== false, kie_api_key: data.kie_api_key || null };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getUserContentSettings', userId, error: e.message }));
    return {
      niche: 'tech',
      post_tone: 'authoritative',
      comment_tone: 'thoughtful',
      use_default_post_prompt: true,
      use_default_comment_prompt: true,
      use_default_reply_prompt: true,
      cta_style: 'dm',
      custom_keywords: [],
      topics_to_avoid: [],
      target_audience: null,
      brand_voice_description: null,
      custom_post_prompt: null,
      custom_comment_prompt: null,
      custom_reply_prompt: null,
      custom_cta: null,
      generation_paused: false,
      enable_post_comment: true,
    };
  }
}

export async function getUserRssFeeds(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('user_rss_feeds')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getUserRssFeeds', userId, error: e.message }));
    return [];
  }
}

export async function getDefaultFeedsForNiche(niche) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('niche_rss_feeds')
      .select('*')
      .eq('niche', niche)
      .eq('is_active', true);
    if (error) return [];
    return (data || []).map((r) => ({ feed_url: r.url, label: r.label, url: r.url }));
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getDefaultFeedsForNiche', niche, error: e.message }));
    return [];
  }
}

export async function updateUserContentSetting(userId, field, value) {
  try {
    const supabase = getClient();
    const { data: existing } = await supabase.from('user_content_settings').select('*').eq('user_id', userId).maybeSingle();
    const payload = { user_id: userId, [field]: value, updated_at: new Date().toISOString() };
    if (existing) {
      Object.keys(existing).forEach((k) => {
        if (payload[k] === undefined && existing[k] !== undefined) payload[k] = existing[k];
      });
    }
    const { error } = await supabase.from('user_content_settings').upsert(payload, { onConflict: 'user_id' });
    return !error;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'updateUserContentSetting', userId, error: e.message }));
    return false;
  }
}

export async function getPromptTemplate(type, niche) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('type', type)
      .or(`niche.eq.${niche},niche.eq.all`)
      .eq('is_default', true)
      .limit(1);
    if (error || !data?.length) return null;
    return data[0];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getPromptTemplate', type, niche, error: e.message }));
    return null;
  }
}

export async function getPostsByStatus(userId, status) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getPostsByStatus', userId, status, error: e.message }));
    return [];
  }
}

export async function getUserSchedule(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getUserSchedule', userId, error: e.message }));
    return [];
  }
}

export async function getEngagementSettings(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('engagement_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;

    // Apply defaults for interval columns if not set by user
    return {
      ...data,
      auto_liking: data.auto_liking !== false,
      auto_commenting: data.auto_commenting !== false,
      auto_replying: data.auto_replying !== false,
      engagement_interval_minutes: data.engagement_interval_minutes ?? 30,
      reply_interval_minutes: data.reply_interval_minutes ?? 30,
      reply_to_reply_interval_minutes: data.reply_to_reply_interval_minutes ?? 60,
      max_engagements_per_day: data.max_engagements_per_day ?? 50,
    };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getEngagementSettings', userId, error: e.message }));
    return null;
  }
}

export async function getPendingMediaPosts(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .is('media_url', null)
      .eq('is_checked', false);
    if (error) return [];
    return (data || []).filter((p) => p.visual_prompt != null || (p.hook && String(p.hook).trim()) || (p.content && String(p.content).trim()));
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getPendingMediaPosts', userId, error: e.message }));
    return [];
  }
}

export async function getReadyToPublishPosts(userId) {
  try {
    const supabase = getClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ready_to_post')
      .eq('posted', false)
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(1);
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getReadyToPublishPosts', userId, error: e.message }));
    return [];
  }
}

/** Get approved posts (not posted) for daily random scheduling. Excludes posts already scheduled for today. */
export async function getApprovedPostsForDailySchedule(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('posted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getApprovedPostsForDailySchedule', userId, error: e.message }));
    return [];
  }
}

/** Check if user already has a post scheduled for today (ready_to_post, scheduled_at today, not yet posted). */
export async function hasPostScheduledForToday(userId) {
  try {
    const supabase = getClient();
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'ready_to_post')
      .eq('posted', false)
      .gte('scheduled_at', dayStart.toISOString())
      .lt('scheduled_at', dayEnd.toISOString())
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch (e) {
    return false;
  }
}

export async function getPostedPosts(userId) {
  try {
    const supabase = getClient();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 7);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('posted', true)
      .gte('posted_at', since.toISOString())
      .order('posted_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getPostedPosts', userId, error: e.message }));
    return [];
  }
}

export async function createPost(userId, postData) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: userId, ...postData, status: 'pending' })
      .select('id')
      .single();
    if (error) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'createPost', userId, error: error.message }));
      return null;
    }
    return data?.id;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'createPost', userId, error: e.message }));
    return null;
  }
}

export async function getPostByIdAndUser(postId, userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getPostByIdAndUser', postId, error: e.message }));
    return null;
  }
}

export async function getConnectionByUserId(userId) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('linkedin_connections')
      .select('access_token, li_at_cookie, person_urn, jsessionid')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return null;
    return {
      accessToken: data.access_token || 'cookie-auth',
      liAtCookie: data.li_at_cookie || '',
      personUrn: data.person_urn || '',
      csrfToken: data.jsessionid || undefined,
    };
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getConnectionByUserId', userId, error: e.message }));
    return null;
  }
}

export async function updatePost(postId, fields) {
  try {
    const supabase = getClient();
    const { error } = await supabase.from('posts').update(fields).eq('id', postId);
    if (error) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'updatePost', postId, error: error.message }));
      return false;
    }
    return true;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'updatePost', postId, error: e.message }));
    return false;
  }
}

export async function logEngagement(userId, data) {
  try {
    const supabase = getClient();
    await supabase.from('engagement_logs').insert({
      user_id: userId,
      post_uri: data.post_uri,
      activity_id: data.activity_id ?? null,
      action: data.action,
      comment_text: data.comment_text ?? null,
      post_content: data.post_content ?? null,
      status: data.status ?? 'completed',
      executed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'logEngagement', userId, error: e.message }));
  }
}

export async function logReply(userId, data) {
  try {
    const supabase = getClient();
    await supabase.from('comment_replies').insert({
      user_id: userId,
      post_id: data.post_id ?? null,
      post_uri: data.post_uri,
      comment_urn: data.comment_urn,
      comment_text: data.comment_text ?? null,
      reply_text: data.reply_text,
      status: data.status ?? 'completed',
    });
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'logReply', userId, error: e.message }));
  }
}

export async function hasReplied(userId, commentUrn) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('comment_replies')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_urn', commentUrn)
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch (e) {
    return false;
  }
}

/** Returns true if this user already performed this action on this activity (e.g. like or comment). */
export async function hasEngaged(userId, activityId, action) {
  if (!userId || !activityId || !action) return false;
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('engagement_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_id', String(activityId))
      .eq('action', action)
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'hasEngaged', userId, activityId, action, error: e.message }));
    return false;
  }
}

export async function getDailyEngagementCount(userId) {
  try {
    const supabase = getClient();
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const startIso = start.toISOString();
    const { count, error } = await supabase
      .from('engagement_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('executed_at', startIso);
    if (error) {
      // Fallback if executed_at missing: use created_at
      const { count: c2, error: e2 } = await supabase
        .from('engagement_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startIso);
      return e2 ? 0 : (c2 ?? 0);
    }
    return count ?? 0;
  } catch (e) {
    return 0;
  }
}

/** Get active users with engagement_settings where auto_liking or auto_commenting is true (for Like&Comment webhook). */
export async function getUsersWithAutoLikeCommentEnabled() {
  try {
    const supabase = getClient();
    const { data: conns, error: connErr } = await supabase
      .from('linkedin_connections')
      .select('user_id, access_token, li_at_cookie, person_urn, jsessionid')
      .eq('is_active', true);
    if (connErr || !conns?.length) return [];

    const { data: settingsRows, error: setErr } = await supabase
      .from('engagement_settings')
      .select('user_id, auto_liking, auto_commenting, engagement_interval_minutes, webhook_last_sent_at, comment_prompt, max_engagements_per_day');
    if (setErr) return [];

    const settingsByUser = new Map((settingsRows || []).map((s) => [s.user_id, s]));
    const result = [];
    for (const c of conns) {
      const settings = settingsByUser.get(c.user_id);
      if (!settings) continue;
      const autoLike = settings.auto_liking !== false;
      const autoComment = settings.auto_commenting !== false;
      if (!autoLike && !autoComment) continue;
      result.push({
        user_id: c.user_id,
        access_token: c.access_token || 'cookie-auth',
        li_at_cookie: c.li_at_cookie || '',
        person_urn: c.person_urn || '',
        csrfToken: c.jsessionid || undefined,
        auto_liking: autoLike,
        auto_commenting: autoComment,
        engagement_interval_minutes: settings.engagement_interval_minutes ?? 30,
        webhook_last_sent_at: settings.webhook_last_sent_at ?? null,
        comment_prompt: settings.comment_prompt ?? null,
        active_days: settings.active_days ?? [],
        active_start_time: (settings.active_start_time ?? '08:00').toString().slice(0, 5),
        active_end_time: (settings.active_end_time ?? '20:00').toString().slice(0, 5),
        max_engagements_per_day: settings.max_engagements_per_day ?? 50,
      });
    }
    return result;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'getUsersWithAutoLikeCommentEnabled', error: e.message }));
    return [];
  }
}

/** Update webhook_last_sent_at for a user (after sending to Like&Comment webhook). */
export async function updateWebhookLastSent(userId) {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('engagement_settings')
      .update({ webhook_last_sent_at: new Date().toISOString() })
      .eq('user_id', userId);
    return !error;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'supabase', action: 'updateWebhookLastSent', userId, error: e.message }));
    return false;
  }
}
