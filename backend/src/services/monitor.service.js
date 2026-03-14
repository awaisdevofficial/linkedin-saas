import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const errorCounts = new Map();
const ERROR_SPIKE_THRESHOLD = 3;
const ERROR_SPIKE_WINDOW_MS = 60 * 60 * 1000;

export async function logError(userId, { job, endpoint, error, details }) {
  try {
    const supabase = getSupabase();
    await supabase.from('system_errors').insert({
      user_id: userId || null,
      job: job || null,
      endpoint: endpoint || null,
      error: String(error),
      details: details || null,
      resolved: false,
      created_at: new Date().toISOString(),
    });

    if (endpoint) {
      const key = `${userId || 'system'}:${endpoint}`;
      const now = Date.now();
      const existing = errorCounts.get(key);

      if (!existing || now - existing.firstAt > ERROR_SPIKE_WINDOW_MS) {
        errorCounts.set(key, { count: 1, firstAt: now });
      } else {
        existing.count++;
        if (existing.count >= ERROR_SPIKE_THRESHOLD) {
          errorCounts.delete(key);
          await handleErrorSpike(userId, endpoint, error);
        }
      }
    }
  } catch (e) {
    console.error('[monitor] logError failed:', e.message);
  }
}

async function handleErrorSpike(userId, endpoint, error) {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'monitor',
    action: 'errorSpike',
    userId,
    endpoint,
    error,
  }));

  if (endpoint?.includes('linkedin') && userId) {
    try {
      const supabase = getSupabase();
      const { data: conn } = await supabase
        .from('linkedin_connections')
        .select('li_at_cookie, jsessionid')
        .eq('user_id', userId)
        .maybeSingle();

      if (conn?.li_at_cookie) {
        const { checkAndUpdateCookieStatus } = await import('./health.service.js');
        await checkAndUpdateCookieStatus(userId, conn.li_at_cookie, conn.jsessionid);
      }
    } catch (e) {
      console.error('[monitor] handleErrorSpike cookie check failed:', e.message);
    }
  }
}

export async function getRecentErrors(limit = 50) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('system_errors')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function resolveError(errorId) {
  try {
    const supabase = getSupabase();
    await supabase
      .from('system_errors')
      .update({ resolved: true })
      .eq('id', errorId);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getUserErrorCount(userId, hoursBack = 24) {
  try {
    const supabase = getSupabase();
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('system_errors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since)
      .eq('resolved', false);
    return count || 0;
  } catch (e) {
    return 0;
  }
}

/** @param opts - { adminId?, adminEmail?, targetUserId?, targetEmail?, details? } */
export async function logAdminAction(action, opts = {}) {
  try {
    const supabase = getSupabase();
    const raw = typeof opts === 'object' && opts !== null ? opts : { targetUserId: opts };
    const adminId = raw.adminId ?? null;
    const adminEmail = raw.adminEmail ?? null;
    const targetUserId = raw.targetUserId ?? raw.target_user_id ?? null;
    const targetEmail = raw.targetEmail ?? raw.target_email ?? null;
    const details = raw.details ?? null;
    await supabase.from('admin_logs').insert({
      action,
      admin_id: adminId,
      performed_by: adminEmail || 'admin',
      admin_email: adminEmail,
      target_user_id: targetUserId,
      target_email: targetEmail,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[monitor] logAdminAction failed:', e.message);
  }
}
