import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - bracket filename
import handler from '../[...path]';

export default async function (req: VercelRequest, res: VercelResponse) {
  const orderId = req.query.orderId;
  if (typeof orderId !== 'string' || !orderId) {
    return res.status(400).json({ ok: false, error: 'Invalid order ID' });
  }

  // 让主路由处理器按 /api/admin/orders/:orderId 路由
  (req.query as Record<string, unknown>)['...path'] = ['orders', orderId];

  return handler(req, res);
}
