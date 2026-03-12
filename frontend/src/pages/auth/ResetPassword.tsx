import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../lib/auth-context';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const { error } = await updatePassword(formData.password);
    
    setIsLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(79,109,255,0.15)_0%,_transparent_50%)]" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-lg">LF</span>
            </div>
            <span className="text-2xl font-semibold text-[#F2F5FF]">PostPilot</span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {!isSuccess ? (
            <>
              <h1 className="text-2xl font-semibold text-[#F2F5FF] mb-2 text-center">
                Create new password
              </h1>
              <p className="text-[#A7B1D8] text-center mb-8 text-sm">
                Choose a new password. Use at least 8 characters.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B] text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#F2F5FF]">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-white/5 border-white/10 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 focus:border-[#4F6DFF] focus:ring-[#4F6DFF]/20 rounded-xl h-11 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#F2F5FF]">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="bg-white/5 border-white/10 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 focus:border-[#4F6DFF] focus:ring-[#4F6DFF]/20 rounded-xl h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-sm text-[#FF6B6B]">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !!(formData.confirmPassword && formData.password !== formData.confirmPassword)}
                  className="w-full bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl h-11 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#27C696]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#27C696]" />
              </div>
              <h2 className="text-xl font-semibold text-[#F2F5FF] mb-2">
                Password reset successful
              </h2>
              <p className="text-[#A7B1D8] mb-4">
                Your password has been reset. Redirecting you to login...
              </p>
            </div>
          )}

          <p className="text-center mt-6 text-sm text-[#A7B1D8]">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-[#4F6DFF] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
