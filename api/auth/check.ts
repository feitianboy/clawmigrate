import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/admin_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return res.status(401).json({ ok: false, isAdmin: false, error: 'No token' });
    }

    const secret = process.env.JWT_SECRET || 'default_secret';
    
    try {
      const decoded = jwt.verify(token, secret) as { isAdmin?: boolean; type?: string };
      
      if (decoded.isAdmin && decoded.type === 'admin') {
        return res.json({ ok: true, isAdmin: true });
      } else {
        return res.status(401).json({ ok: false, isAdmin: false, error: 'Invalid token' });
      }
    } catch (jwtError) {
      return res.status(401).json({ ok: false, isAdmin: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
