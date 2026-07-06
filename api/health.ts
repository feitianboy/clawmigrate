import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.json({
    ok: true,
    data: {
      status: 'healthy',
      version: 'v2',
      timestamp: new Date().toISOString()
    }
  });
}
