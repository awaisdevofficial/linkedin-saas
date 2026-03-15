import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';

/**
 * Handles OAuth callback after LinkedIn sign-in.
 * Backend redirects to Supabase magic link which lands here with hash params.
 * We must let Supabase parse the hash (#access_token=...) and store the session.
 * New users without a password are sent to /auth/set-password first.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const runOnce = useRef(false);

  useEffect(() => {
    if (runOnce.current) return;
    runOnce.current = true;

    const run = async () => {
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }

      try {
        const hash = window.location.hash?.slice(1) || '';
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setErr) {
              setError(setErr.message);
              return;
            }
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (session) {
          // New LinkedIn users: if they have no password set, send to set-password first
          try {
            const { hasPassword } = await apiCalls.hasPassword(session.access_token);
            if (!hasPassword) {
              window.location.replace('/auth/set-password');
              return;
            }
          } catch {
            // If API fails, continue to onboarding/dashboard
          }

          // Returning users: check onboarding
          let hasCompletedOnboarding = false;
          try {
            const { data: settings } = await supabase
              .from('user_content_settings')
              .select('user_id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            hasCompletedOnboarding = !!settings?.user_id;
          } catch {
            // On error (e.g. RLS), send to onboarding so user isn't stuck
          }
          window.location.replace(hasCompletedOnboarding ? '/dashboard' : '/onboarding');
          return;
        } else {
          const params = new URLSearchParams(window.location.search);
          if (params.get('fallback') === '1') {
            setError('Sign-in completed but session could not be established. Try logging in again.');
          } else {
            navigate('/auth/login', { replace: true });
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unexpected error during sign-in callback.';
        setError(msg);
      }
    };

    run();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
        <div className="bg-white rounded-[28px] p-8 card-shadow max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-[#2D5AF6] hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  const hasHash = typeof window !== 'undefined' && window.location.hash?.includes('access_token=');
  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center mx-auto mb-4 animate-pulse" />
        <p className="text-[#6B7098] mb-4">Signing you in...</p>
        {hasHash && (
          <p className="text-sm text-[#6B7098]">
            If nothing happens, <a href="/dashboard" className="text-[#2D5AF6] hover:underline font-medium">continue to Dashboard</a>.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
