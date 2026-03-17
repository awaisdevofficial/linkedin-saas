import './load-env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import adminRoutes from './src/routes/admin.routes.js';
import { logger } from './src/utils/logger.js';
import { invoiceFullHtml } from './src/templates/email-templates.js';

const app = express();
const PORT = process.env.PORT || 4000;

// In-memory state store (use Redis in production for multi-instance)
const stateStore = new Map();

// Frontend/backend alignment: FRONTEND_URL must match where the React app runs (see ENV_ALIGNMENT.md)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// External provider base URLs (override via env if needed)
const LINKEDIN_BASE_URL = process.env.LINKEDIN_BASE_URL || 'https://www.linkedin.com';
const LINKEDIN_API_BASE_URL = process.env.LINKEDIN_API_BASE_URL || 'https://api.linkedin.com';

const ALLOWED_ORIGINS = [FRONTEND_URL];
if (process.env.CORS_EXTRA_ORIGINS) {
  ALLOWED_ORIGINS.push(...process.env.CORS_EXTRA_ORIGINS.split(',').map((o) => o.trim()));
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some((o) => origin === o || origin === o + '/')) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// ——— Log every HTTP request: method, path, status, duration, body (sanitized) ———
app.use((req, res, next) => {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 10);
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = { ...obj };
    const sensitive = ['password', 'password_hash', 'access_token', 'refresh_token', 'li_at_cookie', 'jsessionid', 'api_key', 'secret'];
    for (const k of Object.keys(copy)) {
      if (sensitive.some((s) => k.toLowerCase().includes(s))) copy[k] = '[REDACTED]';
    }
    return copy;
  };
  logger.http('request_in', {
    reqId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query || {}).length ? req.query : undefined,
    body: req.body && Object.keys(req.body).length ? sanitize(req.body) : undefined,
    ip: req.ip || req.socket?.remoteAddress,
  });
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('request_out', {
      reqId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      statusMessage: res.statusMessage,
      durationMs: duration,
    });
  });
  next();
});

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Backend OAuth routes (frontend sends users here)
const REDIRECT_URI = `${BACKEND_URL}/auth/linkedin/callback`;
const SCOPES = ['openid', 'profile', 'email', 'w_member_social'].join(' ');

// Frontend routes we redirect to (must match React routes in App.tsx)
const FRONTEND_PATHS = {
  login: '/auth/login',
  callback: '/auth/callback',
};

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

let supabaseAdmin;
try {
  supabaseAdmin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
} catch (e) {
  logger.warn('supabase_admin_not_initialized', { error: e.message });
}

/** Fetch LinkedIn profile picture, upload to Supabase Storage avatars bucket, return public URL. */
async function uploadLinkedInAvatarToStorage(userId, linkedInPictureUrl) {
  if (!linkedInPictureUrl || !supabaseAdmin) return null;
  try {
    const imgRes = await fetch(linkedInPictureUrl, { redirect: 'follow' });
    if (!imgRes.ok) return null;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `${userId}.${ext}`;

    const { error } = await supabaseAdmin.storage.from('avatars').upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      logger.auth('avatar_upload_error', { userId, error: error.message });
      return null;
    }
    const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    logger.auth('avatar_upload_error', { userId, error: e.message });
    return null;
  }
}

// ——— Step 1: Redirect user to LinkedIn ———
app.get('/auth/linkedin', (req, res) => {
  logger.auth('linkedin_redirect_start');
  if (!LINKEDIN_CLIENT_ID) {
    logger.auth('linkedin_redirect_fail', { reason: 'LINKEDIN_CLIENT_ID not configured' });
    return res.status(500).send('LINKEDIN_CLIENT_ID not configured');
  }
  const state = uuidv4();
  stateStore.set(state, { createdAt: Date.now() });
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: SCOPES,
  });
  res.redirect(`${LINKEDIN_BASE_URL}/oauth/v2/authorization?${params.toString()}`);
});

