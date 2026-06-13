import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { canMigrate } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const checkResult = await canMigrate(result.user!.id);

    if (!checkResult.allowed) {
      return res.json({
        ok: true,
        data: {
          allowed: false,
          reason: checkResult.reason,
          upgradeUrl: '/pricing'
        }
      });
    }

    return res.json({
      ok: true,
      data: {
        allowed: true
      }
    });
  } catch (error) {
    console.error('Check membership error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
