import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Handles OAuth callback after LinkedIn sign-in.
 * Backend redirects to Supabase magic link which lands here with hash params.
 * We must let Supabase parse the hash (#access_token=...) and store the session.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          // Full page redirect so the app loads with session in storage (avoids auth-context race)
          window.location.replace('/dashboard');
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
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
        <div className="bg-white rounded-[28px] p-8 card-shadow max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-[#2D5AF6] hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center mx-auto mb-4 animate-pulse" />
        <p className="text-[#6B7098]">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
