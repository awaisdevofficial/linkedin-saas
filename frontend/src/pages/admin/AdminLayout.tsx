import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ScrollText, LogOut, ToggleLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_KEY_STORAGE, ADMIN_EMAIL_STORAGE, ADMIN_ROLE_STORAGE, getAdminAuth } from '@/lib/config';
import { PostoraLogo } from '@/components/PostoraLogo';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/invoices', label: 'Invoices', icon: FileText },
  { to: '/admin/pages', label: 'Pages & Features', icon: ToggleLeft },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
];

function SidebarContent({
  location,
  onNavClick,
  role,
  onLogout,
}: {
  location: ReturnType<typeof useLocation>;
  onNavClick?: () => void;
  role: string | null;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-[#6B7098]/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PostoraLogo variant="icon" size="sm" />
          <span className="font-semibold text-[#10153E] truncate">POSTORA Admin</span>
        </div>
        {role && (
          <span className="text-xs font-medium px-2 py-1 rounded-lg bg-[#6B7098]/10 text-[#6B7098] capitalize shrink-0">
            {role.replace('_', ' ')}
          </span>
        )}
      </div>
      <nav className="p-2 flex-1 overflow-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavClick}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${
              location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to))
                ? 'bg-[#6366F1]/10 text-[#6366F1]'
                : 'text-[#6B7098] hover:bg-[#6B7098]/5 hover:text-[#10153E] active:bg-[#6B7098]/10'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-[#6B7098]/10">
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl min-h-[44px] touch-manipulation"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2 shrink-0" />
          Logout
        </Button>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { adminKey: key } = getAdminAuth();
    setAdminKey(key);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    localStorage.removeItem(ADMIN_EMAIL_STORAGE);
    localStorage.removeItem(ADMIN_ROLE_STORAGE);
    setMobileMenuOpen(false);
    navigate('/admin/login');
  };

  const role = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_ROLE_STORAGE) : null;

  if (!authChecked) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  if (!adminKey) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#6B7098]/10 flex-col shrink-0">
        <SidebarContent location={location} role={role} onLogout={handleLogout} />
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white border-r border-[#6B7098]/10 flex flex-col shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          location={location}
          role={role}
          onLogout={handleLogout}
          onNavClick={() => setMobileMenuOpen(false)}
        />
      </aside>

      {/* Main content + mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[#6B7098]/10 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#10153E] hover:bg-[#6B7098]/5 active:bg-[#6B7098]/10 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <PostoraLogo variant="icon" size="sm" />
            <span className="font-semibold text-[#10153E] truncate">POSTORA Admin</span>
          </div>
          <div className="w-[44px]" />
        </header>
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
