import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { createOrder, PLAN_PRICES, PlanType } from '../../lib/membership';
import { logActivity } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const { plan, payMethod } = req.body;

    // Validate plan
    if (!plan || !PLAN_PRICES[plan as PlanType]) {
      return res.status(400).json({ ok: false, error: 'Invalid plan' });
    }

    // Validate payment method
    const validPayMethods = ['wechat', 'alipay', 'stripe'];
    if (payMethod && !validPayMethods.includes(payMethod)) {
      return res.status(400).json({ ok: false, error: 'Invalid payment method' });
    }

    const amount = PLAN_PRICES[plan as PlanType];

    // Create order
    const order = await createOrder(
      result.user!.id,
      plan as PlanType,
      amount,
      payMethod as 'wechat' | 'alipay' | 'stripe' | undefined
    );

    if (!order) {
      return res.status(500).json({ ok: false, error: 'Failed to create order' });
    }

    await logActivity(
      result.user!.id,
      'create_order',
      {
        orderId: order.order_id,
        plan,
        amount
      },
      req.headers['x-forwarded-for'] || req.ip
    );

    return res.status(201).json({
      ok: true,
      data: {
        orderId: order.order_id,
        amount,
        plan,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
