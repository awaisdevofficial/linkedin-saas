import { useState } from 'react';
import { 
  User, 
  Link2, 
  Bell, 
  AlertTriangle, 
  Save, 
  Eye, 
  EyeOff,
  Trash2,
  Unlink,
  Shield,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCookie, setShowCookie] = useState(false);
  const [showSessionId, setShowSessionId] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/images/avatar-1.jpg',
  });

  const [linkedIn, setLinkedIn] = useState({
    liAt: '',
    jsessionId: '',
  });

  const [notifications, setNotifications] = useState({
    postApproval: true,
    postPublished: true,
    weeklySummary: false,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);

  const handleSaveProfile = () => {
    alert('Profile saved!');
  };

  const handleSaveLinkedIn = () => {
    setIsLinkedInConnected(true);
    alert('LinkedIn credentials saved!');
  };

  const handleSaveNotifications = () => {
    alert('Notification preferences saved!');
  };

  const handleDisconnect = () => {
    setIsLinkedInConnected(false);
    setLinkedIn({ liAt: '', jsessionId: '' });
    setDisconnectDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="card-shadow border-none">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" className="rounded-full">
                  Change Avatar
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-[#F6F8FC]"
                  />
                </div>
              </div>

              <Button 
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleSaveProfile}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LinkedIn Tab */}
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
              {/* How to get cookie */}
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
                    <li>Find "li_at" and "JSESSIONID" cookies</li>
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
                      {showSessionId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                  onClick={handleSaveLinkedIn}
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

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="card-shadow border-none">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F6F8FC]">
                  <div>
                    <p className="font-medium text-[#10153E]">Post Approval</p>
                    <p className="text-sm text-[#6B7098]">Get notified when a post needs approval</p>
                  </div>
                  <Switch
                    checked={notifications.postApproval}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, postApproval: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F6F8FC]">
                  <div>
                    <p className="font-medium text-[#10153E]">Post Published</p>
                    <p className="text-sm text-[#6B7098]">Get notified when a post is published</p>
                  </div>
                  <Switch
                    checked={notifications.postPublished}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, postPublished: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F6F8FC]">
                  <div>
                    <p className="font-medium text-[#10153E]">Weekly Summary</p>
                    <p className="text-sm text-[#6B7098]">Receive a weekly performance summary</p>
                  </div>
                  <Switch
                    checked={notifications.weeklySummary}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, weeklySummary: checked })}
                  />
                </div>
              </div>

              <Button 
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleSaveNotifications}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
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
                    <p className="font-medium text-red-900">Delete All Pending Posts</p>
                    <p className="text-sm text-red-700">This will permanently delete all pending posts</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

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
                    <p className="font-medium text-red-900">Delete Account</p>
                    <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => setDeleteAccountDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Posts Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Pending Posts?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All pending posts will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { setDeleteDialogOpen(false); alert('All pending posts deleted!'); }}
            >
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect LinkedIn?</DialogTitle>
            <DialogDescription>
              This will remove your LinkedIn connection. You won't be able to post or engage until you reconnect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Your Account?</DialogTitle>
            <DialogDescription>
              This action is irreversible. All your data, posts, and settings will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { 
                setDeleteAccountDialogOpen(false); 
                localStorage.removeItem('postpilot_auth');
                window.location.href = '/';
              }}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
