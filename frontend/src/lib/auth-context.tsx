import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { linkedInOAuthUrl, useOAuthBackend } from './config';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DEFAULT_SCHEDULE: Record<string, { enabled: boolean; time_slots: string[] }> = {
  Mon: { enabled: true, time_slots: ['09:00'] },
  Tue: { enabled: true, time_slots: ['09:00'] },
  Wed: { enabled: true, time_slots: ['09:00'] },
  Thu: { enabled: true, time_slots: ['09:00'] },
  Fri: { enabled: true, time_slots: ['09:00'] },
  Sat: { enabled: false, time_slots: [] },
  Sun: { enabled: false, time_slots: [] },
};

async function ensureUserDefaults(userId: string) {
  const { data: schedules } = await supabase.from('schedules').select('id').eq('user_id', userId).limit(1);
  if (!schedules?.length) {
    for (const day of DEFAULT_DAYS) {
      const { enabled, time_slots } = DEFAULT_SCHEDULE[day];
      await supabase.from('schedules').insert({ user_id: userId, day, enabled, time_slots });
    }
  }
  const { data: settings } = await supabase.from('engagement_settings').select('user_id').eq('user_id', userId).maybeSingle();
  if (!settings) {
    await supabase.from('engagement_settings').insert({
      user_id: userId,
      auto_liking: false,
      auto_commenting: false,
      max_engagements_per_day: 50,
      active_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      active_start_time: '09:00',
      active_end_time: '17:00',
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Get initial session — always set loading false so app never sticks on refresh
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
    }, 8000); // Fallback: stop loading after 8s if getSession hangs

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes and sync profile to Supabase (name, email, avatar_url)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Handle token refresh silently
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        return;
      }

      if (session?.user) {
        try {
          const { id, email, user_metadata } = session.user;
          const fullName = user_metadata?.full_name ?? user_metadata?.name ?? email?.split('@')[0] ?? 'User';
          const avatarUrl = user_metadata?.avatar_url ?? user_metadata?.picture ?? null;
          await supabase.from('profiles').upsert(
            {
              id,
              full_name: fullName,
              email: email ?? '',
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
          await ensureUserDefaults(id);
        } catch {
          // Don't block auth if profile sync fails
        }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error) {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from('profiles').upsert(
          { id: newUser.id, full_name: fullName, email: email },
          { onConflict: 'id' }
        );
        await ensureUserDefaults(newUser.id);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithLinkedIn = async () => {
    if (useOAuthBackend && linkedInOAuthUrl) {
      window.location.href = linkedInOAuthUrl;
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid profile email w_member_social',
      },
    });
    return { error };
  };

  const signOut = async () => {
    setSession(null);
    setUser(null);
    supabase.auth.signOut().catch(() => {});
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    try {
      const result = await supabase.auth.updateUser({ password });
      return { error: result.error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
