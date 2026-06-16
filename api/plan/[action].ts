import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { getMembershipInfo, getUsage, canMigrate, PLAN_PRICES } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action as string;

  switch (action) {
    case 'me':
      return handleMe(req, res);
    case 'trial':
      return handleTrial(req, res);
    case 'checkout':
      return handleCheckout(req, res);
    default:
      return res.status(404).json({ ok: false, error: '未知的操作' });
  }
}

const TIER_NAMES: Record<string, string> = {
  free: '免费版',
  pro: 'Pro 专业版',
  enterprise: '企业版',
};

const TIER_BENEFITS: Record<string, string[]> = {
  free: ['每月3次迁移', '基础平台支持'],
  pro: ['无限次迁移', '迁移历史永久保存', '所有导出格式', '优先客服支持'],
  enterprise: ['无限次迁移', '迁移历史永久保存', '所有导出格式', '专属客服', '批量迁移'],
};

// GET /api/plan/me — 获取当前用户套餐信息
async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  const authResult = await requireAuth(req);
  if (authResult.error) {
    // 未登录用户
    return res.status(200).json({
      ok: true,
      data: {
        tier: 'free',
        tierName: '免费版',
        expireAt: null,
        isExpired: false,
        usage: { used: 0, limit: 2, unlimited: false, remaining: 2 },
        benefits: TIER_BENEFITS.free,
      },
    });
  }

  try {
    const userId = authResult.user!.id;
    const info = await getMembershipInfo(userId);

    // 补充前端需要的字段
    const tierName = TIER_NAMES[info.tier] || '免费版';
    const benefits = TIER_BENEFITS[info.tier] || TIER_BENEFITS.free;

    // 推荐升级
    let suggestedPlan: string | undefined;
    let suggestedPlanPrice: number | undefined;
    if (info.tier === 'free') {
      suggestedPlan = 'pro_monthly';
      suggestedPlanPrice = PLAN_PRICES.pro_monthly;
    }

    return res.status(200).json({
      ok: true,
      data: {
        tier: info.tier,
        tierName,
        expireAt: info.expireAt,
        isExpired: info.isExpired,
        usage: {
          used: info.usage.used,
          limit: info.usage.limit,
          unlimited: info.usage.unlimited,
          remaining: info.usage.unlimited ? 999 : Math.max(0, info.usage.limit - info.usage.used),
        },
        benefits,
        suggestedPlan,
        suggestedPlanPrice,
      },
    });
  } catch (error) {
    console.error('获取套餐信息失败:', error);
    return res.status(500).json({ ok: false, error: '服务器错误' });
  }
}

// POST /api/plan/trial — 开启7天免费试用
async function handleTrial(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  const authResult = await requireAuth(req);
  if (authResult.error) {
    return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });
  }

  try {
    const userId = authResult.user!.id;
    const info = await getMembershipInfo(userId);

    // 已经是Pro/企业版
    if (info.tier !== 'free') {
      return res.status(400).json({ ok: false, error: '您已经是付费会员' });
    }

    // 开通7天试用
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { updateMembership } = await import('../../lib/membership');
    const success = await updateMembership(userId, 'pro', trialEnd);

    if (!success) {
      return res.status(500).json({ ok: false, error: '开通试用失败' });
    }

    return res.status(200).json({
      ok: true,
      data: { trialEnd: trialEnd.toISOString() },
    });
  } catch (error) {
    console.error('开通试用失败:', error);
    return res.status(500).json({ ok: false, error: '服务器错误' });
  }
}

// POST /api/plan/checkout — 支付接口（暂未开通）
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  return res.status(200).json({
    ok: false,
    error: '支付渠道暂未开通',
  });
}
