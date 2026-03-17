import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { apiCalls } from '@/lib/api';
import { OAUTH_BACKEND_URL } from '@/lib/config';
import { PostoraLogo } from '@/components/PostoraLogo';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const urlError = searchParams.get('error');
  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [urlError]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLinkedIn = () => {
    window.location.href = `${OAUTH_BACKEND_URL}/auth/linkedin`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const redirect = '/dashboard';
      const { redirectUrl } = await apiCalls.loginEmail(
        formData.email.trim(),
        formData.password,
        redirect
      );
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      setError('Login failed. Try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex flex-col overflow-x-hidden">
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-4 py-8">
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
            <PostoraLogo variant="icon" size="lg" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Welcome back</h1>
            <p className="text-sm text-[#6B7098]">
              Sign in to your account to manage posts and engagement.
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
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#6366F1] focus:ring-[#6366F1]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#10153E]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#6366F1] focus:ring-[#6366F1]/20 pr-12"
                  required
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, rememberMe: checked as boolean })
                  }
                />
                <Label htmlFor="remember" className="text-sm text-[#6B7098] cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Link to="/auth/forgot-password" className="text-sm text-[#6366F1] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <Separator className="flex-1 bg-[#6B7098]/15" />
            <span className="text-xs text-[#6B7098]">Or sign in with</span>
            <Separator className="flex-1 bg-[#6B7098]/15" />
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-full border-[#6B7098]/20 hover:bg-[#F6F8FC]"
            onClick={handleLinkedIn}
            type="button"
          >
            <Linkedin className="w-5 h-5 mr-2 text-[#0077B5]" />
            Continue with LinkedIn
          </Button>

          <p className="text-center mt-6 text-sm text-[#6B7098]">
            Don&apos;t have an account?{' '}
            <Link to="/auth/signup" className="text-[#6366F1] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
