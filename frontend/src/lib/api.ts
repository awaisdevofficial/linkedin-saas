import { API_URL } from './config';

export type ApiOptions = {
  token?: string | null;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
};

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, body, method = 'GET' } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && typeof data?.error === 'string') {
      if (data.error === 'BANNED') {
        try {
          sessionStorage.setItem('postpilot_ban_reason', typeof data.reason === 'string' ? data.reason : '');
        } catch (_) {}
        window.location.href = '/banned';
        throw new Error('BANNED');
      }
      if (data.error === 'ACCESS_EXPIRED') {
        window.location.href = '/expired';
        throw new Error('ACCESS_EXPIRED');
      }
    }
    throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const apiCalls = {
  generate: (token: string) =>
    api<{ success: boolean }>('/api/generate', { token, method: 'POST', body: { force: true } }),

  getGenerationPaused: (token: string) =>
    api<{ generation_paused: boolean }>('/api/settings/generation-paused', { token }),

  setGenerationPaused: (token: string, paused: boolean) =>
    api<{ success: boolean; generation_paused: boolean }>('/api/settings/generation-paused', {
      token,
      method: 'PATCH',
      body: { paused },
    }),

  regenerateImage: (token: string, postId: string) =>
    api<{ success: boolean; media_url?: string }>('/api/regenerate-image', {
      token,
      method: 'POST',
      body: { postId },
    }),

  generateImageForPost: (token: string, postId: string) =>
    api<{ success: boolean; media_url?: string }>('/api/generate-image-for-post', {
      token,
      method: 'POST',
      body: { postId },
    }),

  generateVideoForPost: (token: string, postId: string, options?: { duration?: '5' | '10'; prompt?: string }) =>
    api<{ success: boolean; video_url?: string; media_url?: string }>('/api/generate-video-for-post', {
      token,
      method: 'POST',
      body: { postId, ...options },
    }),

  validateKieKey: (token: string, apiKey: string) =>
    api<{ valid: boolean; paid: boolean; credits: number; message?: string }>('/api/validate-kie-key', {
      token,
      method: 'POST',
      body: { apiKey },
    }),

  getKieKeyStatus: (token: string) =>
    api<{ hasKey: boolean; valid: boolean; paid: boolean; credits: number }>('/api/kie-key-status', { token }),

  regeneratePost: (token: string, postId: string) =>
    api<{ success: boolean; hook?: string; content?: string; hashtags?: string[] }>(
      '/api/regenerate-post',
      { token, method: 'POST', body: { postId } }
    ),

  publishNow: (token: string, postId: string, contentOnly?: boolean) =>
    api<{ success: boolean; postUrn?: string }>('/api/publish-now', {
      token,
      method: 'POST',
      body: { postId, contentOnly: contentOnly === true },
    }),

  /** Proxy to n8n Like&Comment webhook (avoids CORS/SSL from browser). */
  triggerLikeAndComment: (token: string, payload: Record<string, unknown>) =>
    api<{ success: boolean }>('/api/automation/trigger-like-comment', {
      token,
      method: 'POST',
      body: payload,
    }),

  /** Proxy to n8n reply-to-comments webhook (avoids CORS/SSL from browser). */
  triggerReplyToComments: (token: string, payload: Record<string, unknown>) =>
    api<{ success: boolean }>('/api/automation/trigger-reply-comments', {
      token,
      method: 'POST',
      body: payload,
    }),

  loginEmail: (email: string, password: string, redirect?: string) =>
    api<{ redirectUrl: string }>('/auth/login-email', {
      method: 'POST',
      body: { email, password, redirect },
    }),

  hasPassword: (token: string) =>
    api<{ hasPassword: boolean }>('/api/auth/has-password', { token }),

  setPassword: (token: string, password: string) =>
    api<{ success: boolean }>('/api/auth/set-password', { token, method: 'POST', body: { password } }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    api<{ success: boolean }>('/api/auth/change-password', {
      token,
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  updatePassword: (token: string, newPassword: string) =>
    api<{ success: boolean }>('/api/auth/update-password', { token, method: 'POST', body: { newPassword } }),

  getFeatureFlags: (token: string) =>
    api<Record<string, { enabled: boolean; messageType: string; message: string }>>('/api/feature-flags', { token }),

  getBillingActivity: (token: string) =>
    api<BillingActivityResponse>('/api/billing/activity', { token }),
};

export type BillingActivityEntry = {
  type: 'plan_activated' | 'plan_canceled' | 'plan_revoked' | 'plan_updated';
  plan: string;
  status?: string;
  at: string;
  description: string;
};

export type BillingActivityResponse = {
  subscription: { plan: string; status: string; current_period_end?: string; trial_ends_at?: string | null; trial_expired?: boolean };
  activity: BillingActivityEntry[];
};
