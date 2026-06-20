import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';
import { requireAuth } from '../../lib/auth';

const SALT_ROUNDS = 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = (req.query.path as string[]) || [];
  const subPath = segments.join('/');

  if (subPath === 'github' && req.method === 'GET') return handleGithub(req, res);
  if (subPath === 'github/callback' && req.method === 'GET') return handleGithubCallback(req, res);
  if (subPath === 'login' && req.method === 'POST') return handleLogin(req, res);
  if (subPath === 'register' && req.method === 'POST') return handleRegister(req, res);
  if (subPath === 'admin-login' && req.method === 'POST') return handleAdminLogin(req, res);
  if (subPath === 'callback' && req.method === 'GET') return handleGithubCallback(req, res);
  if (subPath === 'check' && req.method === 'GET') return handleCheck(req, res);
  if (subPath === 'me' && req.method === 'GET') return handleMe(req, res);
  if (subPath === 'logout' && req.method === 'POST') return handleLogout(req, res);

  return res.status(404).json({ ok: false, error: 'Auth route not found' });
}

async function handleGithub(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`;
  return res.json({ ok: true, data: { url: githubAuthUrl } });
}

async function handleGithubCallback(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  if (!code) return res.status(400).json({ ok: false, error: 'No code provided' });

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ ok: false, error: 'GitHub OAuth not configured' });

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });
  const tokenData = await tokenResponse.json();
  if (tokenData.error) return res.status(400).json({ ok: false, error: tokenData.error_description || 'Failed to get access token' });

  const userResponse = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  const githubUser = await userResponse.json();

  const emailsResponse = await fetch('https://api.github.com/user/emails', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  const emails = await emailsResponse.json();
  const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary)?.email || emails[0]?.email;

  const { data: existingUser } = await supabase.from('users').select('*').eq('username', githubUser.login).single();
  let user = existingUser;
  if (!existingUser) {
    const { data: newUser, error } = await supabase.from('users').insert({
      username: githubUser.login, email: primaryEmail || `${githubUser.login}@github.local`,
      password_hash: '', role: 'user', phone: String(githubUser.id)
    }).select().single();
    if (error || !newUser) return res.status(500).json({ ok: false, error: 'Failed to create user' });
    user = newUser;
  }

  await logActivity(user.id, 'github_login', { username: user.username }, req.headers['x-forwarded-for'] as string || (req as any).ip);
  const secret = process.env.JWT_SECRET || 'default_secret';
  const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, secret, { expiresIn: '7d' });
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
  return res.redirect(302, `${frontendUrl}/auth/callback?token=${token}`);
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, error: 'Username and password are required' });

  const { data: user } = await supabase.from('users').select('id, username, email, role, password_hash').eq('username', username).single();
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid username or password' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ ok: false, error: 'Invalid username or password' });

  await logActivity(user.id, 'login', { username: user.username }, req.headers['x-forwarded-for'] as string || (req as any).ip);
  const secret = process.env.JWT_SECRET || 'default_secret';
  const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, secret, { expiresIn: '7d' });
  return res.json({ ok: true, data: { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } } });
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ ok: false, error: 'Username, email and password are required' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ ok: false, error: 'Username must be between 3 and 20 characters' });
  if (password.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Invalid email format' });

  const { data: existingUser } = await supabase.from('users').select('id').eq('username', username).single();
  if (existingUser) return res.status(400).json({ ok: false, error: 'Username already exists' });
  const { data: existingEmail } = await supabase.from('users').select('id').eq('email', email).single();
  if (existingEmail) return res.status(400).json({ ok: false, error: 'Email already exists' });

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const { data: newUser, error } = await supabase.from('users').insert({
    username, email, password_hash: passwordHash, role: 'user'
  }).select('id, username, email, role').single();
  if (error || !newUser) return res.status(500).json({ ok: false, error: 'Failed to create user' });

  await logActivity(newUser.id, 'register', { username: newUser.username }, req.headers['x-forwarded-for'] as string || (req as any).ip);
  const secret = process.env.JWT_SECRET || 'default_secret';
  const token = jwt.sign({ userId: newUser.id, username: newUser.username, role: newUser.role }, secret, { expiresIn: '7d' });
  return res.status(201).json({ ok: true, data: { token, user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role } } });
}

async function handleAdminLogin(req: VercelRequest, res: VercelResponse) {
  const { password } = req.body;
  if (!password) return res.status(400).json({ ok: false, error: 'Password is required' });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(500).json({ ok: false, error: 'Admin login not configured' });
  if (password !== adminPassword) return res.status(401).json({ ok: false, error: 'Invalid admin password' });

  const secret = process.env.JWT_SECRET || 'default_secret';
  const token = jwt.sign({ role: 'admin', isAdmin: true }, secret, { expiresIn: '24h' });
  return res.json({ ok: true, data: { token } });
}

async function handleCheck(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.json({ ok: true, data: { authenticated: false } });

    const secret = process.env.JWT_SECRET || 'default_secret';
    const decoded = jwt.verify(token, secret) as any;
    return res.json({ ok: true, data: { authenticated: true, userId: decoded.userId, username: decoded.username, role: decoded.role } });
  } catch {
    return res.json({ ok: true, data: { authenticated: false } });
  }
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const result = await requireAuth(req);
  if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });
  return res.json({ ok: true, data: { id: result.user!.id, username: result.user!.username, email: result.user!.email, role: result.user!.role } });
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ ok: true, data: { message: 'Logged out' } });
}
