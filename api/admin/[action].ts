import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase';

// Helper function to verify admin token
async function verifyAdminToken(req: VercelRequest): Promise<{ valid: boolean; error?: string }> {
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
  // 使用 ADMIN_PASSWORD 作为密钥验证
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

  const action = req.query.action as string;

  // 验证 admin token
  const authResult = await verifyAdminToken(req);
  if (!authResult.valid) {
    return res.status(401).json({ ok: false, error: authResult.error });
  }

  // Stats action
  if (action === 'stats' && req.method === 'GET') {
    const [{ count: userCount }, { count: migrationCount }, { count: orderCount }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('migrations').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true })
    ]);
    
    // 获取付费用户数
    const { count: paidUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('tier', 'free');
    
    // 获取本月收入
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: orders } = await supabase
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', firstDayOfMonth);
    
    const monthlyRevenue = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;
    
    // 获取平台分布
    const { data: platformData } = await supabase
      .from('migrations')
      .select('source_platform');
    
    const platformCount: Record<string, number> = {};
    platformData?.forEach(m => {
      const platform = m.source_platform;
      platformCount[platform] = (platformCount[platform] || 0) + 1;
    });
    
    const platformDistribution = Object.entries(platformCount).map(([platform, count]) => ({
      platform,
      count
    }));
    
    // 获取会员分布
    const { data: tierData } = await supabase
      .from('users')
      .select('tier');
    
    const tierCount: Record<string, number> = { free: 0, pro: 0 };
    tierData?.forEach(u => {
      const tier = u.tier || 'free';
      tierCount[tier] = (tierCount[tier] || 0) + 1;
    });
    
    const tierDistribution = Object.entries(tierCount).map(([tier, count]) => ({
      tier,
      count
    }));
    
    // 获取成功/失败迁移数
    const { count: successCount } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');
    
    const { count: failedCount } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');
    
    return res.json({
      ok: true,
      totalUsers: userCount || 0,
      totalMigrations: migrationCount || 0,
      completedMigrations: successCount || 0,
      failedMigrations: failedCount || 0,
      paidUsers: paidUsers || 0,
      platformDistribution,
      tierDistribution,
      monthlyRevenue,
      todayPV: 0,
      todayUV: 0,  // TODO: 接入PV/UV统计后替换
      conversionRate: ((paidUsers || 0) / (userCount || 1) * 100).toFixed(1),
    });
  }


  // Trend action - daily migration counts for last 7 days
  if (action === 'trend' && req.method === 'GET') {
    const days = parseInt(req.query.days as string) || 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
      
      const [{ count: totalCount }, { count: successCount }] = await Promise.all([
        supabase.from('migrations').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd),
        supabase.from('migrations').select('*', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', dayStart).lt('created_at', dayEnd),
      ]);
      
      result.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        migrations: totalCount || 0,
        success: successCount || 0,
      });
    }
    return res.json({ ok: true, data: result });
  }

  // Users list action
  if (action === 'users' && req.method === 'GET') {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const { data, count } = await supabase
      .from('users')
      .select('id, username, email, role, tier, created_at', { count: 'exact' })
      .order('id')
      .range(offset, offset + limit - 1);
    
    return res.json({
      ok: true,
      users: data || [],
      total: count || 0,
      page,
      limit,
    });
  }

  // User detail action
  if (action === 'users' && req.method === 'GET' && req.query.userId) {
    const userId = req.query.userId as string;
    const { data } = await supabase
      .from('users')
      .select('id, username, email, role, tier, created_at')
      .eq('id', userId)
      .single();
    
    if (!data) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    
    return res.json({ ok: true, user: data });
  }

  // Delete user action
  if (action === 'users' && req.method === 'DELETE' && req.query.userId) {
    const userId = req.query.userId as string;
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.json({ ok: true });
  }

  // Migrations list action
  if (action === 'migrations' && req.method === 'GET') {
    const { data } = await supabase
      .from('migrations')
      .select('*, users(username)')
      .order('created_at', { ascending: false })
      .limit(100);
    
    const migrations = data?.map(m => ({
      ...m,
      username: m.users?.username
    })) || [];
    
    return res.json({ ok: true, migrations });
  }

  // Orders list action
  if (action === 'orders' && req.method === 'GET') {
    const { data } = await supabase
      .from('orders')
      .select('*, users(username)')
      .order('created_at', { ascending: false })
      .limit(100);
    
    const orders = data?.map(o => ({
      ...o,
      username: o.users?.username
    })) || [];
    
    return res.json({ ok: true, orders });
  }

  return res.status(404).json({ ok: false, error: 'Admin route not found' });
}
