import express from 'express';

import { authenticate } from '../middleware/auth.js';
import { polarClient } from '../services/polar.js';
import { supabase } from '../services/supabase.js';

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
    return res.json(
      sub
        ? {
            plan: sub.plan,
            status: sub.status,
            current_period_end: sub.current_period_end,
          }
        : { plan: 'free', status: 'inactive' }
    );
  } catch (err) {
    console.error('[Polar] subscription error:', err);
    return res.status(500).json({ error: 'Failed to load subscription' });
  }
});

export default router;

