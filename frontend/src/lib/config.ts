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
