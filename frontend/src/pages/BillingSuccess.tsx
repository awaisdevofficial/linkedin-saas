import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function BillingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/dashboard'), 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6 bg-[#F6F8FC]">
      <CheckCircle size={64} className="text-green-500" />
      <h1 className="text-3xl font-bold text-[#10153E]">You are on Pro</h1>
      <p className="text-[#6B7098]">Your 3-day free trial (or subscription) has started. Redirecting...</p>
    </div>
  );
}

