import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';

const SALT_ROUNDS = 10;
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

  if ((req.method as string) === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Username, email and password are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ ok: false, error: 'Username must be between 3 and 20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: '密码至少需要6个字符' });
    }

    // 密码强度校验：必须包含字母和数字
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ ok: false, error: '密码必须包含字母和数字' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    // Check if username exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ ok: false, error: 'Username already exists' });
    }

    // Check if email exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ ok: false, error: 'Email already exists' });
    }

    // Create user
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role: 'user'
      })
      .select('id, username, email, role')
      .single();

    if (error || !newUser) {
      console.error('Create user error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to create user' });
    }

    await logActivity(newUser.id, 'register', { username: newUser.username }, req.headers['x-forwarded-for'] as string || 'unknown');

    const secret = process.env.JWT_SECRET || 'default_secret';
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username, role: newUser.role },
      secret,
      { expiresIn: '7d' }
    );

    // Set HttpOnly Cookie with token
    const isSecure = req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = [
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${TOKEN_EXPIRY}`,
      isSecure ? 'Secure' : '',
    ].filter(Boolean).join('; ');
    res.setHeader('Set-Cookie', `auth_token=${token}; ${cookieFlags}`);

    return res.status(201).json({
      ok: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
