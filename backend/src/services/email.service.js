import nodemailer from 'nodemailer';
import {
  emailLayout,
  approvalEmailBody,
  invoiceEmailBody,
  accessExpiringBody,
  accessExpiredBody,
  newSignupAdminBody,
} from '../templates/email-templates.js';
import { getEmailTemplate, replacePlaceholders } from './template.service.js';

const APP_NAME = 'POSTORA';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'POSTORA';
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
  const fromName = process.env.SMTP_FROM_NAME || 'POSTORA';
  const user = process.env.SMTP_USER;
  if (user) return `${fromName} <${user}>`;
  return fromName;
}

function getDashboardUrl() {
  return `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/dashboard`;
}

function getAppUrl() {
  return (process.env.FRONTEND_URL || '').replace(/\/$/, '');
}

async function safeGetTemplate(key) {
  try {
    return await getEmailTemplate(key);
  } catch {
    return null;
  }
}

function ensureHtml(html) {
  return html && typeof html === 'string' && html.trim().length > 0 ? html : '<p>—</p>';
}

export async function sendApprovalEmail(userEmail, userName, days, expiresAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' }) : '';
  const dashboardUrl = getDashboardUrl();
  const tpl = await safeGetTemplate('approval');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME, days: String(days), expiresStr, dashboardUrl };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Account approved', body));
    const text = replacePlaceholders(tpl.text_body, { ...data, userName: data.userName });
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const body = approvalEmailBody(userName, days, expiresStr, dashboardUrl);
  const html = ensureHtml(emailLayout('Account approved', body));
  const text = `Hi ${userName || 'there'},\n\nYour ${APP_NAME} account has been approved. You have access for ${days} days${expiresStr ? ` until ${expiresStr}.` : '.'}\n\nLog in at ${dashboardUrl} to get started.\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `Your ${APP_NAME} account has been approved`, text, html });
  return true;
}

export async function sendInvoiceEmail(userEmail, userName, invoice) {
  const transport = getTransporter();
  if (!transport) return false;
  const amount = invoice.amount != null ? Number(invoice.amount).toFixed(2) : '0.00';
  const currency = invoice.currency || 'USD';
  const dueStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';
  const dashboardUrl = `${getAppUrl()}/dashboard/invoices`;
  const invoiceNumber = invoice.invoice_number || '—';
  const description = invoice.description || '—';
  const tpl = await safeGetTemplate('invoice');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME, invoiceNumber, description, dueStr, currency, amount, dashboardUrl };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout(`Invoice ${invoiceNumber}`, body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const body = invoiceEmailBody(invoice, userName, dashboardUrl);
  const html = ensureHtml(emailLayout(`Invoice ${invoiceNumber}`, body));
  const text = `Hi ${userName || 'there'},\n\n${APP_NAME} Invoice\nInvoice #: ${invoiceNumber}\nAmount: ${currency} ${amount}\nDue: ${dueStr}\nDescription: ${description}\n\nView invoices: ${dashboardUrl}\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `${APP_NAME} Invoice ${invoiceNumber}`, text, html });
  return true;
}

export async function sendAccessExpiringEmail(userEmail, userName, expiresAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' }) : '';
  const tpl = await safeGetTemplate('access_expiring');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME, expiresStr };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Access expiring soon', body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const body = accessExpiringBody(userName, expiresStr);
  const html = ensureHtml(emailLayout('Access expiring soon', body));
  const text = `Hi ${userName || 'there'},\n\nYour ${APP_NAME} access expires on ${expiresStr}. Contact us to renew.\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `Your ${APP_NAME} access is expiring soon`, text, html });
  return true;
}

export async function sendAccessExpiredEmail(userEmail, userName) {
  const transport = getTransporter();
  if (!transport) return false;
  const tpl = await safeGetTemplate('access_expired');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Access expired', body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const body = accessExpiredBody(userName);
  const html = ensureHtml(emailLayout('Access expired', body));
  const text = `Hi ${userName || 'there'},\n\nYour ${APP_NAME} access has expired. Contact admin to renew.\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `Your ${APP_NAME} access has expired`, text, html });
  return true;
}

export async function sendNewSignupNotificationAdmin(userEmail, userName, joinedAt) {
  const transport = getTransporter();
  if (!transport) return false;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;
  const approveUrl = `${getAppUrl()}/admin/users`;
  const joined = joinedAt ? new Date(joinedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : (joinedAt || '—');
  const tpl = await safeGetTemplate('signup_admin');
  if (tpl?.body_html) {
    const data = { userName: userName || '—', userEmail, joinedAt: joined, approveUrl };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('New signup', body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: adminEmail, subject, text, html });
    return true;
  }
  const body = newSignupAdminBody(userEmail, userName, joinedAt, approveUrl);
  const html = ensureHtml(emailLayout('New signup', body));
  const text = `A new user has signed up.\n\nName: ${userName || '—'}\nEmail: ${userEmail}\nJoined: ${joined}\n\nApprove here: ${approveUrl}`;
  await transport.sendMail({ from: getFrom(), to: adminEmail, subject: `New ${APP_NAME} signup — ${userEmail}`, text, html });
  return true;
}

/** Send ban notification to user (use when admin bans). Template key: ban */
export async function sendBanEmail(userEmail, userName, reason = '') {
  const transport = getTransporter();
  if (!transport) return false;
  const tpl = await safeGetTemplate('ban');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME, reason: reason || '' };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Account restricted', body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const html = ensureHtml(emailLayout('Account restricted', `<p>Hi ${(userName || 'there').replace(/</g, '&lt;')},</p><p>Your ${APP_NAME} account has been restricted.</p><p class="muted">Contact support if you have questions.</p>`));
  const text = `Hi ${userName || 'there'},\n\nYour ${APP_NAME} account has been restricted.\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `Your ${APP_NAME} account has been restricted`, text, html });
  return true;
}

/** Send admin note/message to user. Template key: admin_note. Placeholders: userName, appName, message, dashboardUrl */
export async function sendAdminNoteEmail(userEmail, userName, message, dashboardUrl = null) {
  const transport = getTransporter();
  if (!transport) return false;
  const url = dashboardUrl || getDashboardUrl();
  const tpl = await safeGetTemplate('admin_note');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME, message: message || '', dashboardUrl: url };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Message from ' + APP_NAME, body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  const safeMsg = String(message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = ensureHtml(emailLayout('Message', `<p>Hi ${(userName || 'there').replace(/</g, '&lt;')},</p><p>${safeMsg}</p><p><a href="${url}" class="btn">Go to dashboard</a></p>`));
  const text = `Hi ${userName || 'there'},\n\n${message || ''}\n\nDashboard: ${url}\n\n— ${APP_NAME}`;
  await transport.sendMail({ from: getFrom(), to: userEmail, subject: `Message from ${APP_NAME}`, text, html });
  return true;
}

/** Optional: send when super_admin deletes user. Template key: user_deleted */
export async function sendUserDeletedEmail(userEmail, userName) {
  const transport = getTransporter();
  if (!transport) return false;
  const tpl = await safeGetTemplate('user_deleted');
  if (tpl?.body_html) {
    const data = { userName: userName || 'there', appName: APP_NAME };
    const subject = replacePlaceholders(tpl.subject, data);
    const body = replacePlaceholders(tpl.body_html, data, { escapeForHtml: true });
    const html = ensureHtml(emailLayout('Account removed', body));
    const text = replacePlaceholders(tpl.text_body, data);
    await transport.sendMail({ from: getFrom(), to: userEmail, subject, text, html });
    return true;
  }
  return false;
}
