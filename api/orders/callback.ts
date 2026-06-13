import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findOrderByOrderId, updateOrderStatus, updateMembership } from '../../lib/membership';
import { logActivity, getTierFromPlan, getExpireAt } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { path } = req.query;
    const orderId = Array.isArray(path) ? path.join('/') : path;

    if (!orderId) {
      return res.json({ ok: true, message: 'Order ID required' });
    }

    const { status, transactionId } = req.body;

    console.log(`Payment callback received for order ${orderId}:`, req.body);

    const order = await findOrderByOrderId(orderId as string);

    if (!order) {
      return res.json({ ok: true, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.json({ ok: true, message: 'Order already processed' });
    }

    if (status === 'success' || status === 'paid') {
      const paidAt = new Date();
      await updateOrderStatus(orderId as string, 'paid', paidAt);
      const tier = getTierFromPlan(order.plan);
      const expireAt = getExpireAt(order.plan);
      await updateMembership(order.user_id, tier, expireAt);

      await logActivity(
        order.user_id,
        'payment_success',
        {
          orderId,
          transactionId,
          plan: order.plan,
          tier,
          paidAt: paidAt.toISOString()
        },
        req.headers['x-forwarded-for'] || req.ip
      );

      console.log(`Payment successful for order ${orderId}, user ${order.user_id} upgraded to ${tier}`);
    } else if (status === 'failed') {
      await updateOrderStatus(orderId as string, 'cancelled');

      await logActivity(
        order.user_id,
        'payment_failed',
        { orderId, reason: 'Payment gateway reported failure' },
        req.headers['x-forwarded-for'] || req.ip
      );
    }

    return res.json({ ok: true, message: 'Callback processed' });
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.json({ ok: true, message: 'Callback received' });
  }
}
