import { useState, useEffect } from 'react';
import {
  User,
  Link2,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Unlink,
  Shield,
  HelpCircle,
  CheckCircle,
  Key,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';
import { OAUTH_BACKEND_URL } from '@/lib/config';
import { toast } from 'sonner';

const Settings = () => {
  const { user, session } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCookie, setShowCookie] = useState(false);
  const [showSessionId, setShowSessionId] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null>(null);
  const [linkedIn, setLinkedIn] = useState({ liAt: '', jsessionId: '' });
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;

    const fetch = async () => {
      const [profileRes, connRes] = await Promise.all([
        client.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).maybeSingle(),
        client
          .from('linkedin_connections')
          .select('li_at_cookie, jsessionid')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      setProfile(profileRes.data as typeof profile);
      const conn = connRes.data as { li_at_cookie?: string; jsessionid?: string } | null;
      const hasConnection = !!(conn?.li_at_cookie || conn?.jsessionid);
      setIsLinkedInConnected(hasConnection);
      setLinkedIn({
        liAt: conn?.li_at_cookie || '',
        jsessionId: conn?.jsessionid || '',
      });
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

  const handleLinkedInOAuth = () => {
    window.location.href = `${OAUTH_BACKEND_URL}/auth/linkedin`;
  };

  const handleSaveLinkedIn = async () => {
    if (!supabase || !user) return;
    const liAt = linkedIn.liAt.trim();
    const jsessionId = linkedIn.jsessionId.trim();
    setSaving('linkedin');
    try {
      const { error } = await supabase.from('linkedin_connections').upsert(
        {
          user_id: user.id,
          li_at_cookie: liAt || null,
          jsessionid: jsessionId || null,
          is_active: true,
          last_connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      setIsLinkedInConnected(!!(liAt || jsessionId));
      setLinkedIn({ liAt: liAt || '', jsessionId: jsessionId || '' });
      toast.success('LinkedIn cookies saved');
      window.dispatchEvent(new Event('linkedin-connection-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save cookies');
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

  const handleDisconnect = async () => {
    if (!supabase || !user) return;
    try {
      await supabase!
        .from('linkedin_connections')
        .update({ is_active: false, li_at_cookie: null, jsessionid: null })
        .eq('user_id', user.id);
      setIsLinkedInConnected(false);
      setLinkedIn({ liAt: '', jsessionId: '' });
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                  <span className="bg-white px-2 text-[#6B7098]">Or use cookie</span>
                </div>
              </div>

              <div className="bg-[#F6F8FC] rounded-xl p-4">
                <button
                  onClick={() => setShowCookieHelp(!showCookieHelp)}
                  className="flex items-center gap-2 text-sm text-[#2D5AF6] font-medium"
                >
                  <HelpCircle className="w-4 h-4" />
                  How to get your LinkedIn cookies
                </button>
                {showCookieHelp && (
                  <ol className="mt-3 text-sm text-[#6B7098] space-y-2 list-decimal list-inside">
                    <li>Open linkedin.com in your browser</li>
                    <li>Press F12 to open Developer Tools</li>
                    <li>Go to Application → Cookies → https://www.linkedin.com</li>
                    <li>Find &quot;li_at&quot; and &quot;JSESSIONID&quot; cookies</li>
                    <li>Copy their values and paste below</li>
                  </ol>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>li_at Cookie</Label>
                  <div className="relative">
                    <Input
                      type={showCookie ? 'text' : 'password'}
                      value={linkedIn.liAt}
                      onChange={(e) => setLinkedIn({ ...linkedIn, liAt: e.target.value })}
                      placeholder="Paste your li_at cookie here"
                      className="pr-12 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCookie(!showCookie)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7098]"
                    >
                      {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>JSESSIONID</Label>
                  <div className="relative">
                    <Input
                      type={showSessionId ? 'text' : 'password'}
                      value={linkedIn.jsessionId}
                      onChange={(e) => setLinkedIn({ ...linkedIn, jsessionId: e.target.value })}
                      placeholder="Paste your JSESSIONID here"
                      className="pr-12 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSessionId(!showSessionId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7098]"
                    >
                      {showSessionId ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                  onClick={handleSaveLinkedIn}
                  disabled={!!saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                {isLinkedInConnected && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDisconnectDialogOpen(true)}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                )}
              </div>
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
