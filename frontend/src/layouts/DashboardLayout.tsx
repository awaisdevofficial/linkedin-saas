import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Heart,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Posts', href: '/dashboard/posts' },
  { icon: Heart, label: 'Comments', href: '/dashboard/comments' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasLiAtCookie, setHasLiAtCookie] = useState<boolean | null>(null);

  // Check if user has set li_at cookie (for posting, engagement, feed)
  useEffect(() => {
    if (!user?.id) {
      setHasLiAtCookie(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('linkedin_connections')
        .select('li_at_cookie')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setHasLiAtCookie(!!(data.li_at_cookie && data.li_at_cookie.length > 10));
      } else {
        setHasLiAtCookie(false);
      }
    };
    check();
    const channel = supabase
      .channel('layout-li_at')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_connections', filter: `user_id=eq.${user.id}` }, () => {
        check();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    navigate('/');
  };

  const userInitials = user?.user_metadata?.full_name 
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0].toUpperCase() || 'U';

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-[#070A12] flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0B1022] border-r border-white/[0.06] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-sm">LF</span>
            </div>
            <span className="text-xl font-semibold text-[#F2F5FF]">PostPilot</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-[#4F6DFF]/20 text-[#4F6DFF]'
                    : 'text-[#A7B1D8] hover:bg-white/5 hover:text-[#F2F5FF]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#A7B1D8] hover:bg-white/5 hover:text-[#FF6B6B] transition-colors w-full disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span className="font-medium">{isSigningOut ? 'Signing out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#070A12]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            {/* Left: Mobile menu + Search */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Search className="w-4 h-4 text-[#A7B1D8]" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent text-sm text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 outline-none w-48"
                />
              </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl text-[#A7B1D8] hover:bg-white/5 hover:text-[#F2F5FF] transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B6B]" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{userInitials}</span>
                    </div>
                    <span className="hidden sm:block text-sm text-[#F2F5FF]">{userName}</span>
                    <ChevronDown className="w-4 h-4 text-[#A7B1D8]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0B1022] border-white/10">
                  <DropdownMenuItem className="text-[#F2F5FF] focus:bg-white/5 focus:text-[#F2F5FF]">
                    <Link to="/dashboard/settings" className="flex items-center gap-2 w-full">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={isSigningOut}
                    className="text-[#FF6B6B] focus:bg-white/5 focus:text-[#FF6B6B]"
                  >
                    {isSigningOut ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    {isSigningOut ? 'Signing out...' : 'Logout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Prompt to add li_at cookie when not set */}
        {hasLiAtCookie === false && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm">
                Add your LinkedIn cookie (<code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-xs">li_at</code>) in Settings so we can post, comment, and engage on your behalf.
              </p>
            </div>
            <Link
              to="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 font-medium text-sm transition-colors shrink-0"
            >
              Add cookie in Settings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
