import { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export interface AdminJwtPayload {
  userId: string;
  username: string;
  role: string;
  isAdmin: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

// Helper function to extract token from cookies
function extractTokenFromCookies(req: VercelRequest): { token: string | null; isAdminCookie: boolean } {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return { token: null, isAdminCookie: false };
  
  // Parse cookies string
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {} as Record<string, string>);
  
  // Check admin_token first (admin dashboard uses this)
  if (cookies['admin_token']) {
    return { token: cookies['admin_token'], isAdminCookie: true };
  }
  
  return { token: cookies['auth_token'] || null, isAdminCookie: false };
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
  const { token } = extractTokenFromCookies(req);
  if (token) return token;
  return extractTokenFromHeader(req);
}

export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  const token = getToken(req);
  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET || 'default_secret';

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload | AdminJwtPayload;
    
    // If this is an admin token (from admin-login), return admin user
    if ('isAdmin' in decoded && decoded.isAdmin) {
      return {
        id: 0,
        username: 'admin',
        email: 'admin@clawmigrate.xyz',
        role: 'admin'
      };
    }
    
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
    const decoded = jwt.verify(token, secret) as JwtPayload | AdminJwtPayload;
    
    // If this is an admin token (from admin-login), return admin user directly
    if ('isAdmin' in decoded && decoded.isAdmin) {
      return {
        user: {
          id: 0,
          username: 'admin',
          email: 'admin@clawmigrate.xyz',
          role: 'admin'
        }
      };
    }
    
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
