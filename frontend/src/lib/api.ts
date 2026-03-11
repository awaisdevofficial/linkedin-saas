import { supabase } from './supabase';
import { OAUTH_BACKEND_URL } from './config';

async function getFreshToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) throw new Error('Not authenticated');

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) throw new Error('Session refresh failed');
    return refreshed.session.access_token;
  }

  return session.access_token;
}

function backendUrl(): string {
  return OAUTH_BACKEND_URL || 'http://localhost:4000';
}

export async function apiPost(path: string, body: Record<string, unknown>) {
  const token = await getFreshToken();

  const res = await fetch(`${backendUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function apiGet(path: string) {
  const token = await getFreshToken();

  const res = await fetch(`${backendUrl()}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function apiPatch(path: string, body: Record<string, unknown>) {
  const token = await getFreshToken();

  const res = await fetch(`${backendUrl()}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
