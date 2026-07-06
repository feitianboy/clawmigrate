import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - bracket filename
import handler from '../[...path]';

export default async function (req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId;
  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ ok: false, error: 'Invalid user ID' });
  }

  // 让主路由处理器按 /api/admin/users/:userId 路由
  (req.query as Record<string, unknown>)['...path'] = ['users', userId];

  return handler(req, res);
}
