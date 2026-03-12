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
        // If this is a magic-link redirect, extract the session from the URL hash.
        // Supabase JS v2 typings may not expose getSessionFromUrl, so access via any.
        if (window.location.hash.includes('access_token=')) {
          const { error: urlError } = await (supabase.auth as any).getSessionFromUrl?.({
            storeSession: true,
          });
          if (urlError) {
            setError(urlError.message);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (session) {
          navigate('/dashboard', { replace: true });
        } else {
          const params = new URLSearchParams(window.location.search);
          if (params.get('fallback') === '1') {
            setError('Sign-in completed but session could not be established. Try logging in again.');
          } else {
            navigate('/auth/login', { replace: true });
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Unexpected error during sign-in callback.');
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
