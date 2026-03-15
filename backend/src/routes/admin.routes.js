import { Router } from 'express';
import { getLatestHealth, runHealthCheck } from '../services/health.service.js';
import { getRecentErrors, resolveError, logAdminAction } from '../services/monitor.service.js';
import { getClient } from '../services/supabase.service.js';
import {
  sendApprovalEmail,
  sendInvoiceEmail,
  sendNewSignupNotificationAdmin,
  sendBanEmail,
  sendAdminNoteEmail,
} from '../services/email.service.js';
import {
  emailLayout,
  approvalEmailBody,
  invoiceFullHtml,
} from '../templates/email-templates.js';
import { logger } from '../utils/logger.js';

function getDashboardUrl() {
  return `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/dashboard`;
}
function getInvoicesUrl() {
  return `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/dashboard/invoices`;
}

const router = Router();

const ROLES = ['super_admin', 'admin', 'viewer'];

// POST /admin/login — validate email + api_key against admins table; no auth. Returns { success, admin: { id, email, role } }
router.post('/login', async (req, res) => {
  const email = (req.body?.email || req.body?.admin_email || '').trim().toLowerCase();
  const apiKey = (req.body?.api_key || req.body?.apiKey || '').trim();
  if (!email || !apiKey) {
    return res.status(400).json({ error: 'email and api_key required' });
  }
  try {
    const supabase = getClient();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, role')
      .eq('email', email)
      .eq('api_key', apiKey)
      .maybeSingle();
    if (error) {
      logger.api('admin_login_error', { error: error.message });
      return res.status(500).json({ error: 'Database error' });
    }
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or API key' });
    }
    return res.json({ success: true, admin: { id: admin.id, email: admin.email, role: admin.role || 'viewer' } });
  } catch (e) {
    logger.api('admin_login_error', { error: e.message });
    const msg = e?.message || '';
    if (msg.includes('not initialized') || msg.includes('SUPABASE_URL') || msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return res.status(503).json({
        error: 'Server misconfigured',
        message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env and restart the server.',
      });
    }
    return res.status(500).json({ error: msg || 'Server error' });
  }
});

// Admin auth: load admin from DB (x-admin-email + x-admin-key), or fallback to env ADMIN_API_KEY
async function requireAdmin(req, res, next) {
  const email = (req.headers['x-admin-email'] || req.headers['X-Admin-Email'] || '').trim().toLowerCase();
  const key = (req.headers['x-admin-key'] || req.headers['X-Admin-Key'] || '').trim();
  try {
    const supabase = getClient();
    if (email && key) {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('id, email, role')
        .eq('email', email)
        .eq('api_key', key)
        .maybeSingle();
      if (!error && admin) {
        req.admin = { id: admin.id, email: admin.email, role: admin.role || 'viewer' };
        return next();
      }
    }
    const envKey = (process.env.ADMIN_API_KEY || '').trim();
    if (envKey && key === envKey) {
      req.admin = { id: null, email: email || 'legacy', role: 'super_admin' };
      return next();
    }
  } catch (e) {
    logger.api('admin_auth_error', { error: e.message });
  }
  return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing admin credentials. Use email + API key from admins table or set ADMIN_API_KEY in .env' });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient role' });
    }
    next();
  };
}

function adminLog(req, action, opts = {}) {
  return logAdminAction(action, {
    ...opts,
    adminId: req.admin?.id ?? undefined,
    adminEmail: req.admin?.email ?? undefined,
  });
}

router.use(requireAdmin);

