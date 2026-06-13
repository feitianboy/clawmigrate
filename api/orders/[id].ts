import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { findOrderByOrderId, updateOrderStatus, getTierFromPlan, getExpireAt } from '../../lib/membership';
import { logActivity, getPlanName, getStatusName } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : path;

  if (method === 'GET' && pathStr) {
    return handleGetOrder(req, res, pathStr);
  } else if (method === 'POST' && pathStr && pathStr.endsWith('/cancel')) {
    const orderId = pathStr.replace('/cancel', '');
    return handleCancelOrder(req, res, orderId);
  } else {
    return res.status(404).json({ ok: false, error: 'Route not found' });
  }
}

async function handleGetOrder(req: VercelRequest, res: VercelResponse, orderId: string) {
  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const order = await findOrderByOrderId(orderId);

    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    if (order.user_id !== result.user!.id) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    return res.json({
      ok: true,
      data: {
        orderId: order.order_id,
        plan: order.plan,
        planName: getPlanName(order.plan),
        amount: order.amount,
        payMethod: order.pay_method,
        status: order.status,
        statusName: getStatusName(order.status),
        createdAt: order.created_at,
        paidAt: order.paid_at
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleCancelOrder(req: VercelRequest, res: VercelResponse, orderId: string) {
  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const order = await findOrderByOrderId(orderId);

    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    if (order.user_id !== result.user!.id) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Only pending orders can be cancelled' });
    }

    const updated = await updateOrderStatus(orderId, 'cancelled');

    if (!updated) {
      return res.status(500).json({ ok: false, error: 'Failed to cancel order' });
    }

    await logActivity(
      result.user!.id,
      'cancel_order',
      { orderId },
      req.headers['x-forwarded-for'] || req.ip
    );

    return res.json({
      ok: true,
      data: { message: 'Order cancelled successfully' }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
