import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../lib/auth-context';
import { OAUTH_BACKEND_URL } from '../../lib/config';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  user_cancelled_authorize: 'You cancelled sign in.',
  missing_code_or_state: 'Invalid sign-in response. Please try again.',
  invalid_state: 'Session expired. Please try again.',
  server_config: 'OAuth is not configured. Contact support.',
  token_exchange_failed: 'Could not complete sign in. Please try again.',
  create_user_failed: 'Could not create account. Try again or sign up with email.',
  server_error: 'Something went wrong. Please try again.',
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setError(OAUTH_ERROR_MESSAGES[err] || err);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (OAUTH_BACKEND_URL) {
      try {
        const res = await fetch(`${OAUTH_BACKEND_URL}/auth/login-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        setError(data.error || 'Invalid email or password');
      } catch {
        setError('Could not reach server. Try again.');
      }
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(formData.email, formData.password);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
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
          <h1 className="text-2xl font-semibold text-[#F2F5FF] mb-2 text-center">
            Welcome back
          </h1>
          <p className="text-[#A7B1D8] text-center mb-8 text-sm">
            Sign in to your account to manage posts and engagement.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#F2F5FF]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/5 border-white/10 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 focus:border-[#4F6DFF] focus:ring-[#4F6DFF]/20 rounded-xl h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#F2F5FF]">
                  Password
                </Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-[#4F6DFF] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/5 border-white/10 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 focus:border-[#4F6DFF] focus:ring-[#4F6DFF]/20 rounded-xl h-11 pr-10"
                  required
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl h-11 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#0B1022] text-[#A7B1D8]">Or sign in with</span>
            </div>
          </div>

          <LinkedInButton />

          <p className="text-center mt-6 text-sm text-[#A7B1D8]">
            Don&apos;t have an account?{' '}
            <Link to="/auth/signup" className="text-[#4F6DFF] hover:underline font-medium">
              Sign up
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

function LinkedInButton() {
  const { signInWithLinkedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkedInSignIn = async () => {
    setIsLoading(true);
    await signInWithLinkedIn();
    setIsLoading(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLinkedInSignIn}
      disabled={isLoading}
      className="w-full border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl h-11"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )}
      Continue with LinkedIn
    </Button>
  );
}
