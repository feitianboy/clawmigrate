import type { VercelRequest, VercelResponse } from '@vercel/node';

// 动态路由：/api/plan/[action]
// action: me | trial | checkout

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

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

// GET /api/plan/me — 获取当前用户套餐信息
async function handleMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  // 未登录用户默认1次免费额度
  const userId = getUserIdFromCookie(req);
  if (!userId) {
    return res.status(200).json({
      ok: true,
      plan: null,
      monthlyUsage: 0,
      usageLimit: 1,
      planExpiry: null,
    });
  }

  // TODO: 从 Supabase 查询用户套餐数据
  // const { data } = await supabase.from('user_plans').select('*').eq('user_id', userId).single();

  return res.status(200).json({
    ok: true,
    plan: 'free',
    monthlyUsage: 0,
    usageLimit: 1,
    planExpiry: null,
  });
}

// POST /api/plan/trial — 开启7天免费试用
async function handleTrial(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  const userId = getUserIdFromCookie(req);
  if (!userId) {
    return res.status(401).json({ ok: false, error: '请先登录' });
  }

  // TODO: 检查用户是否已经使用过试用，写入 Supabase
  // const { data: existing } = await supabase.from('user_plans').select('trial_used').eq('user_id', userId).single();
  // if (existing?.trial_used) return res.status(400).json({ ok: false, error: '试用已使用' });

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // TODO: 写入 Supabase
  // await supabase.from('user_plans').upsert({ user_id: userId, plan: 'pro', plan_expiry: trialEnd, trial_used: true });

  return res.status(200).json({
    ok: true,
    trialEnd,
  });
}

// POST /api/plan/checkout — 预留支付接口
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '方法不允许' });
  }

  return res.status(200).json({
    ok: false,
    error: '支付渠道暂未开通',
  });
}

// 从 HttpOnly Cookie 中提取用户 ID
function getUserIdFromCookie(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/user_id=([^;]+)/);
  return match ? match[1] : null;
}
