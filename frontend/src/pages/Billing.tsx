import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  const trial_ends_at = subscription?.trial_ends_at ?? null;
  const trial_expired = subscription?.trial_expired ?? true;
  const daysLeft = trial_ends_at
    ? Math.max(0, Math.ceil((new Date(trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

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
    <div className="min-h-dvh min-h-screen bg-[#F6F8FC] px-4 pb-10 overflow-x-hidden">
      <div className="mx-auto w-full max-w-lg pt-16">
        {!trial_expired && trial_ends_at && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm font-medium text-amber-700">
              ⏳ Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — upgrade to keep full access
            </p>
          </div>
        )}

        {trial_expired && !isActivePro && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm font-medium text-amber-700">
              Your trial has ended — upgrade to continue using Pro features.
            </p>
          </div>
        )}

        <div className="text-center mb-10">
          <p className="mono text-xs uppercase tracking-[0.18em] text-[#6366F1] font-semibold mb-2">
            POSTORA PRO
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[#10153E]">
            Automate your LinkedIn growth
          </h1>
          <p className="text-[#6B7098] mt-3 text-sm sm:text-base max-w-md mx-auto">
            Everything in your LinkedIn content studio, fully unlocked. Post more, sell more, without
            adding extra hours to your week.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-br from-[#6366F1] via-[#A855F7] to-[#22C55E] opacity-70 blur-[14px]" />
          <div className="relative rounded-[24px] border border-white/60 bg-white/90 backdrop-blur-sm shadow-[0_22px_45px_rgba(15,23,42,0.16)] p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#EEF2FF]">
                <Crown size={22} className="text-[#6366F1]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#10153E]">POSTORA Pro</h2>
                <p className="text-xs text-[#6B7098]">$49/month after 3-day free trial</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-[#10153E]">$49</span>
              <span className="text-sm text-[#6B7098]">/month</span>
            </div>

            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50">
                    <Check size={14} className="text-emerald-500" />
                  </span>
                  <span className="text-[#10153E]">{f}</span>
                </li>
              ))}
            </ul>

            {isActivePro ? (
              <div className="space-y-3 pt-1">
                <div className="text-center text-sm font-medium text-emerald-600">
                  Pro — Active
                </div>
                <Button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  variant="outline"
                  className="w-full h-11 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#10153E] text-sm font-medium"
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  {portalLoading ? 'Opening billing portal...' : 'Manage subscription'}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleCheckout}
                  disabled={redirecting}
                  className="w-full h-11 rounded-full bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold shadow-[0_12px_30px_rgba(99,102,241,0.55)]"
                >
                  {redirecting ? 'Redirecting to secure checkout…' : 'Upgrade to Pro'}
                </Button>
                {trial_expired && (
                  <p className="text-center text-xs text-[#6B7098] mt-2">
                    Your trial has ended. Upgrade to keep Pro features.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#6B7098] mt-6">
          No charge for 3 days · Cancel anytime · Secured by Polar.sh
        </p>
        <p className="text-center mt-4">
          <Link to="/pricing" className="text-sm text-[#6366F1] hover:underline">
            View pricing
          </Link>
        </p>
      </div>
    </div>
  );
}

