import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'clawmigrate2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: '请输入管理密码' });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }

    // 生成 admin token
    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { userId: 'admin', username: 'admin', role: 'admin', isAdmin: true },
      secret,
      { expiresIn: '24h' }
    );

    // Set HttpOnly Cookie
    const isSecure = req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = [
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      'Max-Age=86400',
      isSecure ? 'Secure' : '',
    ].filter(Boolean).join('; ');
    res.setHeader('Set-Cookie', `admin_token=${token}; ${cookieFlags}`);

    return res.json({ success: true, message: '验证通过' });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, error: '服务器错误' });
  }
}
