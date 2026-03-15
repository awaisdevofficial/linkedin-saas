import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { apiCalls } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Shown after LinkedIn signup when user has no password set.
 * Email is read-only (from profile); user sets password for future email login.
 */
const SetPassword = () => {
  const navigate = useNavigate();
  const { user, session, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login', { replace: true });
      return;
    }
    if (user?.email) setEmail(user.email);
    else if (supabase && user) {
      supabase.from('profiles').select('email').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.email) setEmail(data.email);
      });
    }
    // If user already has a password (e.g. returning), skip to onboarding/dashboard
    if (user && session?.access_token) {
      apiCalls.hasPassword(session.access_token).then(({ hasPassword }) => {
        if (hasPassword) navigate('/dashboard', { replace: true });
      }).catch(() => {});
    }
  }, [user, authLoading, navigate, session?.access_token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const token = session?.access_token;
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }
    setIsLoading(true);
    try {
      await apiCalls.setPassword(token, password);
      toast.success('Password set. You can now sign in with email or LinkedIn.');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col overflow-x-hidden">
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[28px] p-8 card-shadow">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-lg">PP</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Create a password</h1>
            <p className="text-sm text-[#6B7098]">
              Set a password so you can sign in with email next time. You can always use LinkedIn to sign in too.
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
                value={email}
                disabled
                className="h-12 rounded-xl bg-[#F6F8FC] border-[#6B7098]/20"
              />
              <p className="text-xs text-[#6B7098]">From your LinkedIn account (cannot be changed here)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#10153E]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pr-12"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7098] hover:text-[#10153E]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#10153E]">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7098] hover:text-[#10153E]"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SetPassword;
