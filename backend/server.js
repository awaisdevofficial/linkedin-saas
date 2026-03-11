import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

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
  console.warn('Supabase admin client not initialized:', e.message);
}

// ——— Step 1: Redirect user to LinkedIn ———
app.get('/auth/linkedin', (req, res) => {
  if (!LINKEDIN_CLIENT_ID) {
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
      console.error('LinkedIn token error:', tokenData);
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
      await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          full_name: fullName,
          email: userEmail,
          avatar_url: picture,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } else {
      userEmail = email || `${sub || uuidv4()}@linkedin.placeholder`;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: { full_name: fullName, avatar_url: picture },
      });
      if (createError) {
        console.error('Supabase createUser error:', createError);
        return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=create_user_failed`);
      }
      userId = newUser.user.id;
      userEmail = newUser.user.email;
      await supabaseAdmin.from('profiles').insert({
        id: userId,
        full_name: fullName,
        email: userEmail,
        avatar_url: picture,
      }).then((r) => {
        if (r.error && r.error.code !== '23505') console.error('Profile insert error:', r.error);
      });
    }

    // Store LinkedIn connection (tokens); preserve existing li_at_cookie if user saved it in Settings
    const { data: existingConn } = await supabaseAdmin
      .from('linkedin_connections')
      .select('li_at_cookie')
      .eq('user_id', userId)
      .maybeSingle();

    await supabaseAdmin.from('linkedin_connections').upsert(
      {
        user_id: userId,
        access_token: accessToken,
        li_at_cookie: existingConn?.li_at_cookie ?? null,
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
      console.error('Magic link error:', linkError);
      return res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.callback}?fallback=1`);
    }

    res.redirect(linkData.properties.action_link);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${FRONTEND_URL}${FRONTEND_PATHS.login}?error=server_error`);
  }
});

// ——— Email/password login (custom table; no slow auth.updateUser)
// Body: { email, password }. Returns { redirectUrl } magic link or 401.
app.post('/auth/login-email', async (req, res) => {
  const { email, password } = req.body || {};
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
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userEmail,
    options: { redirectTo: `${FRONTEND_URL}/dashboard` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('Magic link error:', linkError);
    return res.status(500).json({ error: 'Login failed. Try again.' });
  }

  res.json({ redirectUrl: linkData.properties.action_link });
});

// Health check
app.get('/health', (req, res) => {
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
    const { runGenerateJob } = await import('./src/jobs/generate.job.js');
    runGenerateJob(userId).catch((err) => console.error('[api/generate]', err.message));
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
    const openaiService = await import('./src/services/openai.service.js');
    const imageService = await import('./src/services/image.service.js');
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.visual_prompt) return res.status(400).json({ error: 'Post has no visual prompt' });
    const imageUrl = await openaiService.generateImage(post.visual_prompt);
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
    console.error('[api/regenerate-image]', e.message);
    return res.status(500).json({ error: e.message || 'Regenerate image failed' });
  }
});

// POST /api/generate-image-for-post — generate image for a post (creates visual_prompt from text if missing)
app.post('/api/generate-image-for-post', async (req, res) => {
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
    const openaiService = await import('./src/services/openai.service.js');
    const imageService = await import('./src/services/image.service.js');
    const post = await supabaseService.getPostByIdAndUser(postId, user.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    let visualPrompt = post.visual_prompt;
    if (!visualPrompt || typeof visualPrompt !== 'object') {
      visualPrompt = await openaiService.generateVisualPromptFromPost(post.hook || '', post.content || '');
      await supabaseService.updatePost(postId, {
        visual_prompt: visualPrompt,
        updated_at: new Date().toISOString(),
      });
    }
    const imageUrl = await openaiService.generateImage(visualPrompt);
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
    console.error('[api/generate-image-for-post]', e.message);
    return res.status(500).json({ error: e.message || 'Generate image for post failed' });
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
    const openaiService = await import('./src/services/openai.service.js');
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
    const result = await openaiService.generatePost(article, settings);
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
    console.error('[api/regenerate-post]', e.message);
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
    // If no media yet, try generating it now
    if (!post.media_url && post.visual_prompt) {
      try {
        const { generateImage } = await import('./src/services/openai.service.js');
        const { processAndUploadImage } = await import('./src/services/image.service.js');
        const dalleUrl = await generateImage(post.visual_prompt);
        if (dalleUrl) {
          const mediaUrl = await processAndUploadImage(user.id, dalleUrl);
          if (mediaUrl) {
            await supabaseService.updatePost(postId, { media_url: mediaUrl });
            post.media_url = mediaUrl;
          }
        }
      } catch (imgErr) {
        console.warn('[api/publish-now] image generation skipped:', imgErr.message);
        // Continue publishing without image
      }
    }
    const postUrn = await linkedinService.postToLinkedIn(credentials, {
      hook: post.hook,
      content: post.content || '',
      hashtags: post.hashtags || [],
      mediaUrl: post.media_url || null,
    });
    await supabaseService.updatePost(postId, {
      posted: true,
      status: 'posted',
      posted_at: new Date().toISOString(),
      linkedin_post_id: postUrn,
      updated_at: new Date().toISOString(),
    });
    const suggestedComments = post.suggested_comments || [];
    if (suggestedComments.length > 0) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      (async () => {
        for (let i = 0; i < Math.min(3, suggestedComments.length); i++) {
          try {
            await linkedinService.commentOnPost(credentials, postUrn, suggestedComments[i]);
            await sleep(60000);
          } catch (_) {}
        }
      })().catch((err) => console.error('[api/publish-now] suggested comments', err.message));
    }
    return res.status(200).json({ success: true, postUrn });
  } catch (e) {
    console.error('[api/publish-now]', e.message);
    return res.status(500).json({ error: e.message || 'Publish failed' });
  }
});

app.listen(PORT, () => {
  console.log(`OAuth backend running at ${BACKEND_URL}`);
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    console.warn('Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET for LinkedIn OAuth.');
  }
});
