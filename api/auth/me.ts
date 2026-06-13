import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Enable CORS with credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const { user } = result;

    return res.json({
      ok: true,
      data: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        role: user!.role
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
