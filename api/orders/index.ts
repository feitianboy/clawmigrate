import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { getOrdersByUserId } from '../../lib/membership';
import { getPlanName, getStatusName } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const orders = await getOrdersByUserId(result.user!.id);

    const formattedOrders = orders.map(order => ({
      orderId: order.order_id,
      plan: order.plan,
      planName: getPlanName(order.plan),
      amount: order.amount,
      payMethod: order.pay_method,
      status: order.status,
      statusName: getStatusName(order.status),
      createdAt: order.created_at,
      paidAt: order.paid_at
    }));

    return res.json({
      ok: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
