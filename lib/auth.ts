import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

// 管理员 Token 有效期：24 小时（毫秒）
const ADMIN_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;

// 获取 JWT 密钥，未配置则直接抛错（禁止使用默认密钥）
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

// 简易内存速率限制：记录 IP + action 的失败次数
interface RateLimitEntry { count: number; firstAttempt: number; lockedUntil: number; }
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 分钟窗口
const RATE_LIMIT_MAX_FAILURES = 10; // 最多 10 次失败
const RATE_LIMIT_LOCK_DURATION = 15 * 60 * 1000; // 锁定 15 分钟

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry) {
    entry = { count: 0, firstAttempt: now, lockedUntil: 0 };
    rateLimitMap.set(key, entry);
  }
  // 重置过期的窗口
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.firstAttempt = now;
    entry.lockedUntil = 0;
  }
  entry.count++;
  if (entry.count >= RATE_LIMIT_MAX_FAILURES) {
    entry.lockedUntil = now + RATE_LIMIT_LOCK_DURATION;
  }
}

export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

// 获取客户端 IP
export function getClientIp(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string) || (req as any).ip || 'unknown';
}

// Helper function to extract token from cookies
function extractTokenFromCookies(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  
  // Parse cookies string
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {} as Record<string, string>);
  
  return cookies['token'] || null;
}

// Extract token from Authorization header
function extractTokenFromHeader(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// Get token from either cookie or header (cookie takes priority)
function getToken(req: VercelRequest): string | null {
  // Try cookie first (HttpOnly cookie is the secure way)
  const cookieToken = extractTokenFromCookies(req);
  if (cookieToken) return cookieToken;
  
  // Fallback to Authorization header
  return extractTokenFromHeader(req);
}

export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  const token = getToken(req);
  if (!token) {
    return null;
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 从数据库验证用户仍然存在
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    return null;
  }
}

export async function requireAuth(req: VercelRequest): Promise<{ user: AuthUser; error?: undefined } | { user?: undefined; error: { status: number; message: string } }> {
  const token = getToken(req);
  
  if (!token) {
    return { error: { status: 401, message: 'No token provided' } };
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return { error: { status: 500, message: 'Server authentication not configured' } };
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return { error: { status: 401, message: 'User not found' } };
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    return { error: { status: 401, message: 'Invalid token' } };
  }
}

export async function requireAdmin(req: VercelRequest): Promise<{ user: AuthUser; error?: undefined } | { user?: undefined; error: { status: number; message: string } }> {
  // 管理员鉴权：使用 JWT token + admin 角色
  // 支持 X-Admin-Token（管理后台）和 Authorization Bearer（前台用户）两种传递方式
  const adminToken = req.headers['x-admin-token'] as string | undefined;
  const authHeader = req.headers.authorization as string | undefined;

  let token: string | null = null;
  if (adminToken) {
    token = adminToken;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return { error: { status: 401, message: 'No token provided' } };
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return { error: { status: 500, message: 'Server authentication not configured' } };
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 从数据库验证用户仍然存在且是 admin
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return { error: { status: 401, message: 'User not found' } };
    }

    if (user.role !== 'admin') {
      return { error: { status: 403, message: 'Admin access required' } };
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    return { error: { status: 401, message: 'Invalid or expired token' } };
  }
}

// 生成管理员 Token（含时间戳，24h 后过期）
export function generateAdminToken(adminPassword: string): string {
  const payload = `${adminPassword}:${Date.now()}`;
  return Buffer.from(payload).toString('base64');
}

export function generateToken(user: AuthUser): string {
  const secret = getJwtSecret();
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}
