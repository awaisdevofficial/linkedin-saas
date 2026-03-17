import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth-context';
import { OAUTH_BACKEND_URL } from '@/lib/config';
import { PostoraLogo } from '@/components/PostoraLogo';

/**
 * Sign up is LinkedIn only. New users will set a password after first sign-in.
 * Terms and Privacy approval is required.
 */
const Signup = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLinkedIn = () => {
    if (!termsAccepted) return;
    setIsRedirecting(true);
    window.location.href = `${OAUTH_BACKEND_URL}/auth/linkedin`;
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
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Create your account</h1>
            <p className="text-sm text-[#6B7098]">
              Sign up with LinkedIn. After signing in, you&apos;ll set a password so you can also log in with email next time.
            </p>
          </div>

          <div className="mb-6 rounded-2xl bg-[#F6F8FC] border border-[#6B7098]/12 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm text-[#10153E] leading-relaxed select-none">
                I agree to the{' '}
                <Link to="/terms-and-conditions" className="text-[#6366F1] hover:underline font-medium" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="text-[#6366F1] hover:underline font-medium" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <Button
            className="w-full h-12 rounded-full bg-[#0077B5] hover:bg-[#006097] text-white font-medium disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transition-opacity"
            onClick={handleLinkedIn}
            disabled={isRedirecting || !termsAccepted}
            type="button"
          >
            <Linkedin className="w-5 h-5 mr-2" />
            {isRedirecting ? 'Redirecting...' : 'Sign up with LinkedIn'}
          </Button>
          {!termsAccepted && !isRedirecting && (
            <p className="text-center mt-2 text-xs text-[#6B7098]">
              Check the box above to continue
            </p>
          )}

          <p className="text-center mt-6 text-sm text-[#6B7098]">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-[#6366F1] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Signup;
