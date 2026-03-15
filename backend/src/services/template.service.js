/**
 * Load email templates from DB (email_templates table) and replace {{placeholders}}.
 * Used by email.service.js; falls back to built-in templates if DB template missing.
 */

import { getClient } from './supabase.service.js';

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
 * Replace {{key}} placeholders in a string.
 * @param {string} str - Template string
 * @param {Record<string, string|number>} data - Map of placeholder name -> value
 * @param {{ escapeForHtml?: boolean }} options - If true, escape values for HTML (for body_html)
 */
export function replacePlaceholders(str, data, options = {}) {
  if (!str || typeof str !== 'string') return str;
  const escape = options.escapeForHtml === true;
  let out = str;
  for (const [key, value] of Object.entries(data || {})) {
    const val = value == null ? '' : String(value);
    const replacement = escape ? escapeHtml(val) : val;
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
  }
  return out;
}

/**
 * Load one email template by key from email_templates table.
 * @param {string} key - e.g. 'approval', 'invoice', 'access_expiring'
 * @returns {Promise<{ subject: string, body_html: string, text_body: string } | null>}
 */
export async function getEmailTemplate(key) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, body_html, text_body')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return null;
    return {
      subject: data.subject || '',
      body_html: data.body_html || '',
      text_body: data.text_body || data.body_html || '',
    };
  } catch {
    return null;
  }
}
