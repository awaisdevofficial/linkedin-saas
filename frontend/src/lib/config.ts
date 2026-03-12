/**
 * Frontend config - must align with backend FRONTEND_URL and BACKEND_URL
 * Production: set VITE_API_URL to '' (same-origin) and VITE_OAUTH_BACKEND_URL to your public URL.
 */
const explicitApiUrl = import.meta.env.VITE_API_URL;
export const API_URL =
  explicitApiUrl !== undefined && explicitApiUrl !== ''
    ? explicitApiUrl
    : typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1'
      ? '' // same-origin in production so nginx can proxy /api/
      : 'http://localhost:4000';
export const OAUTH_BACKEND_URL =
  import.meta.env.VITE_OAUTH_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location?.hostname !== 'localhost' && window.location?.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://localhost:4000');
export const ADMIN_KEY_STORAGE = 'postpilot_admin_key';
