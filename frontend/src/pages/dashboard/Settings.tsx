import { useState, useEffect, useRef } from 'react';
import {
  User,
  Link2,
  AlertTriangle,
  Save,
  Trash2,
  Unlink,
  Bell,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';
import { toast } from 'sonner';

type NotificationSettings = {
  approval_emails: boolean;
  publish_emails: boolean;
  weekly_summary: boolean;
  cookie_expired_emails: boolean;
  system_issue_emails: boolean;
};

const defaultNotificationSettings: NotificationSettings = {
  approval_emails: true,
  publish_emails: false,
  weekly_summary: true,
  cookie_expired_emails: true,
  system_issue_emails: true,
};

const Settings = () => {
  const { user, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null>(null);
  const [liAt, setLiAt] = useState('');
  const [jsessionId, setJsessionId] = useState('');
  const [linkedInStatus, setLinkedInStatus] = useState<'connected' | 'expired' | 'not_connected'>('not_connected');
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const linkedInCookiesEditedRef = useRef(false);
  const COOKIE_DRAFT_KEY_LI = 'postora_settings_li_at_draft';
  const COOKIE_DRAFT_KEY_JS = 'postora_settings_jsessionid_draft';

  // Restore cookie draft from sessionStorage on mount so it survives tab/remount
  useEffect(() => {
    try {
      const savedLi = sessionStorage.getItem(COOKIE_DRAFT_KEY_LI);
      const savedJs = sessionStorage.getItem(COOKIE_DRAFT_KEY_JS);
      if (savedLi != null || savedJs != null) {
        if (savedLi != null) setLiAt(savedLi);
        if (savedJs != null) setJsessionId(savedJs);
        linkedInCookiesEditedRef.current = true;
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab') || 'account';
    const valid = ['account', 'danger'].includes(t);
    setActiveTab(valid ? t : 'account');
  }, [searchParams]);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;

    const fetch = async () => {
      const [profileRes, connRes, notifRes] = await Promise.all([
        client.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).maybeSingle(),
        client
          .from('linkedin_connections')
          .select('li_at_cookie, jsessionid, is_active, cookie_status, last_connected_at, last_health_check')
          .eq('user_id', user.id)
          .maybeSingle(),
        client
          .from('user_notification_settings')
          .select('approval_emails, publish_emails, weekly_summary, cookie_expired_emails, system_issue_emails')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setProfile(profileRes.data as typeof profile);
      const conn = connRes.data as { li_at_cookie?: string; jsessionid?: string; is_active?: boolean; cookie_status?: string; last_connected_at?: string; last_health_check?: string } | null;
      if (conn?.is_active && (conn.cookie_status || '').toLowerCase() === 'active') {
        setLinkedInStatus('connected');
        setLastConnectedAt(conn.last_connected_at || null);
      } else if (conn && (conn.cookie_status || '').toLowerCase() === 'expired') {
        setLinkedInStatus('expired');
      } else {
        setLinkedInStatus('not_connected');
      }
      setLastHealthCheck(conn?.last_health_check || null);
      if (!linkedInCookiesEditedRef.current) {
        setLiAt(conn?.li_at_cookie || '');
        setJsessionId(conn?.jsessionid || '');
      }
      const notif = notifRes.data as Partial<NotificationSettings> | null;
      if (notif) {
        setNotificationSettings({
          approval_emails: notif.approval_emails ?? true,
          publish_emails: notif.publish_emails ?? false,
          weekly_summary: notif.weekly_summary ?? true,
          cookie_expired_emails: notif.cookie_expired_emails ?? true,
          system_issue_emails: notif.system_issue_emails ?? true,
        });
      }
    };
    fetch();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!supabase || !user || !profile) return;
    setSaving('profile');
    try {
      await supabase!
        .from('profiles')
        .update({
          full_name: profile.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(null);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  const handleSaveNotificationSettings = async () => {
    if (!supabase || !user) return;
    setSaving('notifications');
    try {
      await supabase.from('user_notification_settings').upsert(
        {
          user_id: user.id,
          approval_emails: notificationSettings.approval_emails,
          publish_emails: notificationSettings.publish_emails,
          weekly_summary: notificationSettings.weekly_summary,
          cookie_expired_emails: notificationSettings.cookie_expired_emails,
          system_issue_emails: notificationSettings.system_issue_emails,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    const token = session?.access_token;
    if (!token) {
      setPasswordError('Session expired. Please sign in again.');
      return;
    }
    setSaving('password');
    try {
      await apiCalls.changePassword(token, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveLinkedIn = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    const li = liAt.trim();
    const js = jsessionId.trim();
    if (!li || !js) {
      setSaveError('Both li_at and JSESSIONID are required.');
      return;
    }
    if (!supabase || !user) return;
    setSaving('linkedin');
    try {
      const { error } = await supabase.from('linkedin_connections').upsert(
        {
          user_id: user.id,
          li_at_cookie: li,
          jsessionid: js,
          is_active: true,
          cookie_status: 'active',
          last_connected_at: new Date().toISOString(),
          last_tested_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        setSaveError(error.message);
        return;
      }
      setSaveSuccess(true);
      setLinkedInStatus('connected');
      setLastConnectedAt(new Date().toISOString());
      linkedInCookiesEditedRef.current = false;
      try {
        sessionStorage.removeItem(COOKIE_DRAFT_KEY_LI);
        sessionStorage.removeItem(COOKIE_DRAFT_KEY_JS);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event('linkedin-connection-updated'));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const handleDisconnect = async () => {
    if (!supabase || !user) return;
    try {
      await supabase!
        .from('linkedin_connections')
        .update({ is_active: false, cookie_status: 'disconnected' })
        .eq('user_id', user.id);
      setLinkedInStatus('not_connected');
      setLastConnectedAt(null);
      setLastHealthCheck(null);
      setLiAt('');
      setJsessionId('');
      linkedInCookiesEditedRef.current = false;
      try {
        sessionStorage.removeItem(COOKIE_DRAFT_KEY_LI);
        sessionStorage.removeItem(COOKIE_DRAFT_KEY_JS);
      } catch {
        /* ignore */
      }
      setDisconnectDialogOpen(false);
      setSaveSuccess(false);
      setSaveError(null);
      toast.success('LinkedIn disconnected');
      window.dispatchEvent(new Event('linkedin-connection-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="min-h-0 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#10153E]">Settings</h1>
          <p className="mt-1 text-sm text-[#6B7098]">Manage your account, security, and preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-[#F6F8FC] border border-[#6B7098]/10 w-full sm:w-auto">
          <TabsTrigger value="account" className="data-[state=active]:bg-white data-[state=active]:text-[#10153E]">
            Account
          </TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:bg-white data-[state=active]:text-red-600">
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" forceMount className="data-[state=inactive]:hidden space-y-6">
          {/* Profile */}
          <section className="rounded-lg border border-[#6B7098]/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#10153E] mb-4">Profile</h2>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16 rounded-lg border border-[#6B7098]/10">
                <AvatarImage src={profile?.avatar_url} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-[#6366F1]/20 text-[#6366F1] font-semibold">
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-[#10153E]">{profile?.full_name || 'Your name'}</p>
                <p className="text-sm text-[#6B7098]">{profile?.email || user?.email}</p>
              </div>
            </div>
            <Separator className="mb-4 bg-[#6B7098]/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="space-y-2">
                <Label className="text-[#10153E] font-medium">Full name</Label>
                <Input
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  className="h-10 border-[#6B7098]/20"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#10153E] font-medium">Email</Label>
                <Input
                  type="email"
                  value={profile?.email || user?.email || ''}
                  disabled
                  className="h-10 bg-[#F6F8FC] border-[#6B7098]/10 text-[#6B7098]"
                />
              </div>
            </div>
            <Button size="sm" className="mt-4 bg-[#6366F1] hover:bg-[#4F46E5]" onClick={handleSaveProfile} disabled={!!saving}>
              <Save className="w-4 h-4 mr-2" />
              Save profile
            </Button>
          </section>

          {/* Password */}
          <section className="rounded-lg border border-[#6B7098]/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#10153E] mb-4">Password</h2>
            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm mb-4">{passwordError}</div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label className="text-[#10153E] font-medium">Current password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="pr-10 h-10 border-[#6B7098]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7098]"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#10153E] font-medium">New password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="At least 8 characters"
                    className="pr-10 h-10 border-[#6B7098]/20"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7098]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#10153E] font-medium">Confirm new password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="h-10 border-[#6B7098]/20"
                  required
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" className="bg-[#6366F1] hover:bg-[#4F46E5]" disabled={!!saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Change password
                </Button>
                <Link to="/auth/forgot-password" className="text-sm text-[#6366F1] hover:underline font-medium">Forgot password?</Link>
              </div>
            </form>
          </section>

          {/* LinkedIn */}
          <section className="rounded-lg border border-[#6B7098]/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#10153E] mb-4">LinkedIn</h2>
            <p className="text-sm text-[#6B7098] mb-4">
              We never ask for your LinkedIn password. Cookies are standard session tokens; your data is encrypted and you can disconnect anytime.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-[#6B7098]/10 bg-[#F6F8FC] p-3">
                <p className="text-xs font-medium text-[#6B7098]">Status</p>
                {linkedInStatus === 'connected' && <Badge className="mt-1 bg-emerald-600">Connected</Badge>}
                {linkedInStatus === 'expired' && <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">Expired</Badge>}
                {linkedInStatus === 'not_connected' && <Badge variant="secondary" className="mt-1 bg-[#6B7098]/10 text-[#6B7098]">Not connected</Badge>}
              </div>
              <div className="rounded-lg border border-[#6B7098]/10 bg-[#F6F8FC] p-3">
                <p className="text-xs font-medium text-[#6B7098]">Last connected</p>
                <p className="mt-1 text-sm font-medium text-[#10153E]">
                  {lastConnectedAt ? new Date(lastConnectedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-[#6B7098]/10 bg-[#F6F8FC] p-3">
                <p className="text-xs font-medium text-[#6B7098]">Health check</p>
                <p className="mt-1 text-sm font-medium text-[#10153E]">
                  {lastHealthCheck ? new Date(lastHealthCheck).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </p>
              </div>
              {linkedInStatus === 'connected' && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDisconnectDialogOpen(true)}>
                    <Unlink className="w-4 h-4 mr-1" />
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-[#6B7098] mb-2">Paste li_at and JSESSIONID below.</p>
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-[#6366F1] hover:underline mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                How to get cookies
                <ChevronDown className="w-3.5 h-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-[#6B7098] mb-3">
                  F12 → Application (Chrome) or Storage (Firefox) → Cookies → linkedin.com → copy li_at and JSESSIONID. Stored securely; disconnect anytime.
                </p>
              </CollapsibleContent>
            </Collapsible>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="li_at" className="text-[#10153E] font-medium text-sm">li_at</Label>
                <Input
                  id="li_at"
                  type="text"
                  placeholder="Paste li_at value"
                  value={liAt}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLiAt(v);
                    linkedInCookiesEditedRef.current = true;
                    try { sessionStorage.setItem(COOKIE_DRAFT_KEY_LI, v); } catch { /* ignore */ }
                  }}
                  className="h-10 font-mono text-xs border-[#6B7098]/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jsessionid" className="text-[#10153E] font-medium text-sm">JSESSIONID</Label>
                <Input
                  id="jsessionid"
                  type="text"
                  placeholder="Paste JSESSIONID value"
                  value={jsessionId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setJsessionId(v);
                    linkedInCookiesEditedRef.current = true;
                    try { sessionStorage.setItem(COOKIE_DRAFT_KEY_JS, v); } catch { /* ignore */ }
                  }}
                  className="h-10 font-mono text-xs border-[#6B7098]/20"
                />
              </div>
            </div>
            <Button size="sm" className="mt-4 bg-[#6366F1] hover:bg-[#4F46E5]" onClick={handleSaveLinkedIn} disabled={!!saving}>
              <Save className="w-4 h-4 mr-2" />
              Save connection
            </Button>
            {saveSuccess && <p className="mt-2 text-sm text-emerald-600 font-medium">LinkedIn connected successfully</p>}
            {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
          </section>

          {/* Notifications */}
          <section className="rounded-lg border border-[#6B7098]/10 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#10153E] mb-4">Notifications</h2>
            <div className="space-y-1 max-w-xl">
              {[
                { key: 'approval_emails', label: 'Approval emails', desc: 'When a post is ready for approval', set: (c: boolean) => setNotificationSettings((s) => ({ ...s, approval_emails: c })), checked: notificationSettings.approval_emails },
                { key: 'publish_emails', label: 'Publish emails', desc: 'When a post is published', set: (c: boolean) => setNotificationSettings((s) => ({ ...s, publish_emails: c })), checked: notificationSettings.publish_emails },
                { key: 'weekly_summary', label: 'Weekly summary', desc: 'Weekly digest', set: (c: boolean) => setNotificationSettings((s) => ({ ...s, weekly_summary: c })), checked: notificationSettings.weekly_summary },
                { key: 'cookie_expired_emails', label: 'Cookie expired', desc: 'When LinkedIn session expires', set: (c: boolean) => setNotificationSettings((s) => ({ ...s, cookie_expired_emails: c })), checked: notificationSettings.cookie_expired_emails },
                { key: 'system_issue_emails', label: 'System issues', desc: 'Service alerts', set: (c: boolean) => setNotificationSettings((s) => ({ ...s, system_issue_emails: c })), checked: notificationSettings.system_issue_emails },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#6B7098]/10 last:border-0">
                  <div>
                    <p className="font-medium text-[#10153E] text-sm">{item.label}</p>
                    <p className="text-xs text-[#6B7098]">{item.desc}</p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.set} disabled={!!saving} />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-4 bg-[#6366F1] hover:bg-[#4F46E5]" onClick={handleSaveNotificationSettings} disabled={!!saving}>
              <Save className="w-4 h-4 mr-2" />
              Save preferences
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="danger" forceMount className="data-[state=inactive]:hidden">
          <section className="rounded-lg border border-red-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-1">Danger Zone</h2>
            <p className="text-sm text-[#6B7098] mb-6">Irreversible actions.</p>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-[#6B7098]/10">
                <div>
                  <p className="font-medium text-[#10153E]">Disconnect LinkedIn</p>
                  <p className="text-sm text-[#6B7098]">Remove your LinkedIn connection. You can reconnect later.</p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 shrink-0" onClick={() => setDisconnectDialogOpen(true)}>
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-[#10153E]">Sign out</p>
                  <p className="text-sm text-[#6B7098]">Sign out of Postora on this device.</p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 shrink-0" onClick={() => supabase?.auth.signOut().then(() => (window.location.href = '/'))}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect LinkedIn?</DialogTitle>
            <DialogDescription>
              This will remove your LinkedIn connection. You won&apos;t be able to post or engage
              until you reconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
