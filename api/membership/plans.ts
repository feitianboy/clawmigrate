import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PLAN_PRICES } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const plans = [
      {
        id: 'pro_monthly',
        name: 'Pro 月度',
        price: PLAN_PRICES.pro_monthly,
        priceUnit: '元/月',
        features: ['每月无限次迁移', '优先客服支持', '高级导出格式']
      },
      {
        id: 'pro_yearly',
        name: 'Pro 年度',
        price: PLAN_PRICES.pro_yearly,
        priceUnit: '元/年',
        originalPrice: PLAN_PRICES.pro_monthly * 12,
        features: ['每月无限次迁移', '优先客服支持', '高级导出格式', '年付节省 17%']
      },
      {
        id: 'enterprise_monthly',
        name: '企业版 月度',
        price: PLAN_PRICES.enterprise_monthly,
        priceUnit: '元/月',
        features: ['无限次迁移', '专属客服', 'API 访问', '自定义品牌']
      },
      {
        id: 'enterprise_yearly',
        name: '企业版 年度',
        price: PLAN_PRICES.enterprise_yearly,
        priceUnit: '元/年',
        originalPrice: PLAN_PRICES.enterprise_monthly * 12,
        features: ['无限次迁移', '专属客服', 'API 访问', '自定义品牌', '年付节省 17%']
      }
    ];

    return res.json({
      ok: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
