import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const CONTACT_EMAIL = 'contact.awais.ai@gmail.com';

const ExpiredPage = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#10153E] mb-3">Access Expired</h1>
        <p className="text-[#6B7098] mb-4">
          Your access period has ended. Contact admin to renew.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-[#6366F1] font-medium hover:underline block mb-8"
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

export default ExpiredPage;
