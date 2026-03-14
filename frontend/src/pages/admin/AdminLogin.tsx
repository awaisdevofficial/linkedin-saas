import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiCalls } from '@/lib/api';
import { ADMIN_KEY_STORAGE, ADMIN_EMAIL_STORAGE, ADMIN_ROLE_STORAGE } from '@/lib/config';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [adminKey, setAdminKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim || !adminKey) {
      setError('Email and API key required');
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiCalls.adminLogin(emailTrim, adminKey);
      if (res?.success && res?.admin) {
        localStorage.setItem(ADMIN_KEY_STORAGE, adminKey);
        localStorage.setItem(ADMIN_EMAIL_STORAGE, res.admin.email);
        localStorage.setItem(ADMIN_ROLE_STORAGE, res.admin.role || 'viewer');
        navigate('/admin');
      } else {
        setError('Invalid response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to home</span>
        </Link>

        <div className="bg-white rounded-[28px] p-8 card-shadow">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Admin Login</h1>
            <p className="text-sm text-[#6B7098]">
              Enter your admin email and API key to access the Admin Panel.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#10153E]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminKey" className="text-[#10153E]">API Key</Label>
              <div className="relative">
                <Input
                  id="adminKey"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Admin API key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pr-12 font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7098] hover:text-[#10153E]"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in to Admin Panel'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/auth/login" className="text-sm text-[#2D5AF6] hover:underline block">
              Back to regular login
            </Link>
            <Link to="/" className="text-sm text-[#6B7098] hover:text-[#10153E] block">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
