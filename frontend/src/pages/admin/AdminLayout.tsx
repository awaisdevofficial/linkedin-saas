import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, FileText, ScrollText, LogOut, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_KEY_STORAGE, ADMIN_EMAIL_STORAGE, ADMIN_ROLE_STORAGE, getAdminAuth } from '@/lib/config';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/invoices', label: 'Invoices', icon: FileText },
  { to: '/admin/pages', label: 'Pages & Features', icon: ToggleLeft },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
];

export default function AdminLayout() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { adminKey: key } = getAdminAuth();
    setAdminKey(key);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    localStorage.removeItem(ADMIN_EMAIL_STORAGE);
    localStorage.removeItem(ADMIN_ROLE_STORAGE);
    navigate('/admin/login');
  };

  const role = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_ROLE_STORAGE) : null;

  if (adminKey === null) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  if (!adminKey) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <aside className="w-64 bg-white border-r border-[#6B7098]/10 flex flex-col">
        <div className="p-4 border-b border-[#6B7098]/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[#10153E]">Postpilot Admin</span>
          </div>
          {role && (
            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-[#6B7098]/10 text-[#6B7098] capitalize">
              {role.replace('_', ' ')}
            </span>
          )}
        </div>
        <nav className="p-2 flex-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to))
                  ? 'bg-[#2D5AF6]/10 text-[#2D5AF6]'
                  : 'text-[#6B7098] hover:bg-[#6B7098]/5 hover:text-[#10153E]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-[#6B7098]/10">
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
