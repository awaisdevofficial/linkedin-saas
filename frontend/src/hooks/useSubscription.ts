import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export type Plan = 'free' | 'pro';

export interface Subscription {
  plan: Plan;
  status: string;
  current_period_end?: string;
  trial_ends_at?: string | null;
  trial_expired?: boolean;
  permanent_trial?: boolean;
}

export function useSubscription() {
  const { accessToken } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setSubscription({ plan: 'free', status: 'inactive' });
      setLoading(false);
      return;
    }

    api<Subscription>('/api/billing/subscription', { token: accessToken })
      .then((r) => setSubscription(r))
      .catch(() => setSubscription({ plan: 'free', status: 'inactive' }))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return { subscription, loading };
}

