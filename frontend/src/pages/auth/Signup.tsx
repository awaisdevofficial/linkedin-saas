import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { OAUTH_BACKEND_URL } from '@/lib/config';

/**
 * Sign up is LinkedIn only. New users will set a password after first sign-in.
 */
const Signup = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLinkedIn = () => {
    setIsRedirecting(true);
    window.location.href = `${OAUTH_BACKEND_URL}/auth/linkedin`;
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
              <span className="text-white font-bold text-lg">PP</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#10153E] mb-2">Create your account</h1>
            <p className="text-sm text-[#6B7098]">
              Sign up with LinkedIn. After signing in, you&apos;ll set a password so you can also log in with email next time.
            </p>
          </div>

          <Button
            className="w-full h-12 rounded-full bg-[#0077B5] hover:bg-[#006097] text-white font-medium"
            onClick={handleLinkedIn}
            disabled={isRedirecting}
            type="button"
          >
            <Linkedin className="w-5 h-5 mr-2" />
            {isRedirecting ? 'Redirecting...' : 'Sign up with LinkedIn'}
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
    </div>
  );
};

export default Signup;
