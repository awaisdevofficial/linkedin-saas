import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const PendingPage = () => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#10153E] mb-3">Account Pending Approval</h1>
        <p className="text-[#6B7098] mb-6">
          Your account is under review. You'll receive an email once approved.
        </p>
        {user?.email && (
          <p className="text-sm text-[#6B7098] mb-8 font-medium">{user.email}</p>
        )}
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

export default PendingPage;
