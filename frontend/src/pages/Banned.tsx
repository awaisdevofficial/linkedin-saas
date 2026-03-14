import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const CONTACT_EMAIL = 'contact.awais.ai@gmail.com';

const BannedPage = () => {
  const { signOut } = useAuth();
  const [banReason, setBanReason] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const r = sessionStorage.getItem('postpilot_ban_reason');
      if (r) {
        setBanReason(r);
        sessionStorage.removeItem('postpilot_ban_reason');
      }
    } catch (_) {}
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#10153E] mb-3">Account Suspended</h1>
        {banReason && (
          <p className="text-[#6B7098] mb-4 p-4 bg-amber-50 rounded-xl text-left">{banReason}</p>
        )}
        <p className="text-[#6B7098] mb-2">
          Contact us if you believe this is an error.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-[#2D5AF6] font-medium hover:underline block mb-8"
        >
          {CONTACT_EMAIL}
        </a>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="rounded-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default BannedPage;
