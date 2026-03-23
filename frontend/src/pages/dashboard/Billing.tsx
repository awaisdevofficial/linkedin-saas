import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, ExternalLink, CreditCard, History } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { api, apiCalls } from '@/lib/api';
import type { BillingActivityEntry, BillingActivityResponse } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

const PRO_FEATURES = [
  'Unlimited AI post generation',
  'LinkedIn auto-reply automation',
  'Bulk post scheduling',
  'RSS content sourcing',
  'Priority support',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Billing() {
  const { accessToken } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [activityData, setActivityData] = useState<BillingActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isActivePro =
    subscription?.plan === 'pro' && (subscription?.status === 'active' || subscription?.status === 'trialing');
  const trial_ends_at = subscription?.trial_ends_at ?? null;
  const trial_expired = subscription?.trial_expired ?? true;
  const permanentTrial = subscription?.permanent_trial === true;
  const daysLeft = trial_ends_at
    ? Math.max(0, Math.ceil((new Date(trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  useEffect(() => {
    if (!accessToken) {
      setActivityLoading(false);
      return;
    }
    apiCalls
      .getBillingActivity(accessToken)
      .then(setActivityData)
      .catch(() => setActivityData(null))
      .finally(() => setActivityLoading(false));
  }, [accessToken]);

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

  const loading = subLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Billing</h1>
        <p className="text-sm text-[#6B7098]">Manage your plan and view billing activity</p>
      </div>

      {permanentTrial ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-amber-700">
            Lucky you! You are on a VVIP pass with permanent trial access.
          </p>
        </div>
      ) : (!trial_expired && trial_ends_at && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-amber-700">
            Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — upgrade to keep full access
          </p>
        </div>
      ))}

      {trial_expired && !isActivePro && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-amber-700">
            Your trial has ended — upgrade to continue using Pro features.
          </p>
        </div>
      )}

      <Card className="card-shadow border-none">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#EEF2FF]">
              <Crown className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <CardTitle className="text-xl text-[#10153E]">POSTORA Pro</CardTitle>
              <p className="text-xs text-[#6B7098]">$49/month after 3-day free trial</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#10153E]">$49</span>
            <span className="text-sm text-[#6B7098]">/month</span>
          </div>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </span>
                <span className="text-[#10153E]">{f}</span>
              </li>
            ))}
          </ul>
          {isActivePro ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-emerald-600">Pro — Active</p>
              {subscription?.current_period_end && (
                <p className="text-xs text-[#6B7098]">
                  Current period ends {formatDate(subscription.current_period_end)}
                </p>
              )}
              <Button
                onClick={handlePortal}
                disabled={portalLoading}
                variant="outline"
                className="w-full sm:w-auto border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#10153E]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {portalLoading ? 'Opening billing portal...' : 'Manage subscription'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <Button
                onClick={handleCheckout}
                disabled={redirecting}
                className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold"
              >
                {redirecting ? 'Redirecting to checkout…' : 'Upgrade to Pro'}
              </Button>
              {trial_expired && (
                <p className="text-xs text-[#6B7098]">Your trial has ended. Upgrade to keep Pro features.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow border-none">
        <CardHeader className="flex flex-row items-center gap-2">
          <History className="w-5 h-5 text-[#6B7098]" />
          <CardTitle className="text-lg text-[#10153E]">Billing activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <p className="text-sm text-[#6B7098]">Loading activity...</p>
          ) : activityData?.activity?.length ? (
            <ul className="space-y-3">
              {activityData.activity.map((entry: BillingActivityEntry, i: number) => (
                <li
                  key={`${entry.at}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#6B7098]/10 bg-[#F6F8FC]/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-[#6B7098] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#10153E]">{entry.description}</p>
                      <p className="text-xs text-[#6B7098]">
                        {entry.plan === 'pro' ? 'Pro' : entry.plan}
                        {entry.status ? ` · ${entry.status}` : ''}
                      </p>
                    </div>
                  </div>
                  <time className="text-xs text-[#6B7098]" dateTime={entry.at}>
                    {formatDate(entry.at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6B7098]">No billing activity yet.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#6B7098]">
        No charge for 3 days · Cancel anytime · Secured by Polar.sh
      </p>
      <p>
        <Link to="/pricing" className="text-sm text-[#6366F1] hover:underline">
          View pricing
        </Link>
      </p>
    </div>
  );
}
