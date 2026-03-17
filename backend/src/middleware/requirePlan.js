import { supabase } from '../services/supabase.js';

async function getLatestSubscriptionForUser(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

// Usage: router.post('/some-pro-endpoint', authenticate, requirePlan('pro'), handler);
// Only allows access if: active/trialing Pro subscription OR profiles.trial_ends_at > NOW().
// No free plan — everything else returns 403 upgrade_required.
export const requirePlan = (minPlan) => async (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sub = await getLatestSubscriptionForUser(req.user.id);
    const plan = sub?.plan || 'free';
    const status = sub?.status || 'inactive';
    const hasActiveSub = sub && (status === 'active' || status === 'trialing');

    if (hasActiveSub && plan === 'pro') {
      req.subscription = sub;
      return next();
    }

    if (minPlan === 'pro') {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('trial_ends_at')
        .eq('id', req.user.id)
        .single();
      const trialActive = !profileErr && profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
      if (trialActive) {
        req.subscription = sub;
        return next();
      }
      return res.status(403).json({
        error: 'upgrade_required',
        required: 'pro',
        current: plan,
        trial_expired: true,
      });
    }

    return res.status(403).json({
      error: 'upgrade_required',
      required: minPlan,
      current: plan,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to validate subscription' });
  }
};

