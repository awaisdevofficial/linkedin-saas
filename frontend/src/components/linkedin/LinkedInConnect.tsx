import { useState, useEffect, useCallback, useRef } from 'react';
import { Linkedin, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

export type ConnectState = 'idle' | 'waiting' | 'connected' | 'error';

export interface LinkedInConnectProps {
  onConnected?: () => void;
  showTitle?: boolean;
}

type ConnectionRow = {
  is_active?: boolean | null;
  cookie_status?: string | null;
  last_connected_at?: string | null;
} | null;

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 120000;

function buildBookmarklet(apiBaseUrl: string, jwt: string): string {
  const safeUrl = apiBaseUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeToken = jwt.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  const script = [
    "javascript:(function(){",
    "var li_at=document.cookie.split(';').find(function(c){return c.trim().indexOf('li_at=')===0;});",
    "var li_at_val=li_at?li_at.split('=')[1].trim():null;",
    "var js=document.cookie.split(';').find(function(c){return c.trim().indexOf('JSESSIONID=')===0;});",
    "var js_val=js?js.split('=').slice(1).join('=').trim().replace(/\"/g,''):null;",
    "if(!li_at_val){alert('Please log into LinkedIn first, then click this again.');return;}",
    "fetch('" + safeUrl + "/api/linkedin/save-cookies',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer " + safeToken + "'},body:JSON.stringify({li_at:li_at_val,jsessionid:js_val})})",
    ".then(function(r){return r.json();})",
    ".then(function(){alert('LinkedIn connected to POSTORA ✅ You can go back now.');})",
    ".catch(function(){alert('Connection failed. Please try again.');});",
    "})();"
  ].join('');
  return script;
}

export function LinkedInConnect({ onConnected, showTitle = true }: LinkedInConnectProps) {
  const { user } = useAuth();
  const [state, setState] = useState<ConnectState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [bookmarkletHref, setBookmarkletHref] = useState<string>('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const resetToIdle = useCallback(() => {
    setState('idle');
    setErrorMessage('');
  }, []);

  // Build bookmarklet when we have session
  useEffect(() => {
    if (!supabase || !user) return;
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.access_token) return;
      const apiBaseUrl = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const href = buildBookmarklet(apiBaseUrl, session.access_token);
      if (mounted) setBookmarkletHref(href);
    })();
    return () => { mounted = false; };
  }, [user]);

  // On mount: check existing connection
  useEffect(() => {
    if (!supabase || !user) return;
    let mounted = true;
    (async () => {
      const { data: row } = await supabase
        .from('linkedin_connections')
        .select('is_active, cookie_status, last_connected_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const conn = row as ConnectionRow;
      if (!mounted) return;
      if (conn?.is_active && (conn.cookie_status || '').toLowerCase() === 'active') {
        setState('connected');
        setLastConnectedAt(conn.last_connected_at || null);
        return;
      }
      setState('idle');
    })();
    return () => { mounted = false; };
  }, [user]);

  // Poll when idle or waiting (max 2 min)
  useEffect(() => {
    const client = supabase;
    if (!client || !user || (state !== 'idle' && state !== 'waiting')) return;
    pollStartRef.current = Date.now();

    const poll = async () => {
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return;
      }
      const { data: row } = await client
        .from('linkedin_connections')
        .select('is_active, cookie_status, last_connected_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const conn = row as ConnectionRow;
      if (conn?.is_active && (conn.cookie_status || '').toLowerCase() === 'active') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setLastConnectedAt(conn.last_connected_at || null);
        setState('connected');
        window.dispatchEvent(new Event('linkedin-connection-updated'));
        onConnected?.();
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [user, state, onConnected]);

  const handleOpenLinkedIn = useCallback(() => {
    setState('waiting');
    window.open('https://www.linkedin.com', '_blank', 'noopener,noreferrer');
  }, []);

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
          <AlertTitle>LinkedIn Account Connected</AlertTitle>
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

  // idle or waiting
  return (
    <div className="space-y-6">
      {showTitle && (
        <h3 className="text-lg font-semibold text-[#10153E]">Link Your LinkedIn Account</h3>
      )}
      <p className="text-sm text-[#6B7098]">
        POSTORA connects to your existing LinkedIn session to schedule posts and automate engagement on your behalf. Secure, instant, and no password needed.
      </p>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#6B7098]/20 bg-[#F6F8FC] p-4">
          <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide mb-2">Step 1</p>
          <p className="text-sm text-[#10153E] mb-3">Drag this button to your browser bookmarks bar</p>
          <a
            href={bookmarkletHref}
            draggable
            onClick={(e) => {
              e.preventDefault();
              alert('Drag this button to your bookmarks bar, then click it while on LinkedIn.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white rounded-lg cursor-grab active:cursor-grabbing select-none font-medium"
          >
            🔗 Connect POSTORA
          </a>
          <p className="text-xs text-[#6B7098] mt-2">👆 Drag this blue button to your bookmarks bar</p>
          <p className="text-xs text-[#6B7098] mt-1">Only needs to be done once</p>
        </div>

        <div className="rounded-xl border border-[#6B7098]/20 bg-[#F6F8FC] p-4">
          <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide mb-2">Step 2</p>
          <p className="text-sm text-[#10153E] mb-3">Go to LinkedIn (make sure you&apos;re logged in) and click the bookmark</p>
          <Button
            variant="outline"
            className="border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
            onClick={handleOpenLinkedIn}
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Open LinkedIn
          </Button>
        </div>

        <div className="rounded-xl border border-[#6B7098]/20 bg-[#F6F8FC] p-4">
          <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide mb-2">Step 3</p>
          <p className="text-sm text-[#10153E]">Come back here — we&apos;ll detect the connection automatically</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-[#6B7098]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A66C2] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A66C2]" />
        </span>
        <span>Waiting for LinkedIn connection...</span>
      </div>
      <p className="text-xs text-[#6B7098]">Click the bookmark on LinkedIn, then come back here.</p>
    </div>
  );
}
