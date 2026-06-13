import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ ok: false, error: 'Password is required' });
    }

    // Get admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(500).json({ ok: false, error: 'Admin password not configured' });
    }

    // Verify password
    if (password !== adminPassword) {
      return res.status(401).json({ ok: false, error: 'Invalid password' });
    }

    // Generate admin token with JWT
    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { isAdmin: true, type: 'admin' },
      secret,
      { expiresIn: '24h' }
    );

    // Set HttpOnly cookie
    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    
    return res.json({
      ok: true,
      success: true,
      message: 'Admin authentication successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
