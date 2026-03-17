import { useState, useEffect } from 'react';
import {
  User,
  Link2,
  AlertTriangle,
  Save,
  Trash2,
  Unlink,
  Shield,
  CheckCircle,
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
import { LinkedInConnect } from '@/components/linkedin/LinkedInConnect';
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
import { OAUTH_BACKEND_URL } from '@/lib/config';
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
  const tabFromUrl = searchParams.get('tab') || 'profile';
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
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [linkedInConnectKey, setLinkedInConnectKey] = useState(0);

  // Sync tab from URL (e.g. /dashboard/settings?tab=notifications)
  useEffect(() => {
    const t = searchParams.get('tab') || 'profile';
    const valid = ['profile', 'password', 'linkedin', 'notifications', 'danger'].includes(t);
    setActiveTab(valid ? t : 'profile');
  }, [searchParams]);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;

    const fetch = async () => {
      const [profileRes, connRes, notifRes] = await Promise.all([
        client.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).maybeSingle(),
        client
          .from('linkedin_connections')
          .select('li_at_cookie, jsessionid')
          .eq('user_id', user.id)
          .maybeSingle(),
        client
          .from('user_notification_settings')
          .select('approval_emails, publish_emails, weekly_summary, cookie_expired_emails, system_issue_emails')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setProfile(profileRes.data as typeof profile);
      const conn = connRes.data as { li_at_cookie?: string; jsessionid?: string } | null;
      setIsLinkedInConnected(!!(conn?.li_at_cookie || conn?.jsessionid));
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
    setSearchParams({ tab: value });
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

  const handleLinkedInOAuth = () => {
    window.location.href = `${OAUTH_BACKEND_URL}/auth/linkedin`;
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

  const handleDisconnect = async () => {
    if (!supabase || !user) return;
    try {
      await supabase!
        .from('linkedin_connections')
        .update({ is_active: false, li_at_cookie: null, jsessionid: null })
        .eq('user_id', user.id);
      setIsLinkedInConnected(false);
      setLinkedInConnectKey((k) => k + 1);
      setDisconnectDialogOpen(false);
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
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="card-shadow border-none">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>
                    {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile?.full_name || ''}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, full_name: e.target.value }))
                    }
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

              <Button
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleSaveProfile}
                disabled={!!saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D5AF6]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#2D5AF6]" />
                </div>
                <div>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Change your password to sign in with email, or use LinkedIn</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {passwordError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{passwordError}</div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Current password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="pr-12"
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
                      className="pr-12"
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
                    required
                  />
                </div>
                <Button type="submit" className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" disabled={!!saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Change password
                </Button>
              </form>
              <Separator />
              <p className="text-sm text-[#6B7098]">
                Forgot your password?{' '}
                <Link to="/auth/forgot-password" className="text-[#2D5AF6] hover:underline font-medium">
                  Reset it here
                </Link>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linkedin">
          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LinkedIn Connection</CardTitle>
                  <CardDescription>Manage your LinkedIn integration</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isLinkedInConnected ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      Not connected
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                className="w-full h-12 rounded-full bg-[#0077B5] hover:bg-[#006097]"
                onClick={handleLinkedInOAuth}
              >
                <Link2 className="w-5 h-5 mr-2" />
                Connect with LinkedIn OAuth
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#6B7098]/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[#6B7098]">Or use extension</span>
                </div>
              </div>

              <LinkedInConnect key={linkedInConnectKey} showTitle={false} onConnected={() => setIsLinkedInConnected(true)} />

              {isLinkedInConnected && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setDisconnectDialogOpen(true)}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="card-shadow border-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div>
                  <CardTitle>Notification preferences</CardTitle>
                  <CardDescription>Choose which emails and alerts you receive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                <div>
                  <p className="font-medium text-[#10153E]">Approval emails</p>
                  <p className="text-sm text-[#6B7098]">When a post is ready for your approval</p>
                </div>
                <Switch
                  checked={notificationSettings.approval_emails}
                  onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, approval_emails: c }))}
                  disabled={!!saving}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                <div>
                  <p className="font-medium text-[#10153E]">Publish emails</p>
                  <p className="text-sm text-[#6B7098]">When a post is published</p>
                </div>
                <Switch
                  checked={notificationSettings.publish_emails}
                  onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, publish_emails: c }))}
                  disabled={!!saving}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                <div>
                  <p className="font-medium text-[#10153E]">Weekly summary</p>
                  <p className="text-sm text-[#6B7098]">Weekly digest of your activity</p>
                </div>
                <Switch
                  checked={notificationSettings.weekly_summary}
                  onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, weekly_summary: c }))}
                  disabled={!!saving}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#6B7098]/10">
                <div>
                  <p className="font-medium text-[#10153E]">Cookie expired</p>
                  <p className="text-sm text-[#6B7098]">When your LinkedIn session expires</p>
                </div>
                <Switch
                  checked={notificationSettings.cookie_expired_emails}
                  onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, cookie_expired_emails: c }))}
                  disabled={!!saving}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-[#10153E]">System issues</p>
                  <p className="text-sm text-[#6B7098]">Important service or system alerts</p>
                </div>
                <Switch
                  checked={notificationSettings.system_issue_emails}
                  onCheckedChange={(c) => setNotificationSettings((s) => ({ ...s, system_issue_emails: c }))}
                  disabled={!!saving}
                />
              </div>
              <Button
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleSaveNotificationSettings}
                disabled={!!saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
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
