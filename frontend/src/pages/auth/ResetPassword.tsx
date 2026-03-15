import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setHasSession(!!s);
      setSession(s ?? null);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password: formData.password });
      if (err) {
        setError(err.message);
        return;
      }
      // Sync to backend user_passwords so email+password login works
      if (session?.access_token) {
        try {
          await apiCalls.updatePassword(session.access_token, formData.password);
        } catch (_) {
          // Non-fatal; Supabase auth is updated
        }
      }
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasSession === null) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
        <div className="bg-white rounded-[28px] p-8 card-shadow max-w-md text-center">
          <p className="text-[#6B7098] mb-4">
            Your reset link may have expired. Please request a new one.
          </p>
          <Link to="/auth/forgot-password" className="text-[#2D5AF6] hover:underline">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[28px] p-8 card-shadow text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#27C696]/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#27C696]" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Password reset successful</h1>
            <p className="text-sm text-[#6B7098] mb-8">
              Your password has been reset. You can now sign in with your new password.
            </p>

            <Button
              onClick={() => navigate('/auth/login')}
              className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col overflow-x-hidden">
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-4 py-8">
      <div className="w-full max-w-md">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to login</span>
        </Link>

        <div className="bg-white rounded-[28px] p-8 card-shadow">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-lg">PP</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Create new password</h1>
            <p className="text-sm text-[#6B7098]">Enter a new password for your account.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#10153E]">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              <p className="text-xs text-[#6B7098]">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#10153E]">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7098] hover:text-[#10153E]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ResetPassword;
