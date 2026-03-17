import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Zap,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  Settings,
  Crown,
  CreditCard,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspirationalQuote } from '@/components/InspirationalQuote';
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
import { useSubscription } from '@/hooks/useSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { FeatureFlagsProvider, useFeatureFlags } from '@/lib/feature-flags-context';
import { FeatureDisabledPage } from '@/components/FeatureDisabledPage';
import { PostoraLogo } from '@/components/PostoraLogo';

const navItems: { icon: typeof LayoutDashboard; label: string; href: string; tooltip: string; flagKey?: string }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', tooltip: 'Overview and quick stats' },
  { icon: Calendar, label: 'Posts', href: '/dashboard/posts/activity', tooltip: 'Manage and schedule posts', flagKey: 'posts_activity' },
  { icon: MessageSquare, label: 'Comments', href: '/dashboard/comments/activity', tooltip: 'View and reply to comments', flagKey: 'comments_activity' },
  { icon: Zap, label: 'Activity', href: '/dashboard/automation', tooltip: 'Engagement and schedule settings', flagKey: 'automation' },
  { icon: Crown, label: 'Billing', href: '/dashboard/billing', tooltip: 'Upgrade to Pro or manage subscription' },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { isEnabled, getMessage, isLoading: flagsLoading } = useFeatureFlags();
  const trial_ends_at = subscription?.trial_ends_at ?? null;
  const trial_expired = subscription?.trial_expired ?? true;
  const daysLeft = trial_ends_at
    ? Math.max(0, Math.ceil((new Date(trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const welcomeTrialShown = useRef(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'missing' | 'needsCookies' | 'expired'>('missing');
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { notifications, loading: notificationsLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (welcomeTrialShown.current) return;
    if (searchParams.get('welcome_trial') !== '1') return;
    if (!subscription || subscription.trial_expired || !subscription.trial_ends_at) return;
    welcomeTrialShown.current = true;
    toast.success('Your 3-day free trial has started!');
    const next = new URLSearchParams(searchParams);
    next.delete('welcome_trial');
    setSearchParams(next, { replace: true });
  }, [subscription, searchParams, setSearchParams]);

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
        {!trial_expired && trial_ends_at && daysLeft <= 3 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 shrink-0">
            ⏳ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left on your free trial —{' '}
            <Link to="/dashboard/billing" className="font-semibold underline ml-1">
              Upgrade to Pro
            </Link>
          </div>
        )}
        <header className="bg-white border-b border-[#6B7098]/10 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex-1 max-w-md flex items-center min-h-10">
              <InspirationalQuote variant="inline" className="text-[#6B7098]" />
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
              <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open notifications"
                    className="relative p-2 rounded-full hover:bg-[#F6F8FC] transition-colors text-[#6B7098] hover:text-[#10153E] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:ring-offset-2"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#6366F1] text-white text-xs font-medium rounded-full" aria-hidden>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0 z-[100]" sideOffset={8}>
                  <div className="px-4 py-3 border-b border-[#6B7098]/10 flex items-center justify-between">
                    <h3 className="font-semibold text-[#10153E]">Notifications</h3>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                        className="text-xs text-[#6366F1] hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[280px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-6 text-center text-sm text-[#6B7098]">Loading…</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-[#6B7098]">
                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>No notifications yet</p>
                        <p className="text-xs mt-1">Posts and comment activity will appear here when you have updates.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#6B7098]/10">
                        {notifications.map((n) => {
                          const content = (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${!n.read ? 'text-[#10153E]' : 'text-[#6B7098]'}`}>{n.title}</p>
                                {n.message && <p className="text-xs text-[#6B7098] mt-0.5 line-clamp-2">{n.message}</p>}
                                <p className="text-xs text-[#6B7098]/80 mt-1">
                                  {new Date(n.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}{' '}
                                  {new Date(n.created_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                                </p>
                              </div>
                              {n.link && <ExternalLink className="w-4 h-4 text-[#6B7098] shrink-0 mt-0.5" />}
                            </>
                          );
                          const className = `flex gap-3 px-4 py-3 hover:bg-[#F6F8FC] transition-colors text-left w-full ${!n.read ? 'bg-[#6366F1]/5' : ''}`;
                          const onClick = () => { if (!n.read) markAsRead(n.id); setNotificationOpen(false); };
                          return (
                            <li key={n.id}>
                              {n.link ? (
                                <Link to={n.link} onClick={onClick} className={className}>
                                  {content}
                                </Link>
                              ) : (
                                <button type="button" onClick={onClick} className={className}>
                                  {content}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-[#6B7098]/10 p-2">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings?tab=account" className="cursor-pointer">Notification preferences</Link>
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
                    <Link to="/dashboard/billing" className="flex items-center gap-2">
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
                  'Connect LinkedIn so posting and engagement work: add your li_at and JSESSIONID cookies in Settings. We never store your password — only session tokens, and you can disconnect anytime.'}
                {connectionStatus === 'needsCookies' &&
                  'Your LinkedIn connection is incomplete. Add both li_at and JSESSIONID cookies in Settings so publishing and engagement work reliably. Your data is stored securely and used only for your account.'}
                {connectionStatus === 'expired' &&
                  'Your LinkedIn session cookie has expired. Paste a fresh li_at and JSESSIONID in Settings to resume posting and engagement. This is safe and your account stays under your control.'}
              </p>
              <Link
                to="/dashboard/settings?tab=account"
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
