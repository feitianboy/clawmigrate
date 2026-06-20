import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { canMigrate, getMembershipInfo, getUsage, createOrder, PLAN_PRICES, updateMembership, MembershipTier } from '../../lib/membership';
import { getTierName, getTierBenefits, getTierFromPlan, getExpireAt, logActivity } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = [].concat(req.query['...path'] || []);
  const subPath = segments.join('/');

  if (subPath === 'check' && req.method === 'POST') return handleCheck(req, res);
  if (subPath === 'info' && req.method === 'GET') return handleInfo(req, res);
  if (subPath === 'plans' && req.method === 'GET') return handlePlans(req, res);
  if (subPath === 'usage' && req.method === 'GET') return handleUsage(req, res);
  
  // 新增路由
  if (subPath === 'plan/me' && req.method === 'GET') return handlePlanMe(req, res);
  if (subPath === 'plan/checkout' && req.method === 'POST') return handlePlanCheckout(req, res);

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

    // Debug: raw supabase query
    const { data: rawUser, error: rawError } = await supabase
      .from('users')
      .select('id, username, membership_tier, membership_expire_at')
      .eq('id', result.user!.id)
      .single();

    const info = await getMembershipInfo(result.user!.id);
    return res.json({
      ok: true, data: {
        tier: info.tier, tierName: getTierName(info.tier), expireAt: info.expireAt,
        isExpired: info.isExpired,
        usage: { used: info.usage.used, limit: info.usage.limit, unlimited: info.usage.unlimited, remaining: info.usage.unlimited ? -1 : Math.max(0, info.usage.limit - info.usage.used) },
        benefits: getTierBenefits(info.tier)
      },
      debug: { rawUser, rawError, userId: result.user!.id }
    });
  } catch (error) {
    console.error('Get membership info error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handlePlans(req: VercelRequest, res: VercelResponse) {
  try {
    const plans = [
      { id: 'pro_monthly', name: 'Pro 月度', price: PLAN_PRICES.pro_monthly, priceUnit: '元/月', features: ['无限次迁移', '迁移历史永久保存'] },
      { id: 'pro_yearly', name: 'Pro 年度', price: PLAN_PRICES.pro_yearly, priceUnit: '元/年', originalPrice: PLAN_PRICES.pro_monthly * 12, features: ['无限次迁移', '迁移历史永久保存', '年付节省 17%'] }
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

/**
 * GET /api/membership/plan/me
 * 获取当前用户的套餐详情（含推荐升级方案、首单折扣标记）
 */
async function handlePlanMe(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const info = await getMembershipInfo(result.user!.id);
    const remaining = info.usage.unlimited ? -1 : Math.max(0, info.usage.limit - info.usage.used);
    // 根据当前套餐推荐升级方案
    let suggestedPlan = 'pro_monthly';
    let suggestedPlanPrice = PLAN_PRICES.pro_monthly;

    if (info.tier === 'free') {
      suggestedPlan = 'pro_monthly';
      suggestedPlanPrice = PLAN_PRICES.pro_monthly;
    } else if (info.tier === 'pro') {
      suggestedPlan = 'pro_yearly';
      suggestedPlanPrice = PLAN_PRICES.pro_yearly;
    }

    return res.json({
      ok: true,
      data: {
        tier: info.tier,
        tierName: getTierName(info.tier),
        expireAt: info.expireAt,
        isExpired: info.isExpired,
        usage: {
          used: info.usage.used,
          limit: info.usage.limit,
          unlimited: info.usage.unlimited,
          remaining
        },
        benefits: getTierBenefits(info.tier),
        suggestedPlan,
        suggestedPlanPrice,
        
      }
    });
  } catch (error) {
    console.error('Get plan me error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/membership/plan/checkout
 * @deprecated 已迁移至 /api/orders/create（支持ZPAY支付跳转）
 */
async function handlePlanCheckout(req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    ok: false,
    error: '此接口已废弃，请使用 POST /api/orders/create（传入 plan + payType）'
  });
}
