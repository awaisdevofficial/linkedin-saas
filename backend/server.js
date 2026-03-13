import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from backend dir; fallback when PM2 cwd is project root
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });
if (!process.env.GEMINI_API_KEY?.trim()) {
  const fallbackEnv = path.join(process.cwd(), 'backend', '.env');
  if (fallbackEnv !== envPath) dotenv.config({ path: fallbackEnv });
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import adminRoutes from './src/routes/admin.routes.js';
import { logger } from './src/utils/logger.js';

const app = express();
const PORT = process.env.PORT || 4000;

// In-memory state store (use Redis in production for multi-instance)
const stateStore = new Map();

// Frontend/backend alignment: FRONTEND_URL must match where the React app runs (see ENV_ALIGNMENT.md)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

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
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
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
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
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
      }).then((r) => {
        if (r.error && r.error.code !== '23505') logger.auth('profile_insert_error', { error: r.error?.message });
      });
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
// Body: { email, password, redirect? }. Returns { redirectUrl } magic link or 401.
app.post('/auth/login-email', async (req, res) => {
  const { email, password, redirect } = req.body || {};
  if (!email || !password || !supabaseAdmin) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

  const { data: profilesList } = await supabaseAdmin.from('profiles').select('id, email').limit(5000);
  const profile = (profilesList || []).find(
    (p) => p.email && String(p.email).trim().toLowerCase() === emailNorm
  );

  if (!profile?.id) {
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
  const redirectPath = redirect && /^\/[a-zA-Z0-9/_-]*$/.test(String(redirect)) ? String(redirect) : '/dashboard';
  const redirectTo = `${FRONTEND_URL}${redirectPath}`.replace(/\/$/, '') || `${FRONTEND_URL}/dashboard`;
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
  res.json({ redirectUrl: linkData.properties.action_link });
});

// GET /auth/has-password — check if user has a password set (for redirecting new LinkedIn users to set-password)
app.get('/auth/has-password', async (req, res) => {
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

// POST /auth/set-password — new user (e.g. after LinkedIn signup) sets password for email login
app.post('/auth/set-password', async (req, res) => {
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
    logger.auth('set_password_success', { userId: user.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/change-password — logged-in user changes password (current + new)
app.post('/auth/change-password', async (req, res) => {
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
    logger.auth('change_password_success', { userId: user.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/update-password — after forgot-password reset flow; syncs new password to user_passwords
app.post('/auth/update-password', async (req, res) => {
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
    runGenerateJob(userId, { force }).catch((err) => logger.api('generate_job_error', { userId, error: err.message }));
    return res.status(200).json({ success: true, message: 'Generation started' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
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
    const apiKey = settings?.freepik_api_key?.trim();
    if (!apiKey) return res.status(503).json({ error: 'Add your Freepik API key in Automation Settings.' });
    const freepikService = await import('./src/services/freepik.service.js');
    const imageUrl = await freepikService.generateImage(apiKey, prompt, 'widescreen_16_9');
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

// POST /api/generate-image-for-post — generate image via Freepik (prompt = post caption/content)
app.post('/api/generate-image-for-post', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = req.body?.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const freepikService = await import('./src/services/freepik.service.js');
    const imageService = await import('./src/services/image.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.freepik_api_key?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Image generation not available',
        code: 'FREEPIK_KEY_MISSING',
        message: 'Add your Freepik API key in Automation Settings. Get one at https://www.freepik.com/api/image-generation',
      });
    }
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const prompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '');
    if (!prompt) return res.status(400).json({ error: 'Add a hook or content to the post to generate an image' });
    const imageUrl = await freepikService.generateImage(apiKey, prompt, 'widescreen_16_9');
    if (!imageUrl) {
      logger.api('generate_image_for_post_skipped', { postId, reason: 'no_image_url' });
      return res.status(503).json({
        error: 'Image generation failed',
        code: 'IMAGE_SERVICE_UNAVAILABLE',
        message: 'Freepik image generation failed. Check your API key and credits at https://www.freepik.com/developers/dashboard',
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
    return res.status(200).json({ success: true, media_url: mediaUrl });
  } catch (e) {
    logger.api('generate_image_for_post_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Generate image for post failed' });
  }
});

// POST /api/generate-video-for-post — generate video from post image via Freepik Kling v2 (prompt = post caption/content)
app.post('/api/generate-video-for-post', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !supabaseAdmin) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const postId = req.body?.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const supabaseService = await import('./src/services/supabase.service.js');
    const groqService = await import('./src/services/groq.service.js');
    const freepikService = await import('./src/services/freepik.service.js');
    const imageService = await import('./src/services/image.service.js');
    const settings = await supabaseService.getUserContentSettings(user.id);
    const apiKey = settings?.freepik_api_key?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Video generation not available',
        code: 'FREEPIK_KEY_MISSING',
        message: 'Add your Freepik API key in Automation Settings. Get one at https://www.freepik.com/api/image-generation',
      });
    }
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const imageUrl = post.media_url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Post must have an image first. Generate an image, then generate video.' });
    }
    const duration = req.body?.duration === '10' ? '10' : '5';
    const motionPrompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '') || 'Subtle professional motion, suitable for LinkedIn.';
    const videoUrl = await freepikService.generateVideo(apiKey, imageUrl, duration, motionPrompt);
    if (!videoUrl) {
      return res.status(503).json({
        error: 'Video generation failed',
        code: 'VIDEO_SERVICE_UNAVAILABLE',
        message: 'Freepik video generation failed. Check your API key and credits.',
      });
    }
    const uploadedVideoUrl = await imageService.uploadVideoFromUrl(user.id, videoUrl);
    if (!uploadedVideoUrl) return res.status(500).json({ error: 'Video upload failed' });
    await supabaseService.updatePost(postId, { video_url: uploadedVideoUrl, updated_at: new Date().toISOString() });
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
      return res.status(400).json({ error: 'LinkedIn not connected' });
    }
    if (!credentials.personUrn) {
      return res.status(400).json({ error: 'LinkedIn person URN missing; reconnect in Settings' });
    }
    // If no media yet, try generating it now (Freepik)
    if (!post.media_url && (post.hook || post.content || post.visual_prompt)) {
      try {
        const contentSettings = await supabaseService.getUserContentSettings(user.id);
        const freepikKey = contentSettings?.freepik_api_key?.trim();
        if (freepikKey) {
          const groqService = await import('./src/services/groq.service.js');
          const freepikService = await import('./src/services/freepik.service.js');
          const { processAndUploadImage } = await import('./src/services/image.service.js');
          const prompt = groqService.buildPromptFromPostContent(post.hook || '', post.content || '') || groqService.buildImagePromptFromVisual(post.visual_prompt);
          if (!prompt) {
            logger.api('publish_now_image_skipped', { postId, reason: 'no_prompt' });
          } else {
          const imageUrl = await freepikService.generateImage(freepikKey, prompt, 'widescreen_16_9');
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
    const useVideo = !!(post.publish_with_video && post.video_url);
    if (useVideo) logger.api('publish_now_with_video', { postId, videoUrl: post.video_url?.slice(0, 80) });
    const postUrn = await linkedinService.postToLinkedIn(credentials, {
      hook: post.hook,
      content: post.content || '',
      hashtags: post.hashtags || [],
      mediaUrl: useVideo ? null : (post.media_url || null),
      videoUrl: useVideo ? post.video_url : null,
    });
    await supabaseService.updatePost(postId, {
      posted: true,
      status: 'posted',
      posted_at: new Date().toISOString(),
      linkedin_post_id: postUrn,
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
            await linkedinService.commentOnPost(credentials, postUrn, suggestedComments[i]);
            await sleep(60000);
          } catch (_) {}
        }
      })().catch((err) => logger.api('publish_now_suggested_comments_error', { error: err.message }));
    }
    logger.api('publish_now_success', { postId, postUrn });
    return res.status(200).json({ success: true, postUrn });
  } catch (e) {
    logger.api('publish_now_error', { postId: req.body?.postId, error: e.message });
    return res.status(500).json({ error: e.message || 'Publish failed' });
  }
});

app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  logger.info('server_started', { port: PORT, backendUrl: BACKEND_URL });
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    logger.warn('linkedin_oauth_not_configured', { hint: 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET' });
  }
});
