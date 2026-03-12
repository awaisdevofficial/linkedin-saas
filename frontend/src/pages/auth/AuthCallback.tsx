import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Handles OAuth redirect (e.g. LinkedIn). Supabase sets the session from the URL.
 * We sync the profile (name, email, avatar) and redirect to the dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (!session?.user) {
          setError('No session after sign in');
          return;
        }

        if (cancelled) return;

        const { id, email, user_metadata } = session.user;
        const fullName = user_metadata?.full_name ?? user_metadata?.name ?? email?.split('@')[0] ?? 'User';
        const avatarUrl = user_metadata?.avatar_url ?? user_metadata?.picture ?? null;

        const { error: upsertError } = await supabase.from('profiles').upsert(
          {
            id,
            full_name: fullName,
            email: email ?? '',
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (upsertError && !cancelled) {
          console.error('Profile upsert error:', upsertError);
          setError(upsertError.message);
          return;
        }

        // Send new signups to create-password so they can log in with email/password later
        navigate('/auth/create-password', { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      }
    }

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-[#FF6B6B] mb-4 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/auth/login', { replace: true })}
            className="text-[#4F6DFF] hover:underline text-sm"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center p-4">
      <Loader2 className="w-10 h-10 text-[#4F6DFF] animate-spin" aria-hidden />
      <p className="text-[#A7B1D8] mt-4 text-sm">Completing sign in… Taking you to the dashboard.</p>
    </div>
  );
}