/** GET /admin/health — latest health status from DB */
router.get('/health', async (req, res) => {
  logger.api('admin_health_get');
  try {
    const results = await getLatestHealth();
    return res.json(results);
  } catch (e) {
    logger.api('admin_health_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/health/run — run health check now */
router.post('/health/run', requireRole('super_admin', 'admin'), async (req, res) => {
  logger.api('admin_health_run');
  try {
    const results = await runHealthCheck();
    return res.json(results);
  } catch (e) {
    logger.api('admin_health_run_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/errors — recent system errors */
router.get('/errors', async (req, res) => {
  logger.api('admin_errors_get', { limit: req.query.limit });
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const data = await getRecentErrors(limit);
    return res.json(data);
  } catch (e) {
    logger.api('admin_errors_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/errors/:id/resolve — mark error as resolved */
router.post('/errors/:id/resolve', async (req, res) => {
  logger.api('admin_errors_resolve', { id: req.params.id });
  try {
    const ok = await resolveError(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Error not found' });
    return res.json({ resolved: true });
  } catch (e) {
    logger.api('admin_errors_resolve_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/log — log an admin action (e.g. for audit) */
router.post('/log', requireRole('super_admin', 'admin'), async (req, res) => {
  logger.api('admin_log', { action: req.body?.action });
  try {
    const { action, target_user_id, target_email, details } = req.body || {};
    await adminLog(req, action, { targetUserId: target_user_id, targetEmail: target_email, details });
    return res.json({ ok: true });
  } catch (e) {
    logger.api('admin_log_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

// ——— Postpilot Admin Panel: users, invoices, stats ———

/** GET /admin/stats — dashboard stats */
router.get('/stats', async (req, res) => {
  try {
    const supabase = getClient();
    const year = new Date().getFullYear();

    const { data: profiles } = await supabase.from('profiles').select('status');
    const statusCounts = { total: 0, pending: 0, approved: 0, banned: 0, expired: 0 };
    (profiles || []).forEach((p) => {
      statusCounts.total++;
      const s = p.status || 'pending';
      if (s === 'pending') statusCounts.pending++;
      else if (s === 'approved') statusCounts.approved++;
      else if (s === 'banned') statusCounts.banned++;
      else if (s === 'expired') statusCounts.expired++;
    });

    const { data: invList } = await supabase.from('invoices').select('id, status, amount');
    let totalInvoices = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    (invList || []).forEach((inv) => {
      totalInvoices++;
      if (inv.status === 'paid') totalPaid += Number(inv.amount) || 0;
      else if (inv.status === 'unpaid') totalUnpaid += Number(inv.amount) || 0;
    });

    return res.json({
      users: statusCounts,
      invoices: { total: totalInvoices, totalPaid, totalUnpaid },
    });
  } catch (e) {
    logger.api('admin_stats_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/users — all users with status */
router.get('/users', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, status, plan, created_at, access_expires_at, approved_at, ban_reason, notes')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    logger.api('admin_users_list_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/users/:userId — single user */
router.get('/users/:userId', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.userId)
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/approve — approve user, body: { days } */
router.post('/users/:userId/approve', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const days = Math.max(1, parseInt(req.body?.days, 10) || 30);
  try {
    const supabase = getClient();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
    if (fetchErr || !profile) return res.status(404).json({ error: 'User not found' });

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        status: 'approved',
        access_expires_at: expiresAt.toISOString(),
        approved_at: now.toISOString(),
        approved_by: req.admin?.email || 'admin',
        ban_reason: null,
      })
      .eq('id', userId);
    if (updateErr) throw updateErr;

    await adminLog(req, 'user_approved', { targetUserId: userId, targetEmail: profile.email, details: { days, expires_at: expiresAt.toISOString() } });
    try {
      await sendApprovalEmail(profile.email, profile.full_name, days, expiresAt);
    } catch (emailErr) {
      logger.api('admin_approve_email_failed', { userId, email: profile.email, error: emailErr.message });
      // Approval succeeded; email is best-effort (e.g. fix SMTP credentials in .env)
    }
    return res.json({ success: true, access_expires_at: expiresAt.toISOString() });
  } catch (e) {
    logger.api('admin_approve_error', { userId, error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/ban — body: { reason } */
router.post('/users/:userId/ban', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const reason = req.body?.reason ?? '';
  try {
    const supabase = getClient();
    const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'banned', ban_reason: reason || null })
      .eq('id', userId);
    if (error) throw error;
    await adminLog(req, 'user_banned', { targetUserId: userId, details: { reason } });
    if (profile?.email) {
      try {
        await sendBanEmail(profile.email, profile.full_name, reason);
      } catch (emailErr) {
        logger.api('admin_ban_email_failed', { userId, error: emailErr.message });
      }
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/unban */
router.post('/users/:userId/unban', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved', ban_reason: null })
      .eq('id', userId);
    if (error) throw error;
    await adminLog(req, 'user_unbanned', { targetUserId: userId });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/extend — body: { days } add to access_expires_at or from now */
router.post('/users/:userId/extend', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const days = Math.max(1, parseInt(req.body?.days, 10) || 30);
  try {
    const supabase = getClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('access_expires_at')
      .eq('id', userId)
      .single();
    let base = profile?.access_expires_at ? new Date(profile.access_expires_at) : new Date();
    if (base.getTime() < Date.now()) base = new Date();
    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'approved', access_expires_at: expiresAt.toISOString() })
      .eq('id', userId);
    if (error) throw error;
    await adminLog(req, 'user_extended', { targetUserId: userId, details: { days, expires_at: expiresAt.toISOString() } });
    return res.json({ success: true, access_expires_at: expiresAt.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/revoke — revoke access immediately */
router.post('/users/:userId/revoke', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'pending', access_expires_at: null })
      .eq('id', userId);
    if (error) throw error;
    await adminLog(req, 'user_revoked', { targetUserId: userId });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/notes — body: { notes, send_email?: boolean } to email the note to user */
router.post('/users/:userId/notes', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const notes = req.body?.notes ?? '';
  const sendEmail = req.body?.send_email === true;
  try {
    const supabase = getClient();
    const { data: profile } = sendEmail ? await supabase.from('profiles').select('email, full_name').eq('id', userId).single() : { data: null };
    const { error } = await supabase
      .from('profiles')
      .update({ notes: notes || null })
      .eq('id', userId);
    if (error) throw error;
    if (sendEmail && profile?.email) {
      try {
        await sendAdminNoteEmail(profile.email, profile.full_name, notes);
      } catch (emailErr) {
        logger.api('admin_notes_email_failed', { userId, error: emailErr.message });
      }
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/users/:userId/plan — body: { plan } */
router.post('/users/:userId/plan', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const plan = req.body?.plan ?? 'free';
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('profiles')
      .update({ plan })
      .eq('id', userId);
    if (error) throw error;
    return res.json({ success: true, plan });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** Generate next invoice number INV-YYYY-NNN */
async function nextInvoiceNumber(supabase, year) {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  const last = data?.[0]?.invoice_number;
  const num = last ? parseInt(last.split('-')[2], 10) + 1 : 1;
  return `INV-${year}-${String(num).padStart(3, '0')}`;
}

/** POST /admin/users/:userId/invoice — create and send invoice, body: { amount, currency, description, due_date, visible_to_user?, send_email? } */
router.post('/users/:userId/invoice', requireRole('super_admin', 'admin'), async (req, res) => {
  const userId = req.params.userId;
  const { amount, currency = 'USD', description, due_date, visible_to_user = true, send_email = true } = req.body || {};
  if (amount == null || Number(amount) < 0) {
    return res.status(400).json({ error: 'amount required' });
  }
  try {
    const supabase = getClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
    if (!profile) return res.status(404).json({ error: 'User not found' });

    const year = new Date().getFullYear();
    const invoiceNumber = await nextInvoiceNumber(supabase, year);
    const dueDate = due_date ? new Date(due_date).toISOString().slice(0, 10) : null;

    const { data: invoice, error: insErr } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        amount: Number(amount),
        currency: currency || 'USD',
        description: description || null,
        due_date: dueDate,
        status: 'unpaid',
        invoice_number: invoiceNumber,
        visible_to_user: !!visible_to_user,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    if (send_email) {
      try {
        await sendInvoiceEmail(profile.email, profile.full_name, invoice);
        await supabase.from('invoices').update({ email_sent_at: new Date().toISOString() }).eq('id', invoice.id);
      } catch (emailErr) {
        logger.api('admin_invoice_email_failed', { userId, invoiceId: invoice.id, error: emailErr.message });
      }
    }
    await adminLog(req, 'invoice_created', { targetUserId: userId, targetEmail: profile.email, details: { invoice_id: invoice.id, invoice_number: invoiceNumber } });
    return res.json(invoice);
  } catch (e) {
    logger.api('admin_invoice_error', { userId, error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** DELETE /admin/users/:userId — permanently delete user and all their data */
router.delete('/users/:userId', requireRole('super_admin'), async (req, res) => {
  const userId = req.params.userId;
  try {
    const supabase = getClient();
    const { error: delProfile } = await supabase.from('profiles').delete().eq('id', userId);
    if (delProfile) throw delProfile;
    const { error: delAuth } = await supabase.auth.admin.deleteUser(userId);
    if (delAuth) logger.api('admin_delete_user_auth_cleanup', { userId, error: delAuth.message });
    await adminLog(req, 'user_deleted', { targetUserId: userId });
    return res.json({ success: true });
  } catch (e) {
    logger.api('admin_delete_user_error', { userId, error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/invoices — all invoices */
router.get('/invoices', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/invoices/user/:userId — invoices for user */
router.get('/invoices/user/:userId', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** PATCH /admin/invoices/:invoiceId/status — body: { status } */
router.patch('/invoices/:invoiceId/status', requireRole('super_admin', 'admin'), async (req, res) => {
  const invoiceId = req.params.invoiceId;
  const status = req.body?.status;
  if (!['unpaid', 'paid', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be unpaid, paid, or cancelled' });
  }
  try {
    const supabase = getClient();
    const updates = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Invoice not found' });
    await adminLog(req, 'invoice_status_updated', { details: { invoice_id: invoiceId, status } });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/invoices/:invoiceId/preview — preview invoice email HTML (admin only) */
router.get('/invoices/:invoiceId/preview', requireRole('super_admin', 'admin', 'viewer'), async (req, res) => {
  const invoiceId = req.params.invoiceId;
  try {
    const supabase = getClient();
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, profiles(email, full_name)')
      .eq('id', invoiceId)
      .single();
    if (invErr || !invoice) return res.status(404).send('Invoice not found');
    const profile = invoice.profiles || {};
    const userName = profile.full_name || profile.email || 'Customer';
    const dashboardUrl = getInvoicesUrl();
    const html = invoiceFullHtml(invoice, userName, dashboardUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

/** GET /admin/emails/preview/approval — preview approval email HTML. Query: full_name, days, expires_at (ISO, optional) */
router.get('/emails/preview/approval', requireRole('super_admin', 'admin', 'viewer'), (req, res) => {
  const full_name = req.query.full_name ?? req.query.fullName ?? '';
  const days = parseInt(req.query.days, 10) || 30;
  const expires_at = req.query.expires_at ?? req.query.expiresAt;
  const expiresStr = expires_at
    ? new Date(expires_at).toLocaleDateString('en-US', { dateStyle: 'long' })
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { dateStyle: 'long' });
  const dashboardUrl = getDashboardUrl();
  const body = approvalEmailBody(full_name || 'there', days, expiresStr, dashboardUrl);
  const html = emailLayout('Account approved', body);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

/** GET /admin/emails/preview/invoice — preview invoice email HTML before creating. Query: user_id, amount, currency, description, due_date */
router.get('/emails/preview/invoice', requireRole('super_admin', 'admin', 'viewer'), async (req, res) => {
  const userId = req.query.user_id || req.query.userId;
  if (!userId) return res.status(400).send('user_id required');
  const amount = parseFloat(req.query.amount) || 0;
  const currency = req.query.currency || 'USD';
  const description = req.query.description || '—';
  const dueDate = req.query.due_date || req.query.dueDate;
  const dueStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';
  try {
    const supabase = getClient();
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
    const userName = profile?.full_name || profile?.email || 'Customer';
    const draftInvoice = {
      invoice_number: 'PREVIEW',
      amount: Number(amount) || 0,
      currency,
      description,
      due_date: dueDate || null,
    };
    const dashboardUrl = getInvoicesUrl();
    const html = invoiceFullHtml(draftInvoice, userName, dashboardUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

/** POST /admin/invoices/:invoiceId/resend — send invoice email again */
router.post('/invoices/:invoiceId/resend', requireRole('super_admin', 'admin'), async (req, res) => {
  const invoiceId = req.params.invoiceId;
  try {
    const supabase = getClient();
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, profiles(email, full_name)')
      .eq('id', invoiceId)
      .single();
    if (invErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    const profile = invoice.profiles || {};
    try {
      await sendInvoiceEmail(profile.email || invoice.user_id, profile.full_name, invoice);
      await supabase.from('invoices').update({ email_sent_at: new Date().toISOString() }).eq('id', invoiceId);
    } catch (emailErr) {
      logger.api('admin_invoice_resend_email_failed', { invoiceId, error: emailErr.message });
    }
    await adminLog(req, 'invoice_resent', { targetUserId: invoice.user_id, details: { invoice_id: invoiceId } });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** PATCH /admin/invoices/:invoiceId/visibility — body: { visible_to_user } */
router.patch('/invoices/:invoiceId/visibility', requireRole('super_admin', 'admin'), async (req, res) => {
  const invoiceId = req.params.invoiceId;
  const visible_to_user = req.body?.visible_to_user === true;
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('invoices')
      .update({ visible_to_user })
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/logs — admin activity log, optional ?action= */
router.get('/logs', async (req, res) => {
  try {
    const supabase = getClient();
    let q = supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    const action = req.query.action?.trim();
    if (action) q = q.eq('action', action);
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/feature-flags — list all feature flags (pages) */
router.get('/feature-flags', async (req, res) => {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key');
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/** PATCH /admin/feature-flags — update one flag. Body: { key, enabled?, message_type?, custom_message? } */
router.patch('/feature-flags', requireRole('super_admin', 'admin'), async (req, res) => {
  const { key, enabled, message_type, custom_message } = req.body || {};
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key required' });
  }
  try {
    const supabase = getClient();
    const updates = { updated_at: new Date().toISOString() };
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (message_type !== undefined) updates.message_type = message_type;
    if (custom_message !== undefined) updates.custom_message = custom_message || null;
    const { data, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('key', key)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Flag not found' });
    await adminLog(req, 'feature_flag_updated', { details: { key, updates } });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