// ——— Step 2: LinkedIn redirects back with code ———
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error: linkedinError } = req.query;

  if (linkedinError) {
    const message = encodeURIComponent(linkedinError === 'user_cancelled_authorize' ? 'You cancelled sign in.' : linkedinError);
    return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=${message}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=missing_code_or_state`);
  }

  const stored = stateStore.get(state);
  stateStore.delete(state);
  if (!stored || Date.now() - stored.createdAt > 60000) {
    return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=invalid_state`);
  }

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=server_config`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`${LINKEDIN_BASE_URL}/oauth/v2/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.auth('linkedin_token_error', { status: tokenRes.status, error: tokenData.error });
      return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;

    // Get profile (OpenID Connect userinfo)
    const profileRes = await fetch(`${LINKEDIN_API_BASE_URL}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let email = '';
    let fullName = 'User';
    let picture = null;
    let sub = null;

    if (profileRes.ok) {
      const profile = await profileRes.json();
      sub = profile.sub;
      email = profile.email || '';
      fullName = profile.name || profile.given_name || email?.split('@')[0] || 'User';
      picture = profile.picture || null;
    }

    if (!supabaseAdmin) {
      return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=server_config`);
    }

    // Find or create Supabase user
    let userId;
    let userEmail;

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const byEmail = listData?.users?.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;

    if (byEmail) {
      userId = byEmail.id;
      userEmail = byEmail.email;
    } else {
      userEmail = email || `${sub || uuidv4()}@linkedin.placeholder`;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: { full_name: fullName, avatar_url: picture },
      });
      if (createError) {
        logger.auth('supabase_create_user_error', { error: createError.message });
        return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=create_user_failed`);
      }
      userId = newUser.user.id;
      userEmail = newUser.user.email;
    }

    // Upload LinkedIn profile picture to our storage bucket (persistent URL, no LinkedIn dependency)
    const avatarUrl = picture
      ? (await uploadLinkedInAvatarToStorage(userId, picture)) || picture
      : null;

    if (byEmail) {
      await Promise.all([
        supabaseAdmin.from('profiles').upsert(
          {
            id: userId,
            full_name: fullName,
            email: userEmail,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        ),
        avatarUrl
          ? supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: { full_name: fullName, avatar_url: avatarUrl },
            })
          : Promise.resolve(),
      ]);
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: fullName, avatar_url: avatarUrl },
      });
      await supabaseAdmin.from('profiles').insert({
        id: userId,
        full_name: fullName,
        email: userEmail,
        avatar_url: avatarUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).then((r) => {
        if (r.error && r.error.code !== '23505') logger.auth('profile_insert_error', { error: r.error?.message });
      });
      try {
        const { sendNewSignupNotificationAdmin } = await import('./src/services/email.service.js');
        await sendNewSignupNotificationAdmin(userEmail, fullName, new Date().toISOString());
      } catch (e) {
        logger.auth('admin_signup_notification_error', { error: e?.message });
      }
    }

    // Store LinkedIn connection (tokens); preserve existing li_at_cookie and jsessionid if user saved them in Settings
    const { data: existingConn } = await supabaseAdmin
      .from('linkedin_connections')
      .select('li_at_cookie, jsessionid')
      .eq('user_id', userId)
      .maybeSingle();

    await supabaseAdmin.from('linkedin_connections').upsert(
      {
        user_id: userId,
        access_token: accessToken,
        li_at_cookie: existingConn?.li_at_cookie ?? null,
        jsessionid: existingConn?.jsessionid ?? null,
        person_urn: sub ? `urn:li:person:${sub}` : `urn:li:person:${userId}`,
        is_active: true,
        last_connected_at: new Date().toISOString(),
        last_tested_at: null,
      },
      { onConflict: 'user_id' }
    );

    // Log the user in: generate magic link and redirect so frontend gets a session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo: `${FRONTEND_URL}${FRONTEND_PATHS.callback}` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logger.auth('magic_link_error', { error: linkError?.message });
      return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.callback}?fallback=1`);
    }

    logger.auth('oauth_success', { userId, email: userEmail });
    res.redirect(linkData.properties.action_link);
  } catch (err) {
    logger.auth('oauth_callback_error', { error: err.message });
    res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=server_error`);
  }
});

// ——— Email/password login (custom table; no slow auth.updateUser)
// Body: { email, password, redirect?, redirect_url? }. Returns { redirectUrl } magic link or 401.
// For mobile: pass redirect_url (e.g. postora://auth/callback) to receive magic link redirect in app.
app.post('/auth/login-email', async (req, res) => {
  try {
    const { email, password, redirect, redirect_url } = req.body || {};
    if (!email || !password || !supabaseAdmin) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

    // Query by email (eq + ilike fallback for case-insensitive)
    let profile = null;
    let profileError = null;
    const { data: byEq } = await supabaseAdmin.from('profiles').select('id, email').eq('email', emailNorm).limit(1).maybeSingle();
    if (byEq?.id) {
      profile = byEq;
    } else {
      const { data: byIlike, error: e } = await supabaseAdmin.from('profiles').select('id, email').ilike('email', emailNorm).limit(1).maybeSingle();
      profileError = e;
      profile = byIlike;
    }

    if (profileError || !profile?.id) {
      return res.status(401).json({ error: 'No account found with this email. Sign up or use LinkedIn.' });
    }

    const { data: pwRow } = await supabaseAdmin
      .from('user_passwords')
      .select('password_hash')
      .eq('user_id', profile.id)
      .single();

    if (!pwRow?.password_hash) {
      return res.status(401).json({
        error: 'No password set for this account. Sign in with LinkedIn first, then go to Create password (or Settings) to set one.',
      });
    }

    const ok = await bcrypt.compare(password, pwRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const userEmail = profile.email || emailNorm;

    // Mobile: return tokens directly, no redirect (postora://auth/callback)
    if (redirect_url === 'postora://auth/callback' && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (error) return res.status(401).json({ error: error.message });
      return res.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // Web: normal flow (redirect via magic link)
    const hasCustomRedirect = redirect_url && typeof redirect_url === 'string' && /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(redirect_url.trim());
    const redirectTo = hasCustomRedirect
      ? String(redirect_url).trim()
      : (() => {
          const redirectPath = redirect && /^\/[a-zA-Z0-9/_-]*$/.test(String(redirect)) ? String(redirect) : '/dashboard';
          return `${FRONTEND_URL}${redirectPath}`.replace(/\/$/, '') || `${FRONTEND_URL}/dashboard`;
        })();
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logger.auth('email_login_magic_link_error', { error: linkError?.message });
      return res.status(500).json({ error: 'Login failed. Try again.' });
    }

    logger.auth('email_login_success', { userId: profile.id });
    return res.json({ redirectUrl: linkData.properties.action_link });
  } catch (err) {
    logger.auth('email_login_error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Login failed. Try again.' });
  }
});

// GET /api/auth/has-password — check if user has a password set (for redirecting new LinkedIn users to set-password)
app.get('/api/auth/has-password', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: pw } = await supabaseAdmin.from('user_passwords').select('user_id').eq('user_id', user.id).maybeSingle();
    return res.json({ hasPassword: !!pw?.user_id });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Sync plain password to Supabase Auth so mobile signInWithPassword works (same user as user_passwords).
function syncPasswordToSupabaseAuth(userId, plainPassword) {
  if (!supabaseAdmin || !plainPassword) return;
  supabaseAdmin.auth.admin.updateUserById(userId, { password: plainPassword }).then(({ error }) => {
    if (error) logger.auth('sync_password_to_auth_error', { userId, error: error.message });
  }).catch((e) => logger.auth('sync_password_to_auth_error', { userId, error: e.message }));
}

// POST /api/auth/set-password — new user (e.g. after LinkedIn signup) sets password for email login
app.post('/api/auth/set-password', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const { password } = req.body || {};
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabaseAdmin.from('user_passwords').upsert(
      { user_id: user.id, password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) return res.status(500).json({ error: 'Failed to save password' });
    syncPasswordToSupabaseAuth(user.id, password);
    logger.auth('set_password_success', { userId: user.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password — logged-in user changes password (current + new)
app.post('/api/auth/change-password', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Provide current password and new password (min 8 characters)' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: pw } = await supabaseAdmin.from('user_passwords').select('password_hash').eq('user_id', user.id).maybeSingle();
    if (!pw?.password_hash) return res.status(400).json({ error: 'No password set. Use Set password or sign in with LinkedIn.' });
    const ok = await bcrypt.compare(currentPassword, pw.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabaseAdmin.from('user_passwords').upsert(
      { user_id: user.id, password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) return res.status(500).json({ error: 'Failed to update password' });
    syncPasswordToSupabaseAuth(user.id, newPassword);
    logger.auth('change_password_success', { userId: user.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/update-password — after forgot-password reset flow; syncs new password to user_passwords
app.post('/api/auth/update-password', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const { newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const hash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabaseAdmin.from('user_passwords').upsert(
      { user_id: user.id, password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) return res.status(500).json({ error: 'Failed to save password' });
    syncPasswordToSupabaseAuth(user.id, newPassword);
    logger.auth('update_password_success', { userId: user.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  logger.api('health_check', { linkedin: !!LINKEDIN_CLIENT_ID, supabase: !!supabaseAdmin });
  res.json({
    ok: true,
    linkedin: !!LINKEDIN_CLIENT_ID,
    supabase: !!supabaseAdmin,
  });
});

// ——— API access guard: after JWT verify, check profiles.status (pending/banned/expired → 403)
async function apiAuthGuard(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return next();
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return next();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status, access_expires_at, ban_reason')
      .eq('id', user.id)
      .single();
    const status = profile?.status ?? 'approved';
    if (status === 'pending') {
      return res.status(403).json({
        error: 'PENDING_APPROVAL',
        message: 'Your account is pending admin approval.',
      });
    }
    if (status === 'banned') {
      return res.status(403).json({
        error: 'BANNED',
        message: 'Your account has been banned.',
        reason: profile?.ban_reason ?? null,
      });
    }
    if (status === 'expired') {
      return res.status(403).json({
        error: 'ACCESS_EXPIRED',
        message: 'Your access has expired. Please contact admin.',
      });
    }
    if (status === 'approved' && profile?.access_expires_at) {
      const expiresAt = new Date(profile.access_expires_at).getTime();
      if (expiresAt < Date.now()) {
        await supabaseAdmin.from('profiles').update({ status: 'expired' }).eq('id', user.id);
        return res.status(403).json({
          error: 'ACCESS_EXPIRED',
          message: 'Your access has expired. Please contact admin.',
        });
      }
    }
  } catch (e) {
    logger.api('api_auth_guard_error', { error: e?.message });
  }
  next();
}
app.use('/api', apiAuthGuard);

// GET /api/feature-flags — which dashboard pages are enabled and what message to show when disabled
app.get('/api/feature-flags', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: rows } = await supabaseAdmin.from('feature_flags').select('key, enabled, message_type, custom_message');
    const flags = {};
    const messageMap = { coming_soon: 'Coming soon', maintenance: 'In maintenance' };
    (rows || []).forEach((r) => {
      const msgType = r.message_type || 'coming_soon';
      flags[r.key] = {
        enabled: r.enabled === true,
        messageType: msgType,
        message: msgType === 'custom' && r.custom_message ? r.custom_message : (messageMap[msgType] || 'Coming soon'),
      };
    });
    return res.json(flags);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

// GET /api/invoices — current user's invoices (visible_to_user = true)
app.get('/api/invoices', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .eq('visible_to_user', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

// GET /api/invoices/:id/html — current user's invoice as HTML (view/print)
app.get('/api/invoices/:id/html', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const invoiceId = req.params.id;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
    const userName = profile?.full_name || user.email?.split('@')[0] || 'Customer';
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .eq('visible_to_user', true)
      .single();
    if (error || !invoice) return res.status(404).send('Invoice not found');
    const dashboardUrl = `${FRONTEND_URL}/dashboard/invoices`;
    const html = invoiceFullHtml(invoice, userName, dashboardUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

// POST /api/generate — trigger generate job for the authenticated user (optional: single user)
app.post('/api/generate', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.body?.userId ?? user.id;
    if (userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const force = !!req.body?.force;
    const { runGenerateJob } = await import('./src/jobs/generate.job.js');
    logger.api('generate_triggered', { userId, force });
    const result = await runGenerateJob(userId, { force });
    logger.api('generate_completed', { userId, result });
    return res.status(200).json({ success: true, message: 'Generation complete', result });
  } catch (e) {
    logger.api('generate_job_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
});

// GET /api/settings/generation-paused — read current pause state
app.get('/api/settings/generation-paused', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    return res.status(200).json({ generation_paused: settings?.generation_paused === true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

// PATCH /api/settings/generation-paused — toggle hourly post generation on/off
app.patch('/api/settings/generation-paused', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const paused = req.body?.paused === true;
    const supabaseService = await import('./src/services/supabase.service.js');
    const ok = await supabaseService.updateUserContentSetting(user.id, 'generation_paused', paused);
    if (!ok) return res.status(500).json({ error: 'Failed to update' });
    return res.status(200).json({ success: true, generation_paused: paused });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

// POST /api/validate-kie-key — validate KIE API key; only accept if valid and credits > 0 (paid)
app.post('/api/validate-kie-key', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await supabaseAdmin.auth.getUser(token);
    const apiKey = req.body?.apiKey?.trim?.();
    if (!apiKey) return res.status(400).json({ error: 'apiKey required', valid: false, paid: false });
    const kieService = await import('./src/services/kie.service.js');
    const { valid, credits } = await kieService.getCredits(apiKey);
    if (!valid) {
      return res.status(200).json({
        valid: false,
        paid: false,
        credits: 0,
        message: 'Invalid KIE API key. Check your key at https://kie.ai/api-key',
      });
    }
    const paid = credits > 0;
    if (!paid) {
      return res.status(200).json({
        valid: true,
        paid: false,
        credits: 0,
        message: 'Upgrade your plan or add credits to continue generation of images and videos. Get credits at https://kie.ai/api-key',
      });
    }
    return res.status(200).json({ valid: true, paid: true, credits, message: 'KIE API key is valid and has credits.' });
  } catch (e) {
    logger.api('validate_kie_key_error', { error: e.message });
    return res.status(500).json({ error: e.message || 'Validation failed', valid: false, paid: false });
  }
});

// GET /api/kie-key-status — return whether user has a valid paid KIE key (for disabling image/video UI)
app.get('/api/kie-key-status', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.kie_api_key?.trim();
    if (!apiKey) {
      return res.status(200).json({ hasKey: false, valid: false, paid: false, credits: 0 });
    }
    const kieService = await import('./src/services/kie.service.js');
    const { valid, credits } = await kieService.getCredits(apiKey);
    const paid = valid && credits > 0;
    return res.status(200).json({
      hasKey: true,
      valid,
      paid,
      credits: valid ? credits : 0,
    });
  } catch (e) {
    logger.api('kie_key_status_error', { error: e.message });
    return res.status(500).json({ hasKey: false, valid: false, paid: false, credits: 0 });
  }
});

// POST /api/regenerate-image — regenerate image for a post
app.post('/api/regenerate-image', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = req.body?.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const imageService = await import('./src/services/image.service.js');
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const prompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '') || groqService.buildImagePromptFromVisual(post.visual_prompt);
    if (!prompt) return res.status(400).json({ error: 'Add a hook or content to the post to generate an image' });
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.kie_api_key?.trim();
    if (!apiKey) return res.status(503).json({ error: 'Add your KIE API key in Automation Settings (https://kie.ai/api-key).' });
    const kieService = await import('./src/services/kie.service.js');
    const imageUrl = await kieService.generateImage(apiKey, prompt, '16:9');
    if (!imageUrl) return res.status(500).json({ error: 'Image generation failed' });
    const mediaUrl = await imageService.processAndUploadImage(user.id, imageUrl);
    if (!mediaUrl) return res.status(500).json({ error: 'Image upload failed' });
    await supabaseService.updatePost(postId, {
      media_url: mediaUrl,
      status: 'ready_to_post',
      is_checked: true,
      has_media: true,
      updated_at: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, media_url: mediaUrl });
  } catch (e) {
    logger.api('regenerate_image_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Regenerate image failed' });
  }
});

// POST /api/generate-image-for-post — generate image via KIE (text-to-image, Flux-2). Long-running: Nginx needs proxy_read_timeout 600s.
app.post('/api/generate-image-for-post', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const postId = req.body?.postId;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!postId) return res.status(400).json({ error: 'postId required' });
    logger.api('generate_image_for_post_start', { postId, userId: user.id });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const kieService = await import('./src/services/kie.service.js');
    const imageService = await import('./src/services/image.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.kie_api_key?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Image generation not available',
        code: 'KIE_KEY_MISSING',
        message: 'Add your KIE API key in Automation Settings. Get one at https://kie.ai/api-key',
      });
    }
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const prompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '');
    if (!prompt) return res.status(400).json({ error: 'Add a hook or content to the post to generate an image' });
    logger.api('generate_image_for_post_kie_start', { postId });
    const imageUrl = await kieService.generateImage(apiKey, prompt, '16:9');
    logger.api('generate_image_for_post_kie_done', { postId, hasImage: !!imageUrl });
    if (!imageUrl) {
      logger.api('generate_image_for_post_skipped', { postId, reason: 'no_image_url' });
      return res.status(503).json({
        error: 'Image generation failed',
        code: 'IMAGE_SERVICE_UNAVAILABLE',
        message: 'KIE image generation failed. Check your API key and credits at https://kie.ai',
      });
    }
    const mediaUrl = await imageService.processAndUploadImage(user.id, imageUrl);
    if (!mediaUrl) return res.status(500).json({ error: 'Image upload failed' });
    await supabaseService.updatePost(postId, {
      media_url: mediaUrl,
      status: 'ready_to_post',
      is_checked: true,
      has_media: true,
      updated_at: new Date().toISOString(),
    });
    logger.api('generate_image_for_post_success', { postId, media_url: mediaUrl?.slice(0, 60) });
    return res.status(200).json({ success: true, media_url: mediaUrl });
  } catch (e) {
    logger.api('generate_image_for_post_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Generate image for post failed' });
  }
});

// POST /api/generate-video-for-post — generate video via KIE (text-to-video, Kling 2.6; no image required). Long-running: Nginx needs proxy_read_timeout 600s.
app.post('/api/generate-video-for-post', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  const postId = req.body?.postId;
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!postId) return res.status(400).json({ error: 'postId required' });
    logger.api('generate_video_for_post_start', { postId, userId: user.id });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const kieService = await import('./src/services/kie.service.js');
    const imageService = await import('./src/services/image.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.kie_api_key?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Video generation not available',
        code: 'KIE_KEY_MISSING',
        message: 'Add your KIE API key in Automation Settings. Get one at https://kie.ai/api-key',
      });
    }
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const videoPrompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '') || 'Professional, subtle motion suitable for LinkedIn.';
    const duration = req.body?.duration === '10' ? '10' : '5';
    logger.api('generate_video_for_post_kie_start', { postId });
    const videoUrl = await kieService.generateVideo(apiKey, videoPrompt, duration, '16:9');
    logger.api('generate_video_for_post_kie_done', { postId, hasVideo: !!videoUrl });
    if (!videoUrl) {
      return res.status(503).json({
        error: 'Video generation failed',
        code: 'VIDEO_SERVICE_UNAVAILABLE',
        message: 'KIE video generation failed. Check your API key and credits at https://kie.ai',
      });
    }
    const uploadedVideoUrl = await imageService.uploadVideoFromUrl(user.id, videoUrl);
    if (!uploadedVideoUrl) return res.status(500).json({ error: 'Video upload failed' });
    await supabaseService.updatePost(postId, { video_url: uploadedVideoUrl, updated_at: new Date().toISOString() });
    logger.api('generate_video_for_post_success', { postId, video_url: uploadedVideoUrl?.slice(0, 60) });
    return res.status(200).json({ success: true, video_url: uploadedVideoUrl });
  } catch (e) {
    logger.api('generate_video_for_post_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Generate video for post failed' });
  }
});

// POST /api/regenerate-post — regenerate post content (hook, content, hashtags, visual_prompt) from feed
app.post('/api/regenerate-post', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = req.body?.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const rssService = await import('./src/services/rss.service.js');
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const settings = await supabaseService.getUserContentSettings(user.id);
    const articles = await rssService.fetchFeedsForUser(
      user.id,
      supabaseService.getUserRssFeeds,
      supabaseService.getDefaultFeedsForNiche,
      () => Promise.resolve(settings)
    );
    const article = (articles || [])[0];
    if (!article) return res.status(400).json({ error: 'No articles in feed; add niche or RSS first' });
    const result = await groqService.generatePost(article, settings);
    if (!result) return res.status(500).json({ error: 'Content generation failed' });
    await supabaseService.updatePost(postId, {
      hook: result.headline_hook || result.hook || '',
      content: result.post_copy || result.content || '',
      hashtags: result.hashtags || [],
      visual_prompt: result.visual_prompt || null,
      media_url: null,
      status: 'pending',
      is_checked: false,
      has_media: false,
      updated_at: new Date().toISOString(),
    });
    return res.status(200).json({
      success: true,
      hook: result.headline_hook || result.hook,
      content: result.post_copy || result.content,
      hashtags: result.hashtags,
    });
  } catch (e) {
    logger.api('regenerate_post_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Regenerate post failed' });
  }
});

// POST /api/publish-now — publish one post to LinkedIn immediately
app.post('/api/publish-now', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const postId = req.body?.postId;
    const contentOnly = req.body?.contentOnly === true;
    if (!postId) {
      return res.status(400).json({ error: 'postId required' });
    }
    const supabaseService = await import('./src/services/supabase.service.js');
    const linkedinService = await import('./src/services/linkedin.service.js');
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.posted) {
      return res.status(400).json({ error: 'Post already published' });
    }
    const allowed = ['approved', 'ready_to_post', 'pending'];
    if (!allowed.includes(post.status)) {
      return res.status(400).json({ error: 'Post cannot be published in current status' });
    }
    const credentials = await supabaseService.getConnectionByUserId(user.id);
    if (!credentials || (!credentials.liAtCookie && !credentials.accessToken)) {
      return res.status(400).json({ error: 'LinkedIn not connected. Connect your account in Settings.' });
    }
    if (!credentials.personUrn) {
      return res.status(400).json({ error: 'LinkedIn person URN missing. Reconnect your account in Settings.' });
    }
    // LinkedIn REST API requires a valid OAuth token (Bearer). Placeholder "cookie-auth" or short token will fail.
    const credToken = credentials.accessToken || '';
    if (credToken === 'cookie-auth' || credToken.length < 20) {
      return res.status(400).json({ error: 'LinkedIn OAuth token missing or expired. Reconnect your LinkedIn account in Settings.' });
    }
    // If no media yet and user did not choose content-only, try generating it now (KIE text-to-image)
    if (!contentOnly && !post.media_url && (post.hook || post.content || post.visual_prompt)) {
      try {
        const contentSettings = await supabaseService.getUserContentSettings(user.id);
        const kieKey = contentSettings?.kie_api_key?.trim();
        if (kieKey) {
          const groqService = await import('./src/services/groq.service.js');
          const kieService = await import('./src/services/kie.service.js');
          const { processAndUploadImage } = await import('./src/services/image.service.js');
          const prompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '') || groqService.buildImagePromptFromVisual(post.visual_prompt);
          if (!prompt) {
            logger.api('publish_now_image_skipped', { postId, reason: 'no_prompt' });
          } else {
            const imageUrl = await kieService.generateImage(kieKey, prompt, '16:9');
            if (imageUrl) {
              const mediaUrl = await processAndUploadImage(user.id, imageUrl);
              if (mediaUrl) {
                await supabaseService.updatePost(postId, { media_url: mediaUrl });
                post.media_url = mediaUrl;
              }
            }
          }
        }
      } catch (imgErr) {
        logger.api('publish_now_image_skipped', { postId, error: imgErr.message });
      }
    }
    const useVideo = !contentOnly && !!(post.publish_with_video && post.video_url);
    const useMedia = !contentOnly && (useVideo ? post.video_url : post.media_url);
    if (useVideo) logger.api('publish_now_with_video', { postId, videoUrl: post.video_url?.slice(0, 80) });
    if (contentOnly) logger.api('publish_now_content_only', { postId });
    const postUrn = await linkedinService.postToLinkedIn(credentials, {
      hook: post.hook,
      content: post.content || '',
      hashtags: post.hashtags || [],
      mediaUrl: useMedia && !useVideo ? (post.media_url || null) : null,
      videoUrl: useVideo ? post.video_url : null,
    });
    const activityUrn = postUrn
      .replace('urn:li:ugcPost:', 'urn:li:activity:')
      .replace('urn:li:share:', 'urn:li:activity:');
    await supabaseService.updatePost(postId, {
      posted: true,
      status: 'posted',
      posted_at: new Date().toISOString(),
      linkedin_post_id: postUrn,
      activity_urn: activityUrn,
      updated_at: new Date().toISOString(),
    });
    const contentSettings = await supabaseService.getUserContentSettings(user.id);
    const enablePostComment = contentSettings?.enable_post_comment !== false;
    const suggestedComments = (enablePostComment && (post.suggested_comments || [])) || [];
    if (suggestedComments.length > 0) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      (async () => {
        for (let i = 0; i < Math.min(3, suggestedComments.length); i++) {
          try {
            const commentResult = await linkedinService.commentOnPost(credentials, postUrn, suggestedComments[i]);
            if (commentResult?.postUnavailable) {
              logger.api('publish_now_comment_post_unavailable', { postId, postUrn });
            }
            await sleep(60000);
          } catch (_) {}
        }
      })().catch((err) => logger.api('publish_now_suggested_comments_error', { error: err.message }));
    }
    logger.api('publish_now_success', { postId, postUrn });
    return res.status(200).json({ success: true, postUrn });
  } catch (e) {
    const msg = e?.message || 'Publish failed';
    logger.api('publish_now_error', { postId: req.body?.postId, error: msg });
    const userMessage = msg.length > 200 ? `LinkedIn API error. Check your connection in Settings and try again.` : msg;
    return res.status(500).json({ error: userMessage });
  }
});

// POST /api/automation/trigger-like-comment — proxy to n8n (avoids CORS/SSL "Failed to fetch" from browser)
const LIKE_COMMENT_WEBHOOK = process.env.N8N_LIKE_COMMENT_WEBHOOK_URL;
const REPLY_WEBHOOK = process.env.N8N_REPLY_WEBHOOK_URL;

app.post('/api/automation/trigger-like-comment', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  if (!LIKE_COMMENT_WEBHOOK) {
    logger.api('trigger_like_comment_missing_url', {
      error: 'N8N_LIKE_COMMENT_WEBHOOK_URL not set in environment',
    });
    return res.status(503).json({ error: 'Automation webhook URL not configured' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const payload = req.body?.payload ?? req.body;
    if (!payload || payload.user_id !== user.id) {
      return res.status(400).json({ error: 'Invalid payload or user_id mismatch' });
    }
    logger.api('webhook_trigger_called', { type: 'like_comment', userId: user.id, url: LIKE_COMMENT_WEBHOOK });
    const axios = (await import('axios')).default;
    const axRes = await axios.post(LIKE_COMMENT_WEBHOOK, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
      validateStatus: () => true,
      maxRedirects: 0, // avoid redirect (e.g. HTTP→HTTPS) turning POST into GET
    });
    if (axRes.status >= 200 && axRes.status < 300) {
      logger.api('webhook_trigger_success', { type: 'like_comment', userId: user.id, status: axRes.status });
      try {
        const supabaseService = await import('./src/services/supabase.service.js');
        await supabaseService.updateWebhookLastSent(user.id);
      } catch (err) {
        logger.api('webhook_trigger_last_sent_update_error', { type: 'like_comment', userId: user.id, error: err?.message });
      }
      return res.status(200).json({ success: true });
    }
    logger.api('webhook_trigger_failed', { type: 'like_comment', userId: user.id, status: axRes.status });
    return res.status(axRes.status).json({ error: axRes.data?.message || `Webhook returned ${axRes.status}` });
  } catch (e) {
    logger.api('trigger_like_comment_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Webhook request failed' });
  }
});

app.post('/api/automation/trigger-reply-comments', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  if (!REPLY_WEBHOOK) {
    logger.api('trigger_reply_comments_missing_url', {
      error: 'N8N_REPLY_WEBHOOK_URL not set in environment',
    });
    return res.status(503).json({ error: 'Automation webhook URL not configured' });
  }
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const payload = req.body?.payload ?? req.body;
    if (!payload || payload.user_id !== user.id) {
      return res.status(400).json({ error: 'Invalid payload or user_id mismatch' });
    }
    logger.api('webhook_trigger_called', { type: 'reply_comments', userId: user.id, url: REPLY_WEBHOOK });
    const axios = (await import('axios')).default;
    const axRes = await axios.post(REPLY_WEBHOOK, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000, // reply workflow can take longer than like/comment
      validateStatus: () => true,
      maxRedirects: 0,
    });
    if (axRes.status >= 200 && axRes.status < 300) {
      logger.api('webhook_trigger_success', { type: 'reply_comments', userId: user.id, status: axRes.status });
      try {
        const supabaseService = await import('./src/services/supabase.service.js');
        await supabaseService.updateReplyWebhookLastSent(user.id);
      } catch (err) {
        logger.api('webhook_trigger_last_sent_update_error', { type: 'reply_comments', userId: user.id, error: err?.message });
      }
      return res.status(200).json({ success: true });
    }
    logger.api('webhook_trigger_failed', { type: 'reply_comments', userId: user.id, status: axRes.status });
    return res.status(axRes.status).json({ error: axRes.data?.message || `Webhook returned ${axRes.status}` });
  } catch (e) {
    logger.api('trigger_reply_comments_error', { error: e?.message });
    return res.status(500).json({ error: e?.message || 'Webhook request failed' });
  }
});

app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, backendUrl: BACKEND_URL });
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    logger.warn('linkedin_oauth_not_configured', { hint: 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET' });
  }
});
