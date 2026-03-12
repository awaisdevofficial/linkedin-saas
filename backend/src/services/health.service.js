import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'contact.awais.ai@gmail.com';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const ENDPOINTS = [
  { name: 'linkedin_feed', label: 'LinkedIn Feed API' },
  { name: 'linkedin_like', label: 'LinkedIn Like API' },
  { name: 'linkedin_comment', label: 'LinkedIn Comment API' },
  { name: 'linkedin_post', label: 'LinkedIn Post API' },
  { name: 'groq', label: 'Groq AI' },
  { name: 'supabase', label: 'Supabase DB' },
];

async function checkSupabase() {
  const start = Date.now();
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) return { status: 'down', error: error.message, ms: Date.now() - start };
    return { status: 'healthy', ms: Date.now() - start };
  } catch (e) {
    return { status: 'down', error: e.message, ms: Date.now() - start };
  }
}

async function checkGroq() {
  const start = Date.now();
  try {
    if (!process.env.GROQ_API_KEY) return { status: 'down', error: 'GROQ_API_KEY not set', ms: 0 };
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 8000,
    });
    if (res.status === 200) return { status: 'healthy', ms: Date.now() - start };
    return { status: 'degraded', error: `Status ${res.status}`, ms: Date.now() - start };
  } catch (e) {
    return { status: 'down', error: e.message, ms: Date.now() - start };
  }
}

async function checkLinkedInFeed(liAtCookie, csrfToken) {
  if (!liAtCookie) return { status: 'degraded', error: 'No li_at cookie to test', ms: 0 };
  const start = Date.now();
  try {
    const res = await axios.get('https://www.linkedin.com/voyager/api/feed/updatesV2', {
      params: { count: 1, start: 0, q: 'feed' },
      headers: {
        Cookie: `li_at=${liAtCookie}; JSESSIONID="${csrfToken || 'ajax:0'}"`,
        'csrf-token': csrfToken || 'ajax:0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-restli-protocol-version': '2.0.0',
        Referer: 'https://www.linkedin.com/feed/',
      },
      timeout: 10000,
    });
    if (res.status === 200) return { status: 'healthy', ms: Date.now() - start };
    return { status: 'degraded', error: `Status ${res.status}`, ms: Date.now() - start };
  } catch (e) {
    const status = e.response?.status;
    if (status === 401 || status === 403) return { status: 'down', error: 'Cookie expired or invalid', ms: Date.now() - start };
    return { status: 'down', error: e.message, ms: Date.now() - start };
  }
}

async function checkLinkedInPost(accessToken) {
  if (!accessToken || accessToken === 'cookie-auth') return { status: 'degraded', error: 'No access token to test', ms: 0 };
  const start = Date.now();
  try {
    const res = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000,
    });
    if (res.status === 200) return { status: 'healthy', ms: Date.now() - start };
    return { status: 'degraded', error: `Status ${res.status}`, ms: Date.now() - start };
  } catch (e) {
    const status = e.response?.status;
    if (status === 401) return { status: 'down', error: 'Access token expired', ms: Date.now() - start };
    return { status: 'down', error: e.message, ms: Date.now() - start };
  }
}

export async function runHealthCheck() {
  const supabase = getSupabase();
  const results = {};

  const { data: conn } = await supabase
    .from('linkedin_connections')
    .select('li_at_cookie, jsessionid, access_token')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const liAtCookie = conn?.li_at_cookie;
  const csrfToken = conn?.jsessionid;
  const accessToken = conn?.access_token;

  const [supabaseRes, groqRes, feedRes, postRes] = await Promise.all([
    checkSupabase(),
    checkGroq(),
    checkLinkedInFeed(liAtCookie, csrfToken),
    checkLinkedInPost(accessToken),
  ]);

  results.supabase = supabaseRes;
  results.groq = groqRes;
  results.linkedin_feed = feedRes;
  results.linkedin_post = postRes;
  results.linkedin_like = feedRes;
  results.linkedin_comment = feedRes;

  const rows = Object.entries(results).map(([endpoint, res]) => ({
    endpoint,
    status: res.status,
    response_ms: res.ms,
    error: res.error || null,
    checked_at: new Date().toISOString(),
  }));

  await supabase.from('system_health').insert(rows);

  const downEndpoints = Object.entries(results).filter(([, r]) => r.status === 'down');
  if (downEndpoints.length > 0) {
    try {
      const { sendAdminLinkedInDownEmail } = await import('./email.service.js');
      for (const [endpoint, res] of downEndpoints) {
        await sendAdminLinkedInDownEmail(ADMIN_EMAIL, endpoint, res.error || 'Unknown error');
      }
    } catch (e) {
      console.error('[health] Failed to send admin alert:', e.message);
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'health',
    action: 'healthCheck',
    results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.status])),
  }));

  return results;
}

export async function getLatestHealth() {
  const supabase = getSupabase();
  const endpoints = ['linkedin_feed', 'linkedin_like', 'linkedin_comment', 'linkedin_post', 'groq', 'supabase'];
  const results = {};

  for (const endpoint of endpoints) {
    const { data } = await supabase
      .from('system_health')
      .select('status, response_ms, error, checked_at')
      .eq('endpoint', endpoint)
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    results[endpoint] = data || { status: 'unknown', checked_at: null };
  }

  return results;
}

export async function checkAndUpdateCookieStatus(userId, liAtCookie, csrfToken) {
  const result = await checkLinkedInFeed(liAtCookie, csrfToken);
  const supabase = getSupabase();

  const cookieStatus = result.status === 'healthy' ? 'fresh'
    : result.error?.includes('Cookie expired') ? 'expired'
    : 'unknown';

  await supabase
    .from('linkedin_connections')
    .update({ cookie_status: cookieStatus, last_health_check: new Date().toISOString() })
    .eq('user_id', userId);

  if (cookieStatus === 'expired') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle();

      const { data: notifSettings } = await supabase
        .from('user_notification_settings')
        .select('cookie_expired_emails')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile && notifSettings?.cookie_expired_emails !== false) {
        const { sendCookieExpiredEmail } = await import('./email.service.js');
        await sendCookieExpiredEmail(profile.email, profile.full_name);
      }
    } catch (e) {
      console.error('[health] Cookie expired notification failed:', e.message);
    }
  }

  return { cookieStatus, result };
}
