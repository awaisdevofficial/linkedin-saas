import { supabase } from '../services/supabase.js';

const PLAN_RANK = { free: 0, pro: 1 };

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
export const requirePlan = (minPlan) => async (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sub = await getLatestSubscriptionForUser(req.user.id);
    const plan = sub?.plan || 'free';
    const status = sub?.status || 'inactive';

    const isActive = status === 'active' || status === 'trialing' || plan === 'free';
    const allowed = isActive && PLAN_RANK[plan] >= PLAN_RANK[minPlan];

    if (!allowed) {
      return res.status(403).json({
        error: 'upgrade_required',
        required: minPlan,
        current: plan,
      });
    }

    req.subscription = sub;
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Failed to validate subscription' });
  }
};

