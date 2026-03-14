import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'PostPilot';
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function getFrom() {
  const fromName = process.env.SMTP_FROM_NAME || 'PostPilot';
  const user = process.env.SMTP_USER;
  if (user) return `${fromName} <${user}>`;
  return fromName;
}

export async function sendApprovalEmail(userEmail, userName, days, expiresAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' }) : '';
  await transport.sendMail({
    from: getFrom(),
    to: userEmail,
    subject: 'Your Postpilot account has been approved',
    text: `Hi ${userName || 'there'},\n\nYour Postpilot account has been approved. You have access for ${days} days${expiresStr ? ` until ${expiresStr}.` : '.'}\n\nLog in at your dashboard to get started.\n\n— PostPilot`,
    html: `<p>Hi ${userName || 'there'},</p><p>Your Postpilot account has been approved. You have access for <strong>${days} days</strong>${expiresStr ? ` until <strong>${expiresStr}</strong>.` : '.'}</p><p><a href="${process.env.FRONTEND_URL || ''}/dashboard">Log in to your dashboard</a> to get started.</p><p>— PostPilot</p>`,
  });
  return true;
}

export async function sendInvoiceEmail(userEmail, userName, invoice) {
  const transport = getTransporter();
  if (!transport) return false;
  const amount = invoice.amount != null ? Number(invoice.amount) : 0;
  const currency = invoice.currency || 'USD';
  const dueStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';
  await transport.sendMail({
    from: getFrom(),
    to: userEmail,
    subject: `PostPilot Invoice ${invoice.invoice_number || ''}`,
    text: `Hi ${userName || 'there'},\n\nPOSTPILOT INVOICE\nInvoice #: ${invoice.invoice_number || '—'}\nAmount: ${currency} ${amount.toFixed(2)}\nDue: ${dueStr}\nDescription: ${invoice.description || '—'}\n\nPlease pay by the due date.\n\n— PostPilot`,
    html: `<p>Hi ${userName || 'there'},</p><p><strong>POSTPILOT INVOICE</strong></p><p>Invoice #: ${invoice.invoice_number || '—'}<br/>Amount: ${currency} ${amount.toFixed(2)}<br/>Due: ${dueStr}<br/>Description: ${invoice.description || '—'}</p><p>Please pay by the due date.</p><p>— PostPilot</p>`,
  });
  return true;
}

export async function sendAccessExpiringEmail(userEmail, userName, expiresAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' }) : '';
  await transport.sendMail({
    from: getFrom(),
    to: userEmail,
    subject: 'Your Postpilot access is expiring soon',
    text: `Hi ${userName || 'there'},\n\nYour Postpilot access expires on ${expiresStr}. Contact us to renew.\n\n— PostPilot`,
    html: `<p>Hi ${userName || 'there'},</p><p>Your Postpilot access expires on <strong>${expiresStr}</strong>. Contact us to renew.</p><p>— PostPilot</p>`,
  });
  return true;
}

export async function sendAccessExpiredEmail(userEmail, userName) {
  const transport = getTransporter();
  if (!transport) return false;
  await transport.sendMail({
    from: getFrom(),
    to: userEmail,
    subject: 'Your Postpilot access has expired',
    text: `Hi ${userName || 'there'},\n\nYour Postpilot access has expired. Contact admin to renew.\n\n— PostPilot`,
    html: `<p>Hi ${userName || 'there'},</p><p>Your Postpilot access has expired. Contact admin to renew.</p><p>— PostPilot</p>`,
  });
  return true;
}

export async function sendNewSignupNotificationAdmin(userEmail, userName, joinedAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;
  const appUrl = process.env.FRONTEND_URL || '';
  const approveUrl = `${appUrl.replace(/\/$/, '')}/admin/users`;
  await transport.sendMail({
    from: getFrom(),
    to: adminEmail,
    subject: `New Postpilot Signup — ${userEmail}`,
    text: `A new user has signed up and is awaiting approval.\n\nName: ${userName || '—'}\nEmail: ${userEmail}\nJoined: ${joinedAt || new Date().toISOString()}\n\nApprove here: ${approveUrl}`,
    html: `<p>A new user has signed up and is awaiting approval.</p><p><strong>Name:</strong> ${userName || '—'}<br/><strong>Email:</strong> ${userEmail}<br/><strong>Joined:</strong> ${joinedAt || new Date().toISOString()}</p><p><a href="${approveUrl}">Approve here</a></p>`,
  });
  return true;
}
