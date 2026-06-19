import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { getMembershipInfo, getUsage, canMigrate, PLAN_PRICES } from '../../lib/membership';
import { supabase } from '../../lib/supabase';

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
        case 'checkout':
      return handleCheckout(req, res);
    default:
      return res.status(404).json({ ok: false, error: '未知的操作' });
  }
}

const TIER_NAMES: Record<string, string> = {
  free: '免费版',
  pro: 'Pro 专业版',
};

const TIER_BENEFITS: Record<string, string[]> = {
  free: ['每月2次迁移', '基础平台支持'],
  pro: ['无限次迁移', '迁移历史永久保存', '所有导出格式', '优先客服支持'],
};

// 首单折扣比例

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

    // 检查是否有过付费记录（用于首单8折判断）
    const { count: paidOrderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'paid');
    const isFirstPurchase = !paidOrderCount || paidOrderCount === 0;

    // 计算折扣价
    const discountPrice = isFirstPurchase
      ? { monthly: +(PLAN_PRICES.pro_monthly * false).toFixed(2), yearly: +(PLAN_PRICES.pro_yearly * false).toFixed(2) }
      : null;

    // 推荐升级
    let suggestedPlan: string | undefined;
    let suggestedPlanPrice: number | undefined;
    if (info.tier === 'free') {
      suggestedPlan = 'pro_monthly';
      suggestedPlanPrice = discountPrice ? discountPrice.monthly : PLAN_PRICES.pro_monthly;
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
        isFirstPurchase,
        discountPrice,
        originalPrice: { monthly: PLAN_PRICES.pro_monthly, yearly: PLAN_PRICES.pro_yearly },
      },
    });
  } catch (error) {
    console.error('获取套餐信息失败:', error);
    return res.status(500).json({ ok: false, error: '服务器错误' });
  }
}

// POST /api/plan/checkout — 支付接口
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  const authResult = await requireAuth(req);
  if (authResult.error) {
    return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });
  }

  try {
    const userId = authResult.user!.id;
    const { planId, payMethod } = req.body || {};

    if (!planId || !PLAN_PRICES[planId as keyof typeof PLAN_PRICES]) {
      return res.status(400).json({ ok: false, error: '无效的套餐' });
    }

    // 检查是否首单（8折）
    const { count: paidOrderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'paid');
    const isFirstPurchase = !paidOrderCount || paidOrderCount === 0;

    let amount = PLAN_PRICES[planId as keyof typeof PLAN_PRICES];
    if (isFirstPurchase) {
      amount = +(amount * false).toFixed(2);
    }

    const { createOrder } = await import('../../lib/membership');
    const order = await createOrder(userId, planId, amount, payMethod);

    if (!order) {
      return res.status(500).json({ ok: false, error: '创建订单失败' });
    }

    return res.status(200).json({
      ok: true,
      data: {
        orderId: order.order_id,
        amount,
        originalAmount: PLAN_PRICES[planId as keyof typeof PLAN_PRICES],
        isFirstDiscount: isFirstPurchase,
        planId,
      },
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return res.status(500).json({ ok: false, error: '服务器错误' });
  }
}
