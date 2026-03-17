import { useState } from 'react';
import { Crown, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

const PRO_FEATURES = [
  'Unlimited AI post generation',
  'LinkedIn auto-reply automation',
  'Bulk post scheduling',
  'RSS content sourcing',
  'Image watermarking',
  'Priority support',
];

export default function BillingPage() {
  const { accessToken } = useAuth();
  const { subscription, loading } = useSubscription();
  const [redirecting, setRedirecting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isActivePro =
    subscription?.plan === 'pro' && (subscription?.status === 'active' || subscription?.status === 'trialing');

  const handleCheckout = async () => {
    if (!accessToken) return;
    setRedirecting(true);
    try {
      const { url } = await api<{ url: string }>('/api/billing/checkout', {
        token: accessToken,
        method: 'POST',
        body: {},
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.');
      setRedirecting(false);
    }
  };

  const handlePortal = async () => {
    if (!accessToken) return;
    setPortalLoading(true);
    try {
      const { url } = await api<{ url: string }>('/api/billing/portal', {
        token: accessToken,
        method: 'POST',
        body: {},
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 overflow-x-hidden">
        <div className="text-[#6B7098]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] p-4 overflow-x-hidden">
      <div className="mx-auto w-full max-w-lg pt-16 pb-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-[#10153E]">PostPilot Pro</h1>
          <p className="text-[#6B7098] mt-2">Automate your LinkedIn growth</p>
        </div>

        <div className="rounded-2xl border border-blue-500 shadow-lg shadow-blue-500/10 bg-white p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Crown size={22} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#10153E]">Pro</h2>
              <p className="text-xs text-[#6B7098]">3-day free trial included</p>
            </div>
          </div>

          <div className="flex items-end gap-1">
            <span className="text-5xl font-bold text-[#10153E]">$49</span>
            <span className="text-[#6B7098] mb-1">/month</span>
          </div>

          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#6B7098]">
                <Check size={15} className="text-green-500 shrink-0" />
                <span className="text-[#10153E]">{f}</span>
              </li>
            ))}
          </ul>

          {isActivePro ? (
            <div className="space-y-3">
              <div className="text-center text-sm font-medium text-green-600">
                {subscription?.status === 'trialing' ? 'Trial active — 3 days free' : 'Pro — Active'}
              </div>
              <Button
                onClick={handlePortal}
                disabled={portalLoading}
                variant="outline"
                className="w-full rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#F8FAFC]"
              >
                <ExternalLink size={14} />
                {portalLoading ? 'Opening...' : 'Manage subscription'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCheckout}
              disabled={redirecting}
              className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold"
            >
              {redirecting ? 'Redirecting...' : 'Start 3-day free trial'}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-[#6B7098] mt-6">
          No charge for 3 days · Cancel anytime · Secured by Polar.sh
        </p>
      </div>
    </div>
  );
}

