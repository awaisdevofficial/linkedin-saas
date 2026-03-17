import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Zap,
  Search,
  Bell,
  LogOut,
  Menu,
  ChevronDown
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

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Calendar, label: 'Posts', href: '/dashboard/posts/activity' },
  { icon: MessageSquare, label: 'Comments', href: '/dashboard/comments/activity' },
  { icon: Zap, label: 'Automation', href: '/dashboard/automation' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isLinkedInConnected = false; // Mock state

  const handleLogout = () => {
    localStorage.removeItem('postpilot_auth');
    navigate('/auth/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
          <span className="text-white font-bold text-sm">PP</span>
        </div>
        <span className="font-semibold text-lg text-[#10153E]">PostPilot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#2D5AF6] text-white'
                  : 'text-[#6B7098] hover:bg-[#F6F8FC] hover:text-[#10153E]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#6B7098]/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7098] hover:bg-[#F6F8FC] hover:text-[#10153E] transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#6B7098]/10 flex-col fixed h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-white">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-[#6B7098]/10 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
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

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7098]" />
              <Input
                type="text"
                placeholder="Search posts, comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-full bg-[#F6F8FC] border-none focus:ring-2 focus:ring-[#2D5AF6]/20"
              />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-full hover:bg-[#F6F8FC] transition-colors">
                <Bell className="w-5 h-5 text-[#6B7098]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#2D5AF6] rounded-full" />
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#F6F8FC] transition-colors">
                    <img
                      src="/images/avatar-1.jpg"
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <ChevronDown className="w-4 h-4 text-[#6B7098] hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">Settings</Link>
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

        {/* LinkedIn Connection Banner */}
        {!isLinkedInConnected && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-800">
                Connect LinkedIn to get started: add your li_at cookie in Settings
              </p>
              <Link
                to="/dashboard/settings"
                className="text-sm text-amber-800 font-medium hover:underline"
              >
                Connect in Settings →
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
