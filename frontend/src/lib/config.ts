/**
 * Frontend config — single place for backend/external URLs.
 * Keep in sync with backend .env (see ENV_ALIGNMENT.md).
 */

/** Backend origin (no trailing slash). Used for OAuth and API calls. */
export const OAUTH_BACKEND_URL = (import.meta.env.VITE_OAUTH_BACKEND_URL as string)?.replace(/\/$/, '') || '';

/** Whether LinkedIn sign-in goes through our backend (recommended). */
export const useOAuthBackend = Boolean(OAUTH_BACKEND_URL);

/** Full URL to start LinkedIn OAuth on the backend. */
export const linkedInOAuthUrl = OAUTH_BACKEND_URL ? `${OAUTH_BACKEND_URL}/auth/linkedin` : '';

/** Backend health check URL (for debugging). */
export const backendHealthUrl = OAUTH_BACKEND_URL ? `${OAUTH_BACKEND_URL}/health` : '';
