import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { canMigrate, getMembershipInfo, getUsage, PLAN_PRICES } from '../../lib/membership';
import { getTierName, getTierBenefits } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = (req.query.path as string[]) || [];
  const subPath = segments.join('/');

  if (subPath === 'check' && req.method === 'POST') return handleCheck(req, res);
  if (subPath === 'info' && req.method === 'GET') return handleInfo(req, res);
  if (subPath === 'plans' && req.method === 'GET') return handlePlans(req, res);
  if (subPath === 'usage' && req.method === 'GET') return handleUsage(req, res);

  return res.status(404).json({ ok: false, error: 'Membership route not found' });
}

async function handleCheck(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const checkResult = await canMigrate(result.user!.id);
    if (!checkResult.allowed) {
      return res.json({ ok: true, data: { allowed: false, reason: checkResult.reason, upgradeUrl: '/pricing' } });
    }
    return res.json({ ok: true, data: { allowed: true } });
  } catch (error) {
    console.error('Check membership error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleInfo(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const info = await getMembershipInfo(result.user!.id);
    return res.json({
      ok: true, data: {
        tier: info.tier, tierName: getTierName(info.tier), expireAt: info.expireAt,
        isExpired: info.isExpired,
        usage: { used: info.usage.used, limit: info.usage.limit, unlimited: info.usage.unlimited, remaining: info.usage.unlimited ? -1 : Math.max(0, info.usage.limit - info.usage.used) },
        benefits: getTierBenefits(info.tier)
      }
    });
  } catch (error) {
    console.error('Get membership info error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handlePlans(req: VercelRequest, res: VercelResponse) {
  try {
    const plans = [
      { id: 'pro_monthly', name: 'Pro 月度', price: PLAN_PRICES.pro_monthly, priceUnit: '元/月', features: ['每月无限次迁移', '优先客服支持', '高级导出格式'] },
      { id: 'pro_yearly', name: 'Pro 年度', price: PLAN_PRICES.pro_yearly, priceUnit: '元/年', originalPrice: PLAN_PRICES.pro_monthly * 12, features: ['每月无限次迁移', '优先客服支持', '高级导出格式', '年付节省 17%'] },
      { id: 'enterprise_monthly', name: '企业版 月度', price: PLAN_PRICES.enterprise_monthly, priceUnit: '元/月', features: ['无限次迁移', '专属客服', 'API 访问', '自定义品牌'] },
      { id: 'enterprise_yearly', name: '企业版 年度', price: PLAN_PRICES.enterprise_yearly, priceUnit: '元/年', originalPrice: PLAN_PRICES.enterprise_monthly * 12, features: ['无限次迁移', '专属客服', 'API 访问', '自定义品牌', '年付节省 17%'] }
    ];
    return res.json({ ok: true, data: plans });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleUsage(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const usage = await getUsage(result.user!.id);
    return res.json({ ok: true, data: { used: usage.used, limit: usage.limit, unlimited: usage.unlimited, remaining: usage.unlimited ? -1 : Math.max(0, usage.limit - usage.used) } });
  } catch (error) {
    console.error('Get usage error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
