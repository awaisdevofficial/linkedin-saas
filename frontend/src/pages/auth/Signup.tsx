import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { OAUTH_BACKEND_URL } from '@/lib/config';

const Signup = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false,
  });

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
    if (!formData.agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }
      const { error: err } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { full_name: formData.fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(err.message);
        return;
      }
      navigate('/auth/login', {
        replace: true,
        state: { message: 'Check your email to confirm your account.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-lg">PP</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Create your account</h1>
            <p className="text-sm text-[#6B7098]">
              Start your free trial today. No credit card required.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[#10153E]">Full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#10153E]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#10153E]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
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
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeToTerms: checked as boolean })
                }
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm text-[#6B7098] cursor-pointer leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-[#2D5AF6] hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-[#2D5AF6] hover:underline">Privacy Policy</a>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <Separator className="flex-1 bg-[#6B7098]/15" />
            <span className="text-xs text-[#6B7098]">Or continue with</span>
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
            Already have an account?{' '}
            <Link to="/auth/login" className="text-[#2D5AF6] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
