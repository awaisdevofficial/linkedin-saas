import express from 'express';

import { authenticate } from '../middleware/auth.js';
import { polarClient } from '../services/polar.js';
import { supabase } from '../services/supabase.js';
import { isPermanentTrialUser } from '../config/permanent-trial-users.js';

const router = express.Router();

// POST /api/billing/checkout
router.post('/checkout', authenticate, async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    if (!polarClient) {
      return res.status(500).json({ error: 'Polar not configured' });
    }

    const productId = process.env.POLAR_PRODUCT_ID_PRO;
    if (!productId) return res.status(500).json({ error: 'POLAR_PRODUCT_ID_PRO missing' });
    if (!userEmail) return res.status(400).json({ error: 'User email missing' });

    const checkout = await polarClient.checkouts.create({
      products: [productId],
      customerEmail: userEmail,
      successUrl: `${process.env.FRONTEND_URL}/billing/success?checkout_id={CHECKOUT_ID}`,
      // Link Polar checkout back to Supabase row.
      metadata: { user_id: userId },
    });

    return res.json({ url: checkout.url });
  } catch (err) {
    console.error('[Polar] checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout' });
  }
});

// POST /api/billing/portal
router.post('/portal', authenticate, async (req, res) => {
  try {
    if (!polarClient) {
      return res.status(500).json({ error: 'Polar not configured' });
    }

    const { data: subRows, error } = await supabase
      .from('subscriptions')
      .select('polar_customer_id')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const sub = subRows?.[0] ?? null;
    if (!sub?.polar_customer_id) return res.status(404).json({ error: 'No subscription found' });

    const portal = await polarClient.customerSessions.create({
      customerId: sub.polar_customer_id,
    });

    return res.json({ url: portal.customerPortalUrl });
  } catch (err) {
    console.error('[Polar] portal error:', err);
    return res.status(500).json({ error: 'Failed to open portal' });
  }
});

// GET /api/billing/subscription
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const { data: subRows, error } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const sub = subRows?.[0] ?? null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at')
      .eq('id', req.user.id)
      .single();

    const permanentTrial = isPermanentTrialUser(req.user.id);
    const trial_ends_at = profile?.trial_ends_at ?? null;
    const trial_expired = permanentTrial ? false : (trial_ends_at ? new Date(trial_ends_at) < new Date() : true);

    return res.json({
      ...(sub || { plan: 'free', status: permanentTrial ? 'permanent_trial' : 'inactive' }),
      ...(sub ? { current_period_end: sub.current_period_end } : {}),
      trial_ends_at,
      trial_expired,
      permanent_trial: permanentTrial,
    });
  } catch (err) {
    console.error('[Polar] subscription error:', err);
    return res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// GET /api/billing/activity — subscription + billing activity log
router.get('/activity', authenticate, async (req, res) => {
  try {
    const { data: subRows, error: subErr } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (subErr) throw subErr;
    const sub = subRows?.[0] ?? null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at')
      .eq('id', req.user.id)
      .single();
    const permanentTrial = isPermanentTrialUser(req.user.id);
    const trial_ends_at = profile?.trial_ends_at ?? null;
    const trial_expired = permanentTrial ? false : (trial_ends_at ? new Date(trial_ends_at) < new Date() : true);

    const subscription = {
      ...(sub || { plan: 'free', status: permanentTrial ? 'permanent_trial' : 'inactive' }),
      ...(sub ? { current_period_end: sub.current_period_end } : {}),
      trial_ends_at,
      trial_expired,
      permanent_trial: permanentTrial,
    };

    const activity = [];
    if (sub?.updated_at) {
      const plan = sub.plan || 'pro';
      const status = sub.status || 'inactive';
      if (status === 'active' || status === 'trialing') {
        activity.push({
          type: 'plan_activated',
          plan,
          status,
          at: sub.updated_at,
          description: `${plan === 'pro' ? 'Pro' : plan} plan activated`,
        });
      } else if (status === 'canceled') {
        activity.push({
          type: 'plan_canceled',
          plan,
          status,
          at: sub.updated_at,
          description: 'Subscription canceled',
        });
      } else if (status === 'revoked') {
        activity.push({
          type: 'plan_revoked',
          plan,
          at: sub.updated_at,
          description: 'Subscription ended',
        });
      } else {
        activity.push({
          type: 'plan_updated',
          plan,
          status,
          at: sub.updated_at,
          description: `Plan updated to ${plan}`,
        });
      }
    }

    return res.json({ subscription, activity });
  } catch (err) {
    console.error('[Polar] billing activity error:', err);
    return res.status(500).json({ error: 'Failed to load billing activity' });
  }
});

export default router;

