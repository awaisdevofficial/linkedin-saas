import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to login */}
        <Link 
          to="/auth/login"
          className="inline-flex items-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to login</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-[28px] p-8 card-shadow">
          {!isSubmitted ? (
            <>
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">PP</span>
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#10153E] mb-2">Reset your password</h1>
                <p className="text-sm text-[#6B7098]">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#10153E]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7098]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-[#6B7098]/20 focus:border-[#2D5AF6] focus:ring-[#2D5AF6]/20 pl-12"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#27C696]/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#27C696]" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#10153E] mb-2">Check your email</h1>
                <p className="text-sm text-[#6B7098]">
                  We've sent a password reset link to <strong className="text-[#10153E]">{email}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <Link to="/auth/reset-password">
                  <Button
                    className="w-full h-12 bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full font-medium"
                  >
                    Continue to reset
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-[#6B7098]"
                  onClick={() => setIsSubmitted(false)}
                >
                  Didn't receive it? Resend
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
