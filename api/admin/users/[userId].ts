import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../lib/supabase';

// Helper function to verify admin token
function verifyAdminToken(req: VercelRequest): { valid: boolean; error?: string } {
  // 首先尝试从 header 获取
  const adminToken = req.headers['x-admin-token'] as string;
  
  // 如果没有 header，尝试从 cookie 获取
  if (!adminToken) {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {} as Record<string, string>);
      if (cookies['admin_token']) {
        return verifyToken(cookies['admin_token']);
      }
    }
    return { valid: false, error: 'No admin token provided' };
  }
  
  return verifyToken(adminToken);
}

function verifyToken(token: string): { valid: boolean; error?: string } {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return { valid: false, error: 'Server configuration error' };
  }
  
  try {
    const decoded = jwt.verify(token, adminPassword) as { isAdmin?: boolean; type?: string };
    if (decoded.isAdmin && decoded.type === 'admin') {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid admin token' };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ ok: false, error: 'User ID is required' });
  }

  // 验证 admin token
  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return res.status(401).json({ ok: false, error: authResult.error });
  }

  // DELETE - 删除用户
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.json({ ok: true });
  }

  // GET - 获取用户详情
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, tier, created_at')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    
    return res.json({ ok: true, user: data });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
