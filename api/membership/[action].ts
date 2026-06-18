import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { canMigrate, getUsage, getMembershipInfo, PLAN_PRICES } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action as string;

  if (action === 'check' && req.method === 'POST') {
    const authResult = await requireAuth(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });
    }

    try {
      const userId = authResult.user!.id;
      const check = await canMigrate(userId);
      const usage = await getUsage(userId);

      return res.json({
        ok: true,
        data: {
          allowed: check.allowed,
          reason: check.reason,
          usage: {
            used: usage.used,
            limit: usage.limit,
            unlimited: usage.unlimited,
            remaining: usage.unlimited ? 999 : Math.max(0, usage.limit - usage.used),
          },
        },
      });
    } catch (error) {
      console.error('检查迁移权限失败:', error);
      return res.status(500).json({ ok: false, error: '服务器错误' });
    }
  }

  if (action === 'plans' && req.method === 'GET') {
    return res.json({
      ok: true,
      data: [
        {
          id: 'free',
          name: '免费版',
          price: 0,
          migrations: 3,
          features: ['每月2次迁移', '基础平台支持'],
        },
        {
          id: 'pro_monthly',
          name: 'Pro 月度',
          price: PLAN_PRICES.pro_monthly,
          migrations: -1,
          features: ['无限次迁移', '迁移历史永久保存', '所有导出格式', '优先客服支持'],
        },
        {
          id: 'pro_yearly',
          name: 'Pro 年度',
          price: PLAN_PRICES.pro_yearly,
          originalPrice: PLAN_PRICES.pro_monthly * 12,
          migrations: -1,
          features: ['无限次迁移', '迁移历史永久保存', '所有导出格式', '优先客服支持'],
        },
      ],
    });
  }

  if (action === 'info' && req.method === 'GET') {
    const authResult = await requireAuth(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });
    }

    try {
      const userId = authResult.user!.id;
      const info = await getMembershipInfo(userId);

      return res.json({
        ok: true,
        data: {
          tier: info.tier,
          expireAt: info.expireAt,
          isExpired: info.isExpired,
          usage: info.usage,
        },
      });
    } catch (error) {
      console.error('获取会员信息失败:', error);
      return res.status(500).json({ ok: false, error: '服务器错误' });
    }
  }

  if (action === 'usage' && req.method === 'GET') {
    const authResult = await requireAuth(req);
    if (authResult.error) {
      return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });
    }

    try {
      const userId = authResult.user!.id;
      const usage = await getUsage(userId);

      return res.json({
        ok: true,
        data: { usage },
      });
    } catch (error) {
      console.error('获取使用量失败:', error);
      return res.status(500).json({ ok: false, error: '服务器错误' });
    }
  }

  return res.status(404).json({ ok: false, error: 'Membership route not found' });
}
