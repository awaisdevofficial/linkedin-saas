import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Mail, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../lib/auth-context';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const { error } = await resetPassword(email);
    
    setIsLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setIsSubmitted(true);
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
          {!isSubmitted ? (
            <>
              <h1 className="text-2xl font-semibold text-[#F2F5FF] mb-2 text-center">
                Reset your password
              </h1>
              <p className="text-[#A7B1D8] text-center mb-8">
                Enter your email address and we&apos;ll send you a link to reset your password.
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-[#F2F5FF] placeholder:text-[#A7B1D8]/50 focus:border-[#4F6DFF] focus:ring-[#4F6DFF]/20 rounded-xl h-11"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl h-11 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#27C696]/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#27C696]" />
              </div>
              <h2 className="text-xl font-semibold text-[#F2F5FF] mb-2">
                Check your email
              </h2>
              <p className="text-[#A7B1D8] mb-6">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-[#F2F5FF]">{email}</span>
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-[#27C696]">
                <CheckCircle className="w-4 h-4" />
                <span>Email sent successfully</span>
              </div>
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
