import { VercelRequest } from '@vercel/node';
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

  const secret = process.env.JWT_SECRET || 'default_secret';

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

  const secret = process.env.JWT_SECRET || 'default_secret';

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
  // 支持两种鉴权方式：
  // 1. X-Admin-Token: 管理后台密码验证后的token（MVP独立密码机制）
  // 2. 用户JWT token + admin角色

  // 方式1: 检查 X-Admin-Token
  const adminToken = req.headers['x-admin-token'] as string | undefined;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (adminToken && adminPassword) {
    try {
      const decoded = Buffer.from(adminToken, 'base64').toString();
      const [pwd] = decoded.split(':');
      if (pwd === adminPassword) {
        // Token验证通过，返回一个虚拟admin用户
        return { user: { id: 0, username: 'admin', email: 'admin@system', role: 'admin' } };
      }
    } catch {
      // Token解析失败，继续尝试方式2
    }
  }

  // 方式2: 检查 x-admin-password（兼容旧调用）
  const adminPwd = req.headers['x-admin-password'] as string | undefined;
  if (adminPwd && adminPassword && adminPwd === adminPassword) {
    return { user: { id: 0, username: 'admin', email: 'admin@system', role: 'admin' } };
  }

  // 方式3: 用户JWT token + admin角色
  const result = await requireAuth(req);
  
  if (result.error) {
    return result;
  }

  if (result.user!.role !== 'admin') {
    return { error: { status: 403, message: 'Admin access required' } };
  }

  return result;
}

export function generateToken(user: AuthUser): string {
  const secret = process.env.JWT_SECRET || 'default_secret';
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}
