import { useState, useEffect, useCallback } from 'react';
import { Linkedin, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/postora/EXTENSION_ID_PLACEHOLDER';

export type ConnectState =
  | 'checking'
  | 'no_extension'
  | 'idle'
  | 'loading'
  | 'connected'
  | 'error';

export interface LinkedInConnectProps {
  onConnected?: () => void;
  showTitle?: boolean;
}

type ConnectionRow = {
  is_active?: boolean | null;
  cookie_status?: string | null;
  last_connected_at?: string | null;
} | null;

export function LinkedInConnect({ onConnected, showTitle = true }: LinkedInConnectProps) {
  const { user } = useAuth();
  const [state, setState] = useState<ConnectState>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [sessionExpiredNote, setSessionExpiredNote] = useState(false);

  const resetToIdle = useCallback(() => {
    setState('idle');
    setErrorMessage('');
    setSessionExpiredNote(false);
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    let mounted = true;
    const client = supabase;

    const run = async () => {
      const { data: row } = await client
        .from('linkedin_connections')
        .select('is_active, cookie_status, last_connected_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const conn = row as ConnectionRow;
      if (mounted && conn?.is_active && (conn.cookie_status || '').toLowerCase() === 'active') {
        setState('connected');
        setLastConnectedAt(conn.last_connected_at || null);
        return;
      }
      if (mounted && conn && (conn.cookie_status || '').toLowerCase() !== 'active') {
        setState('idle');
        setLastConnectedAt(null);
        setSessionExpiredNote(true);
        return;
      }

      await new Promise((r) => setTimeout(r, 500));
      if (!mounted) return;
      const hasExtension = typeof window !== 'undefined' && !!(window as unknown as { POSTORA_EXTENSION_INSTALLED?: boolean }).POSTORA_EXTENSION_INSTALLED;
      if (hasExtension) {
        setState('idle');
        setSessionExpiredNote(false);
      } else {
        setState('no_extension');
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleConnect = useCallback(() => {
    setState('loading');
    setErrorMessage('');

    const timeoutId = window.setTimeout(() => {
      setState('error');
      setErrorMessage('Could not reach the POSTORA extension. Please refresh the page and try again.');
    }, 10_000);

    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'POSTORA_COOKIES_RESULT') return;
      window.clearTimeout(timeoutId);
      window.removeEventListener('message', handler);

      const res = event.data as { success?: boolean; error?: string; li_at?: string; jsessionid?: string | null };
      if (res.success === false) {
        if (res.error === 'not_logged_in') {
          setState('error');
          setErrorMessage('Please log into LinkedIn in your browser and try again.');
          return;
        }
        if (res.error === 'extension_error') {
          setState('error');
          setErrorMessage('Something went wrong. Try reinstalling the POSTORA extension.');
          return;
        }
        setState('error');
        setErrorMessage(res.error || 'Something went wrong.');
        return;
      }

      if (res.success !== true || !res.li_at || !supabase || !user) {
        setState('error');
        setErrorMessage('Invalid response from extension.');
        return;
      }

      const { error } = await supabase.from('linkedin_connections').upsert(
        {
          user_id: user.id,
          li_at_cookie: res.li_at,
          jsessionid: res.jsessionid ?? null,
          access_token: 'cookie-auth',
          is_active: true,
          last_connected_at: new Date().toISOString(),
          last_tested_at: new Date().toISOString(),
          cookie_status: 'active',
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        setState('error');
        setErrorMessage(error.message);
        return;
      }

      setLastConnectedAt(new Date().toISOString());
      setState('connected');
      window.dispatchEvent(new Event('linkedin-connection-updated'));
      onConnected?.();
    };

    window.addEventListener('message', handler);
    window.postMessage({ type: 'POSTORA_GET_COOKIES' }, '*');
  }, [user, onConnected]);

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#6B7098]" />
      </div>
    );
  }

  if (state === 'no_extension') {
    return (
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold text-[#10153E]">Connect Your LinkedIn Account</h3>
        )}
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connect Your LinkedIn Account</AlertTitle>
          <AlertDescription>
            <p className="mb-3">POSTORA uses a lightweight browser extension to securely link your LinkedIn session — no password required.</p>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => window.open(CHROME_EXTENSION_URL, '_blank', 'noopener,noreferrer')}
            >
              Add to Chrome
            </Button>
            <p className="mt-2 text-xs text-amber-800/90">(free, takes 10 seconds)</p>
            <p className="mt-1 text-xs text-amber-800/90">After installing, refresh this page to continue.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold text-[#10153E]">Connect Your LinkedIn Account</h3>
        )}
        {sessionExpiredNote && (
          <p className="text-sm text-[#6B7098]">
            Your LinkedIn session expired, please reconnect.
          </p>
        )}
        <p className="text-sm text-[#6B7098]">
          Make sure you&apos;re logged into LinkedIn in this browser.
        </p>
        <Button
          className="w-full h-12 rounded-full bg-[#0A66C2] hover:bg-[#004182] text-white"
          onClick={handleConnect}
        >
          <Linkedin className="w-5 h-5 mr-2" />
          Connect LinkedIn
        </Button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <Button
          className="w-full h-12 rounded-full bg-[#0A66C2] text-white"
          disabled
        >
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Linking your account...
        </Button>
      </div>
    );
  }

  if (state === 'connected') {
    const formattedDate = lastConnectedAt
      ? new Date(lastConnectedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Just now';
    return (
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold text-[#10153E]">LinkedIn Account Connected ✅</h3>
        )}
        <Alert className="border-green-200 bg-green-50 text-green-900 [&>svg]:text-green-600">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>LinkedIn Account Connected ✅</AlertTitle>
          <AlertDescription>
            <p>POSTORA is authorized to post and engage on your behalf.</p>
            <p className="mt-1">Connected on {formattedDate}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-green-800 hover:bg-green-100"
              onClick={resetToIdle}
            >
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold text-[#10153E]">Connect Your LinkedIn Account</h3>
        )}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <p className="mb-3">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={resetToIdle}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
