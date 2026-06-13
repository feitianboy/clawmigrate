import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { findOrderByOrderId, updateOrderStatus, updateMembership, createOrder, PLAN_PRICES, PlanType, getOrdersByUserId } from '../../lib/membership';
import { logActivity, getTierFromPlan, getExpireAt, getPlanName, getStatusName } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  const segments = (req.query.path as string[]) || [];
  const subPath = segments.join('/');

  // GET /api/orders → list user's orders
  if (!subPath && req.method === 'GET') return handleListOrders(req, res);

  // POST /api/orders/create → create order
  if (subPath === 'create' && req.method === 'POST') return handleCreateOrder(req, res);

  // POST /api/orders/callback → payment callback
  if (subPath === 'callback' && req.method === 'POST') return handleCallback(req, res);

  // GET /api/orders/:id → get single order
  // POST /api/orders/:id/cancel → cancel order
  if (segments.length >= 1) {
    if (req.method === 'GET') return handleGetOrder(req, res, segments[0]);
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'cancel') return handleCancelOrder(req, res, segments[0]);
  }

  return res.status(404).json({ ok: false, error: 'Order route not found' });
}

async function handleListOrders(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const orders = await getOrdersByUserId(result.user!.id);
    const formattedOrders = orders.map(order => ({
      orderId: order.order_id, plan: order.plan, planName: getPlanName(order.plan),
      amount: order.amount, payMethod: order.pay_method, status: order.status,
      statusName: getStatusName(order.status), createdAt: order.created_at, paidAt: order.paid_at
    }));

    return res.json({ ok: true, data: formattedOrders });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleCreateOrder(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const { plan, payMethod } = req.body;
    if (!plan || !PLAN_PRICES[plan as PlanType]) return res.status(400).json({ ok: false, error: 'Invalid plan' });

    const validPayMethods = ['wechat', 'alipay', 'stripe'];
    if (payMethod && !validPayMethods.includes(payMethod)) return res.status(400).json({ ok: false, error: 'Invalid payment method' });

    const amount = PLAN_PRICES[plan as PlanType];
    const order = await createOrder(result.user!.id, plan as PlanType, amount, payMethod as 'wechat' | 'alipay' | 'stripe' | undefined);
    if (!order) return res.status(500).json({ ok: false, error: 'Failed to create order' });

    await logActivity(result.user!.id, 'create_order', { orderId: order.order_id, plan, amount }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.status(201).json({ ok: true, data: { orderId: order.order_id, amount, plan, status: 'pending' } });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  try {
    const { orderId, status, transactionId } = req.body;
    if (!orderId) return res.json({ ok: true, message: 'Order ID required' });

    const order = await findOrderByOrderId(orderId);
    if (!order) return res.json({ ok: true, message: 'Order not found' });
    if (order.status !== 'pending') return res.json({ ok: true, message: 'Order already processed' });

    if (status === 'success' || status === 'paid') {
      const paidAt = new Date();
      await updateOrderStatus(orderId, 'paid', paidAt);
      const tier = getTierFromPlan(order.plan);
      const expireAt = getExpireAt(order.plan);
      await updateMembership(order.user_id, tier, expireAt);
      await logActivity(order.user_id, 'payment_success', { orderId, transactionId, plan: order.plan, tier, paidAt: paidAt.toISOString() }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    } else if (status === 'failed') {
      await updateOrderStatus(orderId, 'cancelled');
      await logActivity(order.user_id, 'payment_failed', { orderId, reason: 'Payment gateway reported failure' }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    }

    return res.json({ ok: true, message: 'Callback processed' });
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.json({ ok: true, message: 'Callback received' });
  }
}

async function handleGetOrder(req: VercelRequest, res: VercelResponse, orderId: string) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const order = await findOrderByOrderId(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    if (order.user_id !== result.user!.id) return res.status(403).json({ ok: false, error: 'Access denied' });

    return res.json({
      ok: true, data: {
        orderId: order.order_id, plan: order.plan, planName: getPlanName(order.plan),
        amount: order.amount, payMethod: order.pay_method, status: order.status,
        statusName: getStatusName(order.status), createdAt: order.created_at, paidAt: order.paid_at
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
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const order = await findOrderByOrderId(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    if (order.user_id !== result.user!.id) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (order.status !== 'pending') return res.status(400).json({ ok: false, error: 'Only pending orders can be cancelled' });

    const updated = await updateOrderStatus(orderId, 'cancelled');
    if (!updated) return res.status(500).json({ ok: false, error: 'Failed to cancel order' });

    await logActivity(result.user!.id, 'cancel_order', { orderId }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'Order cancelled successfully' } });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
