/**
 * Frontend config - must align with backend FRONTEND_URL and BACKEND_URL
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const OAUTH_BACKEND_URL = import.meta.env.VITE_OAUTH_BACKEND_URL || 'http://localhost:4000';
export const ADMIN_KEY_STORAGE = 'postpilot_admin_key';
