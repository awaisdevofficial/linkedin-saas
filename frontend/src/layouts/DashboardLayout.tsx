import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Zap,
  Search,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  FileText,
  Settings,
  Crown,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { FeatureFlagsProvider, useFeatureFlags } from '@/lib/feature-flags-context';
import { FeatureDisabledPage } from '@/components/FeatureDisabledPage';
import { PostoraLogo } from '@/components/PostoraLogo';

const navItems: { icon: typeof LayoutDashboard; label: string; href: string; tooltip: string; flagKey?: string }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', tooltip: 'Overview and quick stats' },
  { icon: Calendar, label: 'Posts', href: '/dashboard/posts/activity', tooltip: 'Manage and schedule posts', flagKey: 'posts_activity' },
  { icon: MessageSquare, label: 'Comments', href: '/dashboard/comments/activity', tooltip: 'View and reply to comments', flagKey: 'comments_activity' },
  { icon: Zap, label: 'Activity', href: '/dashboard/automation', tooltip: 'Engagement and schedule settings', flagKey: 'automation' },
  { icon: FileText, label: 'Invoices', href: '/dashboard/invoices', tooltip: 'Your invoices' },
  { icon: Crown, label: 'Billing', href: '/billing', tooltip: 'Upgrade to Pro or manage subscription' },
];

function pathToFlagKey(pathname: string): string | null {
  if (pathname === '/dashboard/posts/activity') return 'posts_activity';
  if (pathname === '/dashboard/comments/activity') return 'comments_activity';
  if (pathname === '/dashboard/automation') return 'automation';
  return null;
}

function DashboardLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isEnabled, getMessage, isLoading: flagsLoading } = useFeatureFlags();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'missing' | 'needsCookies' | 'expired'>('missing');
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);

  const flagKey = pathToFlagKey(location.pathname);
  const pageDisabled = flagKey != null && !flagsLoading && !isEnabled(flagKey);
  const disabledMessage = flagKey ? getMessage(flagKey) : '';

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;

    type ConnectionRow = {
      li_at_cookie?: string | null;
      jsessionid?: string | null;
      cookie_status?: string | null;
      is_active?: boolean | null;
    } | null;

    const evaluateStatus = (row: ConnectionRow) => {
      if (!row || row.is_active === false) {
        setConnectionStatus('missing');
        return;
      }
      const hasLiAt = !!row.li_at_cookie;
      const hasJsession = !!row.jsessionid;
      const statusRaw = (row.cookie_status || '').toLowerCase();

      if (statusRaw === 'expired') {
        setConnectionStatus('expired');
        return;
      }

      if (!hasLiAt || !hasJsession) {
        setConnectionStatus('needsCookies');
        return;
      }

      setConnectionStatus('ok');
    };

    const fetchConnection = async () => {
      const { data } = await client
        .from('linkedin_connections')
        .select('li_at_cookie, jsessionid, cookie_status, is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      evaluateStatus(data as ConnectionRow);
    };

    const fetchProfile = async () => {
      const { data } = await client
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(data);
    };

    fetchConnection();
    fetchProfile();

    const handler = () => {
      fetchConnection();
    };
    window.addEventListener('linkedin-connection-updated', handler);
    return () => {
      window.removeEventListener('linkedin-connection-updated', handler);
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  const SidebarContent = () => (
    <>
      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-6">
        <PostoraLogo variant="horizontal" showTagline={false} size="sm" />
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const disabled = item.flagKey != null && !flagsLoading && !isEnabled(item.flagKey);
          const tooltipText = disabled && item.flagKey ? getMessage(item.flagKey) : item.tooltip;
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    disabled ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    isActive
                      ? 'bg-[#6366F1] text-white'
                      : 'text-[#6B7098] hover:bg-[#F6F8FC] hover:text-[#10153E]'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>{tooltipText}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#6B7098]/10">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7098] hover:bg-[#F6F8FC] hover:text-[#10153E] transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>Sign out of your account</TooltipContent>
        </Tooltip>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col lg:flex-row">
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#6B7098]/10 flex-col fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent />
      </aside>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-white">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-h-0 lg:ml-64">
        <header className="bg-white border-b border-[#6B7098]/10 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7098]" />
              <Input
                type="text"
                placeholder="Search posts, comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-full bg-[#F6F8FC] border-none focus:ring-2 focus:ring-[#6366F1]/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/dashboard/settings"
                    className="relative p-2 rounded-full hover:bg-[#F6F8FC] transition-colors text-[#6B7098] hover:text-[#10153E]"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open notifications"
                    className="relative p-2 rounded-full hover:bg-[#F6F8FC] transition-colors text-[#6B7098] hover:text-[#10153E] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:ring-offset-2"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#6366F1] rounded-full" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 z-[100]" sideOffset={8}>
                  <div className="px-4 py-3 border-b border-[#6B7098]/10">
                    <h3 className="font-semibold text-[#10153E]">Notifications</h3>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto">
                    <div className="px-4 py-6 text-center text-sm text-[#6B7098]">
                      <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>No new notifications</p>
                      <p className="text-xs mt-1">Posts and comment activity appear here when you have updates.</p>
                    </div>
                  </div>
                  <div className="border-t border-[#6B7098]/10 p-2">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings?tab=notifications" className="cursor-pointer">Notification preferences</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/posts/activity" className="cursor-pointer">View posts activity</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/comments/activity" className="cursor-pointer">View comments</Link>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#F6F8FC] transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                      <AvatarFallback className="bg-[#6366F1]/20 text-[#6366F1] text-sm font-medium">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-[#6B7098] hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/billing" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pricing">Pricing</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {connectionStatus !== 'ok' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800">
                {connectionStatus === 'missing' &&
                  'Connect LinkedIn so posting and engagement work: add your li_at and JSESSIONID cookies in Settings or use the LinkedIn OAuth button.'}
                {connectionStatus === 'needsCookies' &&
                  'Your LinkedIn connection is incomplete. Add both li_at and JSESSIONID cookies in Settings so publishing and engagement work reliably.'}
                {connectionStatus === 'expired' &&
                  'Your LinkedIn session cookie has expired. Paste a fresh li_at and JSESSIONID in Settings to resume posting and engagement.'}
              </p>
              <Link
                to="/dashboard/settings?tab=linkedin"
                className="shrink-0 text-sm text-amber-800 font-medium hover:underline"
              >
                Fix in Settings →
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {pageDisabled ? (
            <FeatureDisabledPage message={disabledMessage} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

const DashboardLayout = () => {
  const { accessToken } = useAuth();
  return (
    <FeatureFlagsProvider token={accessToken}>
      <DashboardLayoutInner />
    </FeatureFlagsProvider>
  );
};

export default DashboardLayout;
