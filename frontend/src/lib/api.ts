import { API_URL } from './config';

export type ApiOptions = {
  token?: string | null;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  adminKey?: string;
  adminEmail?: string;
};

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, body, method = 'GET', adminKey, adminEmail } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (adminKey) {
    headers['X-Admin-Key'] = adminKey;
  }
  if (adminEmail) {
    headers['X-Admin-Email'] = adminEmail;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401 on admin routes (except login) → clear admin session and redirect to login
    if (res.status === 401 && path.startsWith('/admin') && !path.includes('/admin/login')) {
      try {
        localStorage.removeItem('postpilot_admin_key');
        localStorage.removeItem('postpilot_admin_email');
        localStorage.removeItem('postpilot_admin_role');
      } catch (_) {}
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }
    if (res.status === 403 && typeof data?.error === 'string') {
      if (data.error === 'PENDING_APPROVAL') {
        window.location.href = '/pending';
        throw new Error('PENDING_APPROVAL');
      }
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

  getFeatureFlags: (token: string) =>
    api<Record<string, { enabled: boolean; messageType: string; message: string }>>('/api/feature-flags', { token }),

  getMyInvoices: (token: string) =>
    api<AdminInvoice[]>('/api/invoices', { token }),

  adminLogin: (email: string, apiKey: string) =>
    api<{ success: boolean; admin: { id: number; email: string; role: string } }>('/admin/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), api_key: apiKey },
    }),

  adminHealth: (adminKey: string, adminEmail?: string) =>
    api<unknown>('/admin/health', { adminKey, adminEmail }),

  adminHealthRun: (adminKey: string, adminEmail?: string) =>
    api<unknown>('/admin/health/run', { adminKey, adminEmail, method: 'POST', body: {} }),

  adminErrors: (adminKey: string, limit?: number, adminEmail?: string) =>
    api<{ id: string; created_at: string; message?: string }[]>(
      `/admin/errors${limit ? `?limit=${limit}` : ''}`,
      { adminKey, adminEmail }
    ),

  adminResolveError: (adminKey: string, id: string, adminEmail?: string) =>
    api<{ resolved: boolean }>(`/admin/errors/${id}/resolve`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: {},
    }),

  // Postpilot Admin Panel (pass adminEmail when using DB admins)
  adminStats: (adminKey: string, adminEmail?: string) =>
    api<{ users: { total: number; pending: number; approved: number; banned: number; expired: number }; invoices: { total: number; totalPaid: number; totalUnpaid: number } }>(
      '/admin/stats',
      { adminKey, adminEmail }
    ),
  adminUsers: (adminKey: string, adminEmail?: string) =>
    api<AdminUser[]>('/admin/users', { adminKey, adminEmail }),
  adminUser: (adminKey: string, userId: string, adminEmail?: string) =>
    api<AdminUser>(`/admin/users/${userId}`, { adminKey, adminEmail }),
  adminApprove: (adminKey: string, userId: string, days: number, adminEmail?: string) =>
    api<{ success: boolean; access_expires_at: string }>(`/admin/users/${userId}/approve`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: { days },
    }),
  adminBan: (adminKey: string, userId: string, reason: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}/ban`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: { reason },
    }),
  adminUnban: (adminKey: string, userId: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}/unban`, { adminKey, adminEmail, method: 'POST', body: {} }),
  adminExtend: (adminKey: string, userId: string, days: number, adminEmail?: string) =>
    api<{ success: boolean; access_expires_at: string }>(`/admin/users/${userId}/extend`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: { days },
    }),
  adminRevoke: (adminKey: string, userId: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}/revoke`, { adminKey, adminEmail, method: 'POST', body: {} }),
  adminNotes: (adminKey: string, userId: string, notes: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}/notes`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: { notes },
    }),
  adminPlan: (adminKey: string, userId: string, plan: string, adminEmail?: string) =>
    api<{ success: boolean; plan: string }>(`/admin/users/${userId}/plan`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body: { plan },
    }),
  adminInvoice: (adminKey: string, userId: string, body: { amount: number; currency?: string; description?: string; due_date?: string; visible_to_user?: boolean; send_email?: boolean }, adminEmail?: string) =>
    api<AdminInvoice>(`/admin/users/${userId}/invoice`, {
      adminKey,
      adminEmail,
      method: 'POST',
      body,
    }),
  adminDeleteUser: (adminKey: string, userId: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/users/${userId}`, { adminKey, adminEmail, method: 'DELETE' }),
  adminInvoices: (adminKey: string, adminEmail?: string) =>
    api<AdminInvoiceRow[]>('/admin/invoices', { adminKey, adminEmail }),
  adminInvoicesByUser: (adminKey: string, userId: string, adminEmail?: string) =>
    api<AdminInvoice[]>(`/admin/invoices/user/${userId}`, { adminKey, adminEmail }),
  adminInvoiceStatus: (adminKey: string, invoiceId: string, status: 'unpaid' | 'paid' | 'cancelled', adminEmail?: string) =>
    api<AdminInvoice>(`/admin/invoices/${invoiceId}/status`, {
      adminKey,
      adminEmail,
      method: 'PATCH',
      body: { status },
    }),
  adminResendInvoice: (adminKey: string, invoiceId: string, adminEmail?: string) =>
    api<{ success: boolean }>(`/admin/invoices/${invoiceId}/resend`, {
      adminKey,
      adminEmail,
      method: 'POST',
    }),
  adminInvoiceVisibility: (adminKey: string, invoiceId: string, visible_to_user: boolean, adminEmail?: string) =>
    api<AdminInvoice>(`/admin/invoices/${invoiceId}/visibility`, {
      adminKey,
      adminEmail,
      method: 'PATCH',
      body: { visible_to_user },
    }),
  adminLogs: (adminKey: string, action?: string, adminEmail?: string) =>
    api<AdminLog[]>(`/admin/logs${action ? `?action=${encodeURIComponent(action)}` : ''}`, { adminKey, adminEmail }),

  adminFeatureFlags: (adminKey: string, adminEmail?: string) =>
    api<FeatureFlagRow[]>('/admin/feature-flags', { adminKey, adminEmail }),

  adminPatchFeatureFlag: (
    adminKey: string,
    body: { key: string; enabled?: boolean; message_type?: string; custom_message?: string },
    adminEmail?: string
  ) =>
    api<FeatureFlagRow>('/admin/feature-flags', { adminKey, adminEmail, method: 'PATCH', body }),
};

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  status: string;
  plan: string;
  created_at: string | null;
  access_expires_at: string | null;
  approved_at: string | null;
  ban_reason: string | null;
  notes: string | null;
};

export type AdminInvoice = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  invoice_number: string | null;
  created_at: string;
  visible_to_user?: boolean;
  email_sent_at?: string | null;
};

export type AdminInvoiceRow = AdminInvoice & { profiles?: { email: string; full_name: string } | null };

export type AdminLog = {
  id: string;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  details: unknown;
  performed_by: string;
  created_at: string;
};

export type FeatureFlagRow = {
  key: string;
  label: string;
  enabled: boolean;
  message_type: 'coming_soon' | 'maintenance' | 'custom';
  custom_message: string | null;
  updated_at: string;
};
