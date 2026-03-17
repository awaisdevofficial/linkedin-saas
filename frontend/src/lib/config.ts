/**
 * Frontend config - must align with backend FRONTEND_URL and BACKEND_URL
 * Production: set VITE_API_URL or VITE_DOMAIN to '' (same-origin) and VITE_OAUTH_BACKEND_URL to your public URL.
 * API base: VITE_API_URL || VITE_DOMAIN (process.env.DOMAIN equivalent) || fallback.
 */
const explicitApiUrl = import.meta.env.VITE_API_URL;
const domainUrl = import.meta.env.VITE_DOMAIN;
export const API_URL =
  explicitApiUrl !== undefined && explicitApiUrl !== ''
    ? explicitApiUrl
    : domainUrl !== undefined && domainUrl !== ''
      ? String(domainUrl).replace(/\/$/, '')
      : typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1'
        ? '' // same-origin in production so nginx can proxy /api/
        : 'http://localhost:4000';
export const OAUTH_BACKEND_URL =
  import.meta.env.VITE_OAUTH_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://localhost:4000');
export const ADMIN_KEY_STORAGE = 'postpilot_admin_key';
export const ADMIN_EMAIL_STORAGE = 'postpilot_admin_email';
export const ADMIN_ROLE_STORAGE = 'postpilot_admin_role';
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'contact.awais.ai@gmail.com';
export const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '20072002';

export function getAdminAuth(): { adminKey: string | null; adminEmail: string | null; role: string | null } {
  if (typeof window === 'undefined') return { adminKey: null, adminEmail: null, role: null };
  return {
    adminKey: localStorage.getItem(ADMIN_KEY_STORAGE),
    adminEmail: localStorage.getItem(ADMIN_EMAIL_STORAGE),
    role: localStorage.getItem(ADMIN_ROLE_STORAGE),
  };
}
