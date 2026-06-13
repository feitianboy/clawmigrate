import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';

const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Enable CORS with credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Username and password are required' });
    }

    // Find user by username
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role, password_hash')
      .eq('username', username)
      .single();

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }

    await logActivity(user.id, 'login', { username: user.username }, req.headers['x-forwarded-for'] || req.ip);

    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // Set HttpOnly Cookie with token
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TOKEN_EXPIRY}`);

    return res.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
