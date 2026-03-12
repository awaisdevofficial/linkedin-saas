import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'contact.awais.ai@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'PostPilot';
const FROM_EMAIL = SMTP_USER;
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_PASS) {
      console.warn('[email] SMTP_PASS not set — emails disabled');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'email', action: 'sent', to, subject }));
    return true;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'email', action: 'failed', to, subject, error: e.message }));
    return false;
  }
}

function baseTemplate(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin: 0; padding: 0; background: #0B1022; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; }
    .logo { font-size: 22px; font-weight: 700; color: #4F6DFF; margin-bottom: 24px; letter-spacing: -0.5px; }
    .logo span { color: #F2F5FF; }
    h2 { color: #F2F5FF; font-size: 20px; margin: 0 0 12px; }
    p { color: #A7B1D8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #4F6DFF; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 16px; }
    .btn-danger { background: #FF6B6B; }
    .alert { background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .alert p { color: #FF6B6B; margin: 0; }
    .success { background: rgba(39,198,150,0.1); border: 1px solid rgba(39,198,150,0.3); border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .success p { color: #27C696; margin: 0; }
    .stat { display: inline-block; background: rgba(79,109,255,0.1); border-radius: 10px; padding: 12px 20px; margin: 4px; text-align: center; }
    .stat .val { color: #F2F5FF; font-size: 24px; font-weight: 700; display: block; }
    .stat .lbl { color: #A7B1D8; font-size: 12px; margin-top: 2px; display: block; }
    .footer { margin-top: 24px; text-align: center; color: #4B5580; font-size: 12px; }
    .footer a { color: #4F6DFF; text-decoration: none; }
    hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">Post<span>Pilot</span></div>
      ${content}
    </div>
    <div class="footer">
      <p>PostPilot — LinkedIn Automation &nbsp;·&nbsp; <a href="${APP_URL}/dashboard/settings">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────

export async function sendCookieExpiredEmail(to, name) {
  return send({
    to,
    subject: '⚠️ Your PostPilot automation has paused',
    html: baseTemplate(`
      <h2>Your LinkedIn connection needs a refresh</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Your LinkedIn session cookie has expired. Your automation has been <strong style="color:#FFD166">paused</strong> until you update it.</p>
      <div class="alert"><p>⚠️ Auto-posting, liking, and commenting are currently disabled for your account.</p></div>
      <p>To resume, go to Settings and paste your updated <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:13px">li_at</code> cookie.</p>
      <a href="${APP_URL}/dashboard/settings?tab=linkedin" class="btn">Update Cookie in Settings</a>
      <p style="font-size:13px;color:#4B5580">Need help? Reply to this email.</p>
    `),
  });
}

export async function sendWeeklySummaryEmail(to, name, stats) {
  const { postsPublished = 0, likesGiven = 0, commentsMade = 0, repliesSent = 0 } = stats || {};
  return send({
    to,
    subject: `📊 Your PostPilot weekly report`,
    html: baseTemplate(`
      <h2>Your week on LinkedIn 🚀</h2>
      <p>Hi ${name || 'there'}, here's what PostPilot did for you this week:</p>
      <div style="margin:20px 0">
        <div class="stat"><span class="val">${postsPublished}</span><span class="lbl">Posts Published</span></div>
        <div class="stat"><span class="val">${likesGiven}</span><span class="lbl">Likes Given</span></div>
        <div class="stat"><span class="val">${commentsMade}</span><span class="lbl">Comments Made</span></div>
        <div class="stat"><span class="val">${repliesSent}</span><span class="lbl">Replies Sent</span></div>
      </div>
      <hr/>
      <a href="${APP_URL}/dashboard" class="btn">View Full Dashboard</a>
    `),
  });
}

export async function sendPostApprovalEmail(to, name, post) {
  return send({
    to,
    subject: '📝 New post ready for your review',
    html: baseTemplate(`
      <h2>A new post is waiting for approval</h2>
      <p>Hi ${name || 'there'},</p>
      <p>PostPilot has generated a new LinkedIn post for you. Review and approve it before it gets published.</p>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;margin:16px 0">
        <p style="color:#F2F5FF;font-weight:600;margin:0 0 8px">${post?.hook || 'New post'}</p>
        <p style="font-size:13px;margin:0">${(post?.content || '').slice(0, 200)}${post?.content?.length > 200 ? '...' : ''}</p>
      </div>
      <a href="${APP_URL}/dashboard/posts/activity" class="btn">Review Post</a>
    `),
  });
}

export async function sendPostPublishedEmail(to, name, post) {
  return send({
    to,
    subject: '✅ Your post is live on LinkedIn',
    html: baseTemplate(`
      <h2>Your post was published!</h2>
      <p>Hi ${name || 'there'},</p>
      <div class="success"><p>✅ Your LinkedIn post just went live.</p></div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;margin:16px 0">
        <p style="color:#F2F5FF;font-weight:600;margin:0">${post?.hook || 'Your post'}</p>
      </div>
      <a href="${APP_URL}/dashboard/posts/activity" class="btn">View in Dashboard</a>
    `),
  });
}

export async function sendSystemIssueEmail(to, name, issue) {
  return send({
    to,
    subject: '🔧 PostPilot automation temporarily paused',
    html: baseTemplate(`
      <h2>We detected an issue</h2>
      <p>Hi ${name || 'there'},</p>
      <div class="alert"><p>⚠️ ${issue || 'A technical issue has temporarily paused your automation.'}</p></div>
      <p>Our team is working on it. We'll notify you as soon as it's resolved. Your data is safe.</p>
      <a href="${APP_URL}/dashboard" class="btn">Check Dashboard</a>
    `),
  });
}

export async function sendAdminNewUserEmail(adminEmail, user) {
  return send({
    to: adminEmail,
    subject: `👤 New user joined PostPilot`,
    html: baseTemplate(`
      <h2>New user signup</h2>
      <p><strong style="color:#F2F5FF">${user?.name || 'Unknown'}</strong> (${user?.email || 'no email'}) just signed up.</p>
      <a href="${APP_URL}/admin" class="btn">View in Admin Panel</a>
    `),
  });
}

export async function sendAdminLinkedInDownEmail(adminEmail, endpoint, error) {
  return send({
    to: adminEmail,
    subject: `🔴 LinkedIn API endpoint down: ${endpoint}`,
    html: baseTemplate(`
      <h2>LinkedIn API Alert</h2>
      <div class="alert"><p>🔴 Endpoint <strong>${endpoint}</strong> is failing.</p></div>
      <p style="font-size:13px;font-family:monospace;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;color:#FF6B6B">${error}</p>
      <a href="${APP_URL}/admin" class="btn btn-danger">View Admin Panel</a>
    `),
  });
}
