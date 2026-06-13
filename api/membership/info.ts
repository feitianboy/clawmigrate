import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { getMembershipInfo } from '../../lib/membership';
import { getTierName, getTierBenefits } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const info = await getMembershipInfo(result.user!.id);

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
          remaining: info.usage.unlimited ? -1 : Math.max(0, info.usage.limit - info.usage.used)
        },
        benefits: getTierBenefits(info.tier)
      }
    });
  } catch (error) {
    console.error('Get membership info error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
