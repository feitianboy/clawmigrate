import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { getUsage } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const usage = await getUsage(result.user!.id);

    return res.json({
      ok: true,
      data: {
        used: usage.used,
        limit: usage.limit,
        unlimited: usage.unlimited,
        remaining: usage.unlimited ? -1 : Math.max(0, usage.limit - usage.used)
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
