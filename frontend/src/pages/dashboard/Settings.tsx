import { useState, useEffect } from 'react';
import {
  User,
  Link2,
  AlertTriangle,
  Save,
  Trash2,
  Unlink,
  Shield,
  Key,
  Lock,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [cookieHelpOpen, setCookieHelpOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [accountSection, setAccountSection] = useState<string>('profile');

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
      setLiAt(conn?.li_at_cookie || '');
      setJsessionId(conn?.jsessionid || '');
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
          access_token: 'cookie-auth',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Settings</h1>
        <p className="text-sm text-[#6B7098]">Manage your account and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" forceMount className="data-[state=inactive]:hidden">
          <Card className="card-shadow border-none">
            <CardContent className="p-0">
              <Accordion type="single" collapsible value={accountSection} onValueChange={(v) => v && setAccountSection(v)} className="w-full">
                <AccordionItem value="profile" className="border-[#6B7098]/10 px-6">
                  <AccordionTrigger className="flex items-center gap-2 hover:no-underline py-4">
                    <User className="w-4 h-4 text-[#6B7098]" />
                    Profile
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-6">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>
                            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            value={profile?.full_name || ''}
                            onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={profile?.email || user?.email || ''}
                            disabled
                            className="bg-[#F6F8FC]"
                          />
                        </div>
                      </div>
                      <Button size="sm" className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" onClick={handleSaveProfile} disabled={!!saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="password" className="border-[#6B7098]/10 px-6">
                  <AccordionTrigger className="flex items-center gap-2 hover:no-underline py-4">
                    <Key className="w-4 h-4 text-[#6B7098]" />
                    Password
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      {passwordError && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{passwordError}</div>
                      )}
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Current password</Label>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                              placeholder="Current password"
                              className="pr-10 h-9"
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
                          <Label>New password</Label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                              placeholder="At least 8 characters"
                              className="pr-10 h-9"
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
                          <Label>Confirm new password</Label>
                          <Input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder="Confirm new password"
                            className="h-9"
                            required
                          />
                        </div>
                        <Button type="submit" size="sm" className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" disabled={!!saving}>
                          <Save className="w-4 h-4 mr-2" />
                          Change password
                        </Button>
                      </form>
                      <p className="text-sm text-[#6B7098]">
                        <Link to="/auth/forgot-password" className="text-[#2D5AF6] hover:underline font-medium">Forgot password?</Link>
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="linkedin" className="border-[#6B7098]/10 px-6">
                  <AccordionTrigger className="flex items-center gap-2 hover:no-underline py-4">
                    <Link2 className="w-4 h-4 text-[#6B7098]" />
                    LinkedIn
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-5">
                      <div className="rounded-xl border border-[#6366F1]/20 bg-[#EEF2FF]/50 p-4 text-sm text-[#10153E]">
                        <p className="font-medium text-[#10153E] mb-1">Your account is safe</p>
                        <p className="text-[#6B7098]">
                          We never ask for your LinkedIn password. The cookies (li_at and JSESSIONID) are standard session tokens that only allow us to post and engage on your behalf while you’re connected. Your data is encrypted and we don’t share it with third parties. You can disconnect anytime in one click — your LinkedIn account stays under your control.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-[#6B7098]/20 bg-[#F6F8FC]/50 p-3">
                  <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide">Status</p>
                  {linkedInStatus === 'connected' && (
                    <Badge className="mt-1 bg-green-600 hover:bg-green-600">Connected</Badge>
                  )}
                  {linkedInStatus === 'expired' && (
                    <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800 border-amber-200">Session Expired</Badge>
                  )}
                  {linkedInStatus === 'not_connected' && (
                    <Badge variant="secondary" className="mt-1 bg-[#6B7098]/10 text-[#6B7098]">Not Connected</Badge>
                  )}
                </div>
                <div className="rounded-lg border border-[#6B7098]/20 bg-[#F6F8FC]/50 p-3">
                  <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide">Last connected</p>
                  <p className="mt-1 text-[#10153E] font-medium">
                    {lastConnectedAt ? new Date(lastConnectedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-[#6B7098]/20 bg-[#F6F8FC]/50 p-3">
                  <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wide">Last health check</p>
                  <p className="mt-1 text-[#10153E] font-medium">
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

                      <Collapsible open={cookieHelpOpen} onOpenChange={setCookieHelpOpen}>
                        <CollapsibleTrigger className="text-sm font-medium text-[#2D5AF6] hover:underline flex items-center gap-1">
                          How to get your LinkedIn cookies →
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ol className="mt-3 text-sm text-[#6B7098] list-decimal list-inside space-y-1 pl-1">
                            <li>Open LinkedIn in your browser and make sure you&apos;re logged in</li>
                            <li>Press F12 to open Developer Tools</li>
                            <li>Go to the Application tab (Chrome) or Storage tab (Firefox)</li>
                            <li>Click Cookies → https://www.linkedin.com</li>
                            <li>Find li_at → copy the value</li>
                            <li>Find JSESSIONID → copy the value (remove the quotes)</li>
                            <li>Paste both values below and click Save</li>
                          </ol>
                          <p className="mt-3 text-xs text-[#6B7098]">
                            This is the same method many official browser extensions use. Your account is not at risk — we only use these values to schedule and publish posts you approve.
                          </p>
                        </CollapsibleContent>
                      </Collapsible>

                      <p className="text-xs text-[#6B7098]">
                        Paste the cookie values below. They are stored securely and used only for your connected session. Disconnect anytime from this page.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        <div className="space-y-1">
                          <Label htmlFor="li_at" className="text-xs">li_at Cookie</Label>
                          <Input
                            id="li_at"
                            type="text"
                            placeholder="Paste li_at value"
                            value={liAt}
                            onChange={(e) => setLiAt(e.target.value)}
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="jsessionid" className="text-xs">JSESSIONID Cookie</Label>
                          <Input
                            id="jsessionid"
                            type="text"
                            placeholder="Paste JSESSIONID value"
                            value={jsessionId}
                            onChange={(e) => setJsessionId(e.target.value)}
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                        onClick={handleSaveLinkedIn}
                        disabled={!!saving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Connection
                      </Button>

                      {saveSuccess && (
                        <p className="text-sm text-green-600">LinkedIn connected successfully ✅</p>
                      )}
                      {saveError && (
                        <p className="text-sm text-red-600">{saveError}</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notifications" className="border-[#6B7098]/10 px-6">
                  <AccordionTrigger className="flex items-center gap-2 hover:no-underline py-4">
                    <Bell className="w-4 h-4 text-[#6B7098]" />
                    Notifications
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                        <div>
                          <p className="font-medium text-[#10153E] text-sm">Approval emails</p>
                          <p className="text-xs text-[#6B7098]">When a post is ready for your approval</p>
                        </div>
                        <Switch
                          checked={notificationSettings.approval_emails}
                          onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, approval_emails: c }))}
                          disabled={!!saving}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                        <div>
                          <p className="font-medium text-[#10153E] text-sm">Publish emails</p>
                          <p className="text-xs text-[#6B7098]">When a post is published</p>
                        </div>
                        <Switch
                          checked={notificationSettings.publish_emails}
                          onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, publish_emails: c }))}
                          disabled={!!saving}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                        <div>
                          <p className="font-medium text-[#10153E] text-sm">Weekly summary</p>
                          <p className="text-xs text-[#6B7098]">Weekly digest</p>
                        </div>
                        <Switch
                          checked={notificationSettings.weekly_summary}
                          onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, weekly_summary: c }))}
                          disabled={!!saving}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                        <div>
                          <p className="font-medium text-[#10153E] text-sm">Cookie expired</p>
                          <p className="text-xs text-[#6B7098]">When LinkedIn session expires</p>
                        </div>
                        <Switch
                          checked={notificationSettings.cookie_expired_emails}
                          onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, cookie_expired_emails: c }))}
                          disabled={!!saving}
                        />
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-[#10153E] text-sm">System issues</p>
                          <p className="text-xs text-[#6B7098]">Service alerts</p>
                        </div>
                        <Switch
                          checked={notificationSettings.system_issue_emails}
                          onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, system_issue_emails: c }))}
                          disabled={!!saving}
                        />
                      </div>
                      <Button size="sm" className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" onClick={handleSaveNotificationSettings} disabled={!!saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save preferences
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" forceMount className="data-[state=inactive]:hidden">
          <Card className="card-shadow border-none border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">Disconnect LinkedIn</p>
                    <p className="text-sm text-red-700">Remove your LinkedIn connection</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => setDisconnectDialogOpen(true)}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">Sign Out</p>
                    <p className="text-sm text-red-700">Sign out of your account</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => supabase?.auth.signOut().then(() => (window.location.href = '/'))}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
