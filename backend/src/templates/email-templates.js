/**
 * POSTORA email HTML templates — shared layout and content for all transactional emails.
 * Brand: indigo #6366F1, dark #2D3142 / #10153E, muted #6B7098.
 */

const BRAND = {
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  dark: '#10153E',
  darkMuted: '#2D3142',
  muted: '#6B7098',
  white: '#ffffff',
  lightBg: '#F6F8FC',
  border: '#E8EAEF',
};

const APP_NAME = 'POSTORA';
const TAGLINE = 'LINKEDIN CONTENT STUDIO';

/**
 * Wraps email body in a full HTML document with POSTORA branding and mobile-friendly styles.
 * @param {string} title - Optional preview/heading (e.g. "Your invoice")
 * @param {string} bodyHtml - Main content HTML (safe, already escaped where needed)
 * @returns {string} Full HTML email
 */
function emailLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title || APP_NAME)}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${BRAND.dark}; background: ${BRAND.lightBg}; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .card { background: ${BRAND.white}; border-radius: 16px; box-shadow: 0 4px 24px rgba(16, 21, 62, 0.08); overflow: hidden; }
    .header { background: ${BRAND.darkMuted}; padding: 28px 24px; text-align: center; }
    .header .wordmark { margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND.white}; letter-spacing: 0.08em; text-transform: uppercase; }
    .header .tagline { margin: 4px 0 0; font-size: 10px; font-weight: 500; color: ${BRAND.muted}; letter-spacing: 0.12em; text-transform: uppercase; }
    .content { padding: 32px 28px; }
    .content p { margin: 0 0 18px; color: ${BRAND.dark}; font-size: 15px; }
    .content p:last-child { margin-bottom: 0; }
    .muted { color: ${BRAND.muted}; font-size: 14px; line-height: 1.5; }
    a { color: ${BRAND.primary}; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; padding: 14px 28px; background: ${BRAND.primary}; color: ${BRAND.white} !important; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 10px 0; text-decoration: none !important; }
    .btn:hover { background: ${BRAND.primaryHover}; text-decoration: none !important; }
    .footer { padding: 20px 28px; border-top: 1px solid ${BRAND.border}; font-size: 12px; color: ${BRAND.muted}; text-align: center; line-height: 1.7; }
    table.invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px; }
    table.invoice-table th, table.invoice-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid ${BRAND.border}; }
    table.invoice-table th { color: ${BRAND.muted}; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    table.invoice-table td { color: ${BRAND.dark}; }
    table.invoice-table tr:last-child td { border-bottom: none; }
    .amount-row td { font-size: 18px; font-weight: 700; color: ${BRAND.primary}; padding-top: 18px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="wordmark">${escapeHtml(APP_NAME)}</p>
        <p class="tagline">${escapeHtml(TAGLINE)}</p>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        Sent by ${escapeHtml(APP_NAME)}. If you didn&rsquo;t expect this, you can ignore it.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the HTML body for the approval email.
 */
function approvalEmailBody(userName, days, expiresStr, dashboardUrl) {
  const name = userName || 'there';
  const expiryLine = expiresStr
    ? ` Your access is valid for <strong>${escapeHtml(String(days))} days</strong> until <strong>${escapeHtml(expiresStr)}</strong>.`
    : ` Your access is valid for <strong>${escapeHtml(String(days))} days</strong>.`;
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your ${APP_NAME} account has been approved.${expiryLine}</p>
    <p><a href="${escapeHtml(dashboardUrl)}" class="btn">Go to dashboard</a></p>
    <p class="muted">Log in at your dashboard to get started.</p>
  `;
}

/**
 * Builds the HTML body for the invoice email (and can be reused for invoice view/print).
 * @param {object} invoice - { invoice_number, amount, currency, due_date, description }
 * @param {string} userName - Recipient name
 * @param {string} dashboardUrl - Link to dashboard/invoices
 */
function invoiceEmailBody(invoice, userName, dashboardUrl) {
  const name = userName || 'there';
  const amount = invoice.amount != null ? Number(invoice.amount) : 0;
  const currency = invoice.currency || 'USD';
  const dueStr = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { dateStyle: 'medium' })
    : '—';
  const desc = invoice.description || '—';

  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Please find your invoice below. Pay by the due date to avoid any interruption.</p>
    <table class="invoice-table">
      <tr><th>Invoice number</th><td>${escapeHtml(String(invoice.invoice_number || '—'))}</td></tr>
      <tr><th>Description</th><td>${escapeHtml(desc)}</td></tr>
      <tr><th>Due date</th><td>${escapeHtml(dueStr)}</td></tr>
      <tr class="amount-row"><th>Amount</th><td>${escapeHtml(currency)} ${amount.toFixed(2)}</td></tr>
    </table>
    <p><a href="${escapeHtml(dashboardUrl)}" class="btn">View invoices</a></p>
    <p class="muted">Thank you for using ${APP_NAME}.</p>
  `;
}

/**
 * Full HTML for a standalone invoice (e.g. for PDF or print). Uses same layout.
 */
function invoiceFullHtml(invoice, userName, dashboardUrl) {
  const body = invoiceEmailBody(invoice, userName, dashboardUrl);
  return emailLayout(`Invoice ${invoice.invoice_number || ''}`, body);
}

/**
 * Access expiring soon email body.
 */
function accessExpiringBody(userName, expiresStr) {
  const name = userName || 'there';
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your ${APP_NAME} access expires on <strong>${escapeHtml(expiresStr)}</strong>.</p>
    <p>Contact us to renew and avoid any interruption to your account.</p>
  `;
}

/**
 * Access expired email body.
 */
function accessExpiredBody(userName) {
  const name = userName || 'there';
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your ${APP_NAME} access has expired.</p>
    <p>Contact your admin to renew your access.</p>
  `;
}

/**
 * New signup notification (to admin) email body.
 */
function newSignupAdminBody(userEmail, userName, joinedAt, approveUrl) {
  const joined = joinedAt ? new Date(joinedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  return `
    <p>A new user has signed up and is awaiting approval.</p>
    <table class="invoice-table">
      <tr><th>Name</th><td>${escapeHtml(userName || '—')}</td></tr>
      <tr><th>Email</th><td>${escapeHtml(userEmail)}</td></tr>
      <tr><th>Joined</th><td>${escapeHtml(joined)}</td></tr>
    </table>
    <p><a href="${escapeHtml(approveUrl)}" class="btn">Approve in admin panel</a></p>
  `;
}

export {
  emailLayout,
  approvalEmailBody,
  invoiceEmailBody,
  invoiceFullHtml,
  accessExpiringBody,
  accessExpiredBody,
  newSignupAdminBody,
  escapeHtml,
  BRAND,
  APP_NAME,
};
