import { useState, useEffect } from 'react';
import {
  User,
  Link2,
  Bell,
  AlertTriangle,
  Camera,
  CheckCircle,
  Mail,
  FileText,
  BarChart3,
  Trash2,
  LogOut,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { useAuth } from '../../lib/auth-context';
import { supabase, getAvatarDisplayUrl } from '../../lib/supabase';

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar_url: null as string | null,
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [lastConnected, setLastConnected] = useState<string | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  const [liAtCookie, setLiAtCookie] = useState('');
  const [jsessionId, setJsessionId] = useState('');
  const [liAtSaving, setLiAtSaving] = useState(false);
  const [liAtSaved, setLiAtSaved] = useState(false);
  const [liAtLoadError, setLiAtLoadError] = useState<string | null>(null);
  const [liAtSaveError, setLiAtSaveError] = useState<string | null>(null);
  const [liAtValidationError, setLiAtValidationError] = useState<string | null>(null);
  const [liAtShowPassword, setLiAtShowPassword] = useState(false);
  const [jsessionIdShowPassword, setJsessionIdShowPassword] = useState(false);
  const [howToGetCookieOpen, setHowToGetCookieOpen] = useState(false);

  function validateAndFormatLiAt(raw: string): { value: string; error: string | null } {
    let value = raw.trim();
    if (!value) return { value: '', error: 'Paste the li_at cookie value.' };
    if (value.toLowerCase().startsWith('li_at=')) value = value.slice(6).trim();
    if (/[\s\r\n]/.test(value)) return { value: raw, error: 'Remove spaces and line breaks. Copy only the cookie value.' };
    if (value.length < 20) return { value: raw, error: 'Too short. The li_at cookie is usually 100+ characters. Copy the full value from DevTools.' };
    if (!/^[A-Za-z0-9_\-\.~%=]+$/.test(value)) return { value: raw, error: "Invalid characters. The li_at value should only contain letters, numbers, and symbols like - _ ." };
    return { value, error: null };
  }

  // Load profile from Supabase (realtime: refetch on change)
  useEffect(() => {
    if (!user?.id) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setProfile({
          name: data.full_name ?? '',
          email: data.email ?? user.email ?? '',
          avatar_url: data.avatar_url ?? null,
        });
      }
      setProfileLoading(false);
    };
    loadProfile();
    const channel = supabase
      .channel('settings-profile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        loadProfile();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email]);

  // Load LinkedIn connection status + li_at from Supabase (realtime)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadLinkedIn = async () => {
      const { data, error } = await supabase
        .from('linkedin_connections')
        .select('li_at_cookie, jsessionid, last_connected_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const hasConnection = !!(data.li_at_cookie && data.li_at_cookie.length > 10);
        setLinkedinConnected(hasConnection);
        setLastConnected(data.last_connected_at ?? null);
        if (data.li_at_cookie) setLiAtCookie(data.li_at_cookie);
        if (data.jsessionid) setJsessionId(data.jsessionid);
      } else {
        setLinkedinConnected(false);
        setLastConnected(null);
      }
      if (error) setLiAtLoadError(error.message);
    };
    loadLinkedIn();
    const channel = supabase
      .channel('settings-linkedin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_connections', filter: `user_id=eq.${user.id}` }, () => {
        loadLinkedIn();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSaveLiAt = async () => {
    if (!user?.id) return;
    setLiAtSaveError(null);
    setLiAtValidationError(null);

    const { value: trimmed, error: validationError } = validateAndFormatLiAt(liAtCookie);
    if (validationError) {
      setLiAtValidationError(validationError);
      return;
    }

    setLiAtSaving(true);
    setLiAtSaved(false);

    try {
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from('linkedin_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;

      const jsessionidVal = jsessionId.trim() || null;
      if (existing) {
        ({ error } = await supabase
          .from('linkedin_connections')
          .update({
            li_at_cookie: trimmed,
            jsessionid: jsessionidVal,
            last_connected_at: now,
            is_active: true,
          })
          .eq('user_id', user.id));
      } else {
        ({ error } = await supabase.from('linkedin_connections').insert({
          user_id: user.id,
          li_at_cookie: trimmed,
          jsessionid: jsessionidVal,
          access_token: 'cookie-auth',
          person_urn: '',
          is_active: true,
          last_connected_at: now,
        }));
      }

      if (error) {
        setLiAtSaveError(error.message);
        return;
      }

      setLiAtCookie(trimmed);
      setLinkedinConnected(true);
      setLastConnected(now);
      setLiAtLoadError(null);
      setLiAtSaved(true);
      setTimeout(() => setLiAtSaved(false), 3000);
    } catch (err) {
      setLiAtSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLiAtSaving(false);
    }
  };

  const [notifications, setNotifications] = useState({
    approvalEmails: true,
    publishEmails: true,
    weeklySummary: false,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // Load notification settings from Supabase
  useEffect(() => {
    if (!user?.id) {
      setNotificationsLoading(false);
      return;
    }
    let cancelled = false;
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('approval_emails, publish_emails, weekly_summary')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setNotifications({
          approvalEmails: data.approval_emails ?? true,
          publishEmails: data.publish_emails ?? true,
          weeklySummary: data.weekly_summary ?? false,
        });
      }
      setNotificationsLoading(false);
    };
    loadNotifications();
    const channel = supabase
      .channel('settings-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notification_settings', filter: `user_id=eq.${user.id}` }, () => {
        loadNotifications();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSaveNotifications = async () => {
    if (!user?.id) return;
    setNotificationsError(null);
    setNotificationsSaving(true);
    const { error } = await supabase
      .from('user_notification_settings')
      .upsert(
        {
          user_id: user.id,
          approval_emails: notifications.approvalEmails,
          publish_emails: notifications.publishEmails,
          weekly_summary: notifications.weeklySummary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    setNotificationsSaving(false);
    if (error) {
      setNotificationsError(error.message);
    } else {
      setNotificationsSaved(true);
      setTimeout(() => setNotificationsSaved(false), 3000);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setProfileError(null);
    setProfileSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.name.trim() || profile.name,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setProfileSaving(false);
    if (error) {
      setProfileError(error.message);
    } else {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    setDisconnectLoading(true);
    const { error } = await supabase.from('linkedin_connections').delete().eq('user_id', user.id);
    setDisconnectLoading(false);
    if (!error) {
      setLinkedinConnected(false);
      setLastConnected(null);
      setLiAtCookie('');
    }
  };

  const [deletePendingLoading, setDeletePendingLoading] = useState(false);
  const handleDeletePendingPosts = async () => {
    if (!user?.id) return;
    setDeletePendingLoading(true);
    await supabase
      .from('posts')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setDeletePendingLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#F2F5FF]">Settings</h1>
        <p className="text-[#A7B1D8] mt-1 text-sm">Manage your account, LinkedIn connection, and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[#1E2433] p-1.5 rounded-xl flex flex-wrap h-auto gap-1 w-fit">
          <TabsTrigger
            value="profile"
            className="px-4 py-2.5 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#94A3B8] data-[state=inactive]:hover:text-[#F2F5FF] transition-colors"
          >
            <User className="w-4 h-4 mr-2 shrink-0" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="linkedin"
            className="px-4 py-2.5 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#94A3B8] data-[state=inactive]:hover:text-[#F2F5FF] transition-colors"
          >
            <Link2 className="w-4 h-4 mr-2 shrink-0" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="px-4 py-2.5 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#94A3B8] data-[state=inactive]:hover:text-[#F2F5FF] transition-colors"
          >
            <Bell className="w-4 h-4 mr-2 shrink-0" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="px-4 py-2.5 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#94A3B8] data-[state=inactive]:hover:text-[#F2F5FF] transition-colors"
          >
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Profile information</h3>
            <p className="text-sm text-[#A7B1D8] mb-6">Update your name and avatar. Email is managed by your sign-in provider.</p>
            {profileLoading ? (
              <div className="flex items-center gap-2 text-[#A7B1D8]">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading profile...
              </div>
            ) : (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center overflow-hidden shrink-0">
                    {(() => {
                      const url = getAvatarDisplayUrl(profile.avatar_url);
                      return url ? <img src={url} alt="Profile" className="w-full h-full object-cover" /> : (
                      <span className="text-white font-bold text-2xl">
                        {profile.name ? profile.name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() : (profile.email?.[0] ?? '?').toUpperCase()}
                      </span>
                    );
                    })()}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Change Avatar
                    </Button>
                    <p className="text-sm text-[#A7B1D8] mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4 max-w-md">
                  {profileError && (
                    <p className="text-sm text-[#FF6B6B]">{profileError}</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#F2F5FF]">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#F2F5FF]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-white/5 border-white/10 text-[#A7B1D8] rounded-xl cursor-not-allowed"
                    />
                    <p className="text-xs text-[#A7B1D8]">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl mt-4"
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : profileSaved ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin" className="mt-6 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Connection status</h3>
            <p className="text-sm text-[#A7B1D8] mb-4">Your LinkedIn session is used to post and engage. Connect below to get started.</p>
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  linkedinConnected ? 'bg-[#27C696]/20' : 'bg-[#FF6B6B]/20'
                }`}
              >
                <Link2
                  className={`w-7 h-7 ${
                    linkedinConnected ? 'text-[#27C696]' : 'text-[#FF6B6B]'
                  }`}
                />
              </div>
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                    linkedinConnected ? 'bg-[#27C696]/20 text-[#27C696]' : 'bg-[#FF6B6B]/20 text-[#FF6B6B]'
                  }`}
                >
                  {linkedinConnected ? 'Connected' : 'Not connected'}
                </span>
                {linkedinConnected && lastConnected && (
                  <p className="text-sm text-[#A7B1D8] mt-1">Last synced: {formatRelativeTime(lastConnected)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">LinkedIn cookie</h3>
            <p className="text-sm text-[#A7B1D8] mb-4">
              Paste your <code className="px-1 py-0.5 rounded bg-white/10 text-xs font-mono">li_at</code> cookie so we can post and engage for you. It&apos;s stored securely and only used for your account.
            </p>

            <button
              type="button"
              onClick={() => setHowToGetCookieOpen(!howToGetCookieOpen)}
              className="flex items-center gap-2 text-sm text-[#4F6DFF] hover:underline mb-4"
            >
              {howToGetCookieOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              How to get it
            </button>
            {howToGetCookieOpen && (
              <ol className="list-decimal list-inside text-sm text-[#A7B1D8] space-y-2 mb-4 pl-2 border-l border-white/10">
                <li>Open linkedin.com (make sure you&apos;re logged in)</li>
                <li>Press F12 on your keyboard</li>
                <li>Click &quot;Application&quot; tab → &quot;Cookies&quot; → &quot;www.linkedin.com&quot;</li>
                <li>Find the row named &quot;li_at&quot; → click it → copy the value</li>
                <li>Find the row named &quot;JSESSIONID&quot; → copy the value (required for fetching comments)</li>
                <li>Paste both below</li>
              </ol>
            )}

            {liAtLoadError && <p className="text-sm text-[#FF6B6B] mb-3">{liAtLoadError}</p>}
            <div className="space-y-3 max-w-lg">
              <Label htmlFor="li_at" className="text-[#F2F5FF]">li_at cookie</Label>
              <div className="relative">
                <Input
                  id="li_at"
                  type={liAtShowPassword ? 'text' : 'password'}
                  placeholder="Paste your li_at cookie here"
                  value={liAtCookie}
                  onChange={(e) => {
                    setLiAtCookie(e.target.value);
                    if (liAtValidationError) setLiAtValidationError(null);
                  }}
                  onBlur={() => {
                    if (!liAtCookie.trim()) setLiAtValidationError(null);
                    else {
                      const { error } = validateAndFormatLiAt(liAtCookie);
                      setLiAtValidationError(error);
                    }
                  }}
                  className={`pr-12 rounded-xl font-mono text-sm bg-white/5 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 ${
                    liAtValidationError ? 'border-[#FF6B6B] focus:ring-[#FF6B6B]/20' : 'border-white/10 focus:ring-[#4F6DFF]/20'
                  } focus:border-[#4F6DFF] focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setLiAtShowPassword(!liAtShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B1D8] hover:text-[#F2F5FF]"
                  aria-label={liAtShowPassword ? 'Hide' : 'Show'}
                >
                  {liAtShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Label htmlFor="jsessionid" className="text-[#F2F5FF]">JSESSIONID (for comments)</Label>
              <div className="relative">
                <Input
                  id="jsessionid"
                  type={jsessionIdShowPassword ? 'text' : 'password'}
                  placeholder="Paste JSESSIONID from same cookie list (optional but recommended)"
                  value={jsessionId}
                  onChange={(e) => setJsessionId(e.target.value)}
                  className="pr-12 rounded-xl font-mono text-sm bg-white/5 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 border-white/10 focus:ring-[#4F6DFF]/20 focus:border-[#4F6DFF] focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setJsessionIdShowPassword(!jsessionIdShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B1D8] hover:text-[#F2F5FF]"
                  aria-label={jsessionIdShowPassword ? 'Hide' : 'Show'}
                >
                  {jsessionIdShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {(liAtValidationError || liAtSaveError) && (
                <p className="text-sm text-[#FF6B6B]">{liAtValidationError || liAtSaveError}</p>
              )}
              {lastConnected && (
                <p className="text-xs text-[#A7B1D8]">Last updated: {formatRelativeTime(lastConnected)}</p>
              )}
              <Button
                onClick={handleSaveLiAt}
                disabled={liAtSaving || !!liAtValidationError || !liAtCookie.trim()}
                className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl"
              >
                {liAtSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : liAtSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>

          {linkedinConnected && (
            <div className="glass-card p-6 border-[#FF6B6B]/20">
              <p className="text-sm text-[#A7B1D8] mb-3">Remove your LinkedIn connection from this app.</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#FF6B6B]/30 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0B1022] border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">Disconnect LinkedIn?</DialogTitle>
                    <DialogDescription className="text-[#A7B1D8]">
                      This will remove your LinkedIn connection. You won&apos;t be able to post or engage until you reconnect.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" className="flex-1 border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl">
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-[#FF6B6B] hover:bg-[#E55A5A] text-white rounded-xl"
                      onClick={handleDisconnect}
                      disabled={disconnectLoading}
                    >
                      {disconnectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Email notifications</h3>
            <p className="text-sm text-[#A7B1D8] mb-4">Choose when you want to receive emails from PostPilot.</p>
            {notificationsLoading ? (
              <div className="flex items-center gap-2 text-[#A7B1D8]">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#4F6DFF] mt-0.5" />
                  <div>
                    <p className="text-[#F2F5FF] font-medium">Post Approval</p>
                    <p className="text-sm text-[#A7B1D8]">
                      Get notified when a post needs your approval
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.approvalEmails}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, approvalEmails: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#27C696] mt-0.5" />
                  <div>
                    <p className="text-[#F2F5FF] font-medium">Post Published</p>
                    <p className="text-sm text-[#A7B1D8]">
                      Get notified when your post goes live
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.publishEmails}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, publishEmails: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-[#FFD166] mt-0.5" />
                  <div>
                    <p className="text-[#F2F5FF] font-medium">Weekly Summary</p>
                    <p className="text-sm text-[#A7B1D8]">
                      Get a weekly report of your LinkedIn performance
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.weeklySummary}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weeklySummary: checked })
                  }
                />
              </div>
              {notificationsError && <p className="text-sm text-[#FF6B6B]">{notificationsError}</p>}
              <Button
                onClick={handleSaveNotifications}
                disabled={notificationsSaving}
                className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl mt-4"
              >
                {notificationsSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : notificationsSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save notification preferences
                  </>
                )}
              </Button>
            </div>
            )}
          </div>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="mt-6 space-y-6">
          <div className="glass-card p-6 border-[#FF6B6B]/30">
            <h3 className="text-lg font-semibold text-[#F2F5FF] mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
              Danger Zone
            </h3>
            <p className="text-[#A7B1D8] mb-6">
              These actions are irreversible. Please proceed with caution.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-[#F2F5FF] font-medium">Delete All Pending Posts</p>
                  <p className="text-sm text-[#A7B1D8]">
                    Remove all posts with &quot;pending&quot; status
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-[#FF6B6B]/30 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Pending
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0B1022] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">
                        Delete All Pending Posts?
                      </DialogTitle>
                      <DialogDescription className="text-[#A7B1D8]">
                        This will permanently delete all posts with &quot;pending&quot; status. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-[#FF6B6B] hover:bg-[#E55A5A] text-white rounded-xl"
                        onClick={handleDeletePendingPosts}
                        disabled={deletePendingLoading}
                      >
                        {deletePendingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Delete All</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-[#F2F5FF] font-medium">Disconnect LinkedIn</p>
                  <p className="text-sm text-[#A7B1D8]">
                    Remove your LinkedIn account connection
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-[#FF6B6B]/30 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-xl"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0B1022] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">
                        Disconnect LinkedIn?
                      </DialogTitle>
                      <DialogDescription className="text-[#A7B1D8]">
                        This will remove your LinkedIn connection. You won&apos;t be able to post or engage until you reconnect.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-[#FF6B6B] hover:bg-[#E55A5A] text-white rounded-xl"
                        onClick={handleDisconnect}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/20">
                <div>
                  <p className="text-[#FF6B6B] font-medium">Delete Account</p>
                  <p className="text-sm text-[#A7B1D8]">
                    Permanently delete your PostPilot account and all data
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#FF6B6B] hover:bg-[#E55A5A] text-white rounded-xl">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0B1022] border-white/10">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-[#FF6B6B]">
                        Delete Your Account?
                      </DialogTitle>
                      <DialogDescription className="text-[#A7B1D8]">
                        This will permanently delete your PostPilot account, all posts, and all data. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 mt-4">
                      <p className="text-sm text-[#FF6B6B] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        This action is irreversible!
                      </p>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-[#FF6B6B] hover:bg-[#E55A5A] text-white rounded-xl">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
