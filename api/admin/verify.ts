import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ ok: false, error: '密码不能为空' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return res.status(500).json({ ok: false, error: '服务器配置错误' });
  }

  // 验证密码
  if (password !== adminPassword) {
    return res.status(401).json({ ok: false, error: '密码错误' });
  }

  // 生成 admin token (24小时有效期)
  const adminToken = jwt.sign(
    {
      isAdmin: true,
      type: 'admin',
      timestamp: Date.now(),
    },
    adminPassword, // 使用 ADMIN_PASSWORD 作为密钥
    { expiresIn: '24h' }
  );

  // 设置 cookie
  res.setHeader(
    'Set-Cookie',
    `admin_token=${adminToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`
  );

  return res.json({ ok: true, token: adminToken });
}
