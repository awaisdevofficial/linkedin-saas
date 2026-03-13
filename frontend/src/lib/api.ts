import { API_URL } from './config';

export type ApiOptions = {
  token?: string | null;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  adminKey?: string;
};

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, body, method = 'GET', adminKey } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (adminKey) {
    headers['X-Admin-Key'] = adminKey;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
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
    api<{ success: boolean; video_url?: string }>('/api/generate-video-for-post', {
      token,
      method: 'POST',
      body: { postId, ...options },
    }),

  regeneratePost: (token: string, postId: string) =>
    api<{ success: boolean; hook?: string; content?: string; hashtags?: string[] }>(
      '/api/regenerate-post',
      { token, method: 'POST', body: { postId } }
    ),

  publishNow: (token: string, postId: string) =>
    api<{ success: boolean; postUrn?: string }>('/api/publish-now', {
      token,
      method: 'POST',
      body: { postId },
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

  adminHealth: (adminKey: string) =>
    api<unknown>('/admin/health', { adminKey }),

  adminHealthRun: (adminKey: string) =>
    api<unknown>('/admin/health/run', { adminKey, method: 'POST', body: {} }),

  adminErrors: (adminKey: string, limit?: number) =>
    api<{ id: string; created_at: string; message?: string }[]>(
      `/admin/errors${limit ? `?limit=${limit}` : ''}`,
      { adminKey }
    ),

  adminResolveError: (adminKey: string, id: string) =>
    api<{ resolved: boolean }>(`/admin/errors/${id}/resolve`, {
      adminKey,
      method: 'POST',
      body: {},
    }),
};
