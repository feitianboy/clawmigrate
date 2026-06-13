import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { getOrdersByUserId, findOrderByOrderId, updateOrderStatus, updateMembership, getTierFromPlan, getExpireAt } from '../../lib/membership';
import { logActivity, getPlanName, getStatusName } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : path;

  if (method === 'GET' && (!pathStr || pathStr === 'list')) {
    return handleGetOrders(req, res);
  } else if (method === 'PUT' && pathStr) {
    return handleUpdateOrder(req, res, pathStr);
  } else {
    return res.status(404).json({ ok: false, error: 'Route not found' });
  }
}

async function handleGetOrders(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*, users(username, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, count } = await query;

    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      orderId: order.order_id,
      userId: order.user_id,
      username: order.users?.username || 'Unknown',
      email: order.users?.email || 'Unknown',
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
      data: {
        orders: formattedOrders,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleUpdateOrder(req: VercelRequest, res: VercelResponse, pathStr: string) {
  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    // Parse order ID from path like orders/CM123456
    const orderIdMatch = pathStr?.match(/^orders\/(.+)$/);
    if (!orderIdMatch) {
      return res.status(400).json({ ok: false, error: 'Invalid path' });
    }

    const orderId = orderIdMatch[1];
    const { status } = req.body;

    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const order = await findOrderByOrderId(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    const paidAt = status === 'paid' ? new Date() : undefined;
    const updated = await updateOrderStatus(orderId, status as 'pending' | 'paid' | 'cancelled' | 'refunded', paidAt);

    if (!updated) {
      return res.status(500).json({ ok: false, error: 'Failed to update order' });
    }

    // If payment successful, upgrade user membership
    if (status === 'paid') {
      const tier = getTierFromPlan(order.plan);
      const expireAt = getExpireAt(order.plan);
      await updateMembership(order.user_id, tier, expireAt);
    }

    await logActivity(
      result.user!.id,
      'admin_update_order',
      { orderId, oldStatus: order.status, newStatus: status },
      req.headers['x-forwarded-for'] || req.ip
    );

    return res.json({
      ok: true,
      data: { message: 'Order updated successfully' }
    });
  } catch (error) {
    console.error('Update order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
