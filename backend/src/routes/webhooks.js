import express from 'express';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

import { supabase } from '../services/supabase.js';
import { PLAN_MAP } from '../services/polar.js';

const router = express.Router();

router.post(
  '/polar',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      event = validateEvent(
        req.body,
        {
          'webhook-id': req.headers['webhook-id'] ?? '',
          'webhook-timestamp': req.headers['webhook-timestamp'] ?? '',
          'webhook-signature': req.headers['webhook-signature'] ?? '',
        },
        process.env.POLAR_WEBHOOK_SECRET
      );
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
      return res.status(400).json({ error: 'Bad request' });
    }

    const data = event.data;

    try {
      switch (event.type) {
        case 'subscription.created':
        case 'subscription.active':
        case 'subscription.updated': {
          const rawUserId = data.metadata?.user_id;
          const userId = rawUserId != null ? String(rawUserId) : null;
          if (!userId) break;

          const plan = PLAN_MAP[data.productId] || 'pro';
          const status =
            data.status === 'active'
              ? 'active'
              : data.status === 'trialing'
                ? 'trialing'
                : 'inactive';

          await supabase.from('subscriptions').upsert(
            {
              user_id: userId,
              polar_subscription_id: data.id,
              polar_customer_id: data.customerId,
              polar_product_id: data.productId,
              plan,
              status,
              current_period_end: data.currentPeriodEnd?.toISOString?.() ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'polar_subscription_id' }
          );
          break;
        }

        case 'subscription.canceled': {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('polar_subscription_id', data.id);
          break;
        }

        case 'subscription.revoked': {
          await supabase
            .from('subscriptions')
            .update({
              status: 'revoked',
              plan: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('polar_subscription_id', data.id);
          break;
        }

        default:
          // Ignore other webhook types
          break;
      }
    } catch (err) {
      console.error('[Polar Webhook] handler error:', err);
    }

    return res.status(200).json({ received: true });
  }
);

export default router;

