import { getClient } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

/** Set status to 'expired' for approved users where access_expires_at < NOW(); log to admin_logs */
export async function runAccessExpiryJob() {
  const supabase = getClient();
  const now = new Date().toISOString();
  const { data: expired, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('status', 'approved')
    .lt('access_expires_at', now);
  if (fetchErr) {
    logger.automation('access_expiry_fetch_error', { error: fetchErr.message });
    return { updated: 0, error: fetchErr.message };
  }
  if (!expired?.length) return { updated: 0 };
  for (const p of expired) {
    await supabase.from('profiles').update({ status: 'expired' }).eq('id', p.id);
    await supabase.from('admin_logs').insert({
      action: 'access_expired_auto',
      target_user_id: p.id,
      target_email: p.email,
      details: { expired_at: now },
      performed_by: 'cron',
    });
  }
  logger.automation('access_expiry_done', { count: expired.length, userIds: expired.map((x) => x.id) });
  return { updated: expired.length };
}
