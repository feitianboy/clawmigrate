import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAdmin, requireAuth, checkRateLimit, recordFailedAttempt, clearRateLimit, getClientIp } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { logActivity, getPlanName, getStatusName, getTierFromPlan, getExpireAt, getActivityLogs, getActivityStats } from '../../lib/utils';
import { updateMembership, MembershipTier, getOrdersByUserId, findOrderByOrderId, updateOrderStatus, getOrderStats } from '../../lib/membership';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  const segments = [].concat(req.query['...path'] || []);
  const subPath = segments.join('/');

  if (subPath === 'init-tables' && req.method === 'POST') return handleInitTables(req, res);
  if (subPath === 'verify' && req.method === 'POST') return handleVerify(req, res);
  if (subPath === 'setup' && req.method === 'POST') return handleSetup(req, res);
  if (subPath === 'setup-status' && req.method === 'GET') return handleSetupStatus(req, res);
  if (subPath === 'activity-logs' && req.method === 'GET') return handleActivityLogs(req, res);
  if (subPath === 'membership' && req.method === 'PUT') return handleMembership(req, res);
  if (subPath === 'migrations' && req.method === 'GET') return handleAdminMigrations(req, res);
  if ((subPath.match(/^migrations\/\d+$/) || segments[0] === 'migrations' && segments.length === 2) && req.method === 'DELETE') return handleDeleteMigration(req, res, subPath);
  if ((subPath === 'orders' || subPath === 'list') && req.method === 'GET') return handleGetOrders(req, res);
  if (segments[0] === 'orders' && segments.length === 2 && req.method === 'PUT') return handleUpdateOrder(req, res, subPath);
  if (subPath === 'stats' && req.method === 'GET') return handleStats(req, res);
  if (subPath === 'trend' && req.method === 'GET') return handleTrend(req, res);
  if (subPath === 'revenue' && req.method === 'GET') return handleRevenue(req, res);
  if (subPath === 'user-detail' && req.method === 'GET') return handleUserDetail(req, res);
  if ((subPath === 'users' || subPath === '') && req.method === 'GET') return handleGetUsers(req, res);
  if (segments[0] === 'users' && segments.length === 2 && req.method === 'PUT') return handleUpdateUser(req, res, subPath);
  if (segments[0] === 'users' && segments.length === 2 && req.method === 'DELETE') return handleDeleteUser(req, res, subPath);

  return res.status(404).json({ ok: false, error: 'Admin route not found' });
}

// ---- Activity Logs ----
async function handleActivityLogs(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { logs, total } = await getActivityLogs(page, limit);
    const formattedLogs = logs.map(log => ({ ...log, detail: log.detail ? JSON.parse(log.detail) : null }));

    return res.json({ ok: true, data: { logs: formattedLogs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Membership ----
async function handleMembership(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const { userId, tier, expireAt } = req.body;
    const validTiers = ['free', 'pro'];
    if (!userId || !tier || !validTiers.includes(tier)) {
      return res.status(400).json({ ok: false, error: 'Invalid userId or tier' });
    }

    const expireDate = expireAt ? new Date(expireAt) : undefined;
    const updated = await updateMembership(userId, tier as MembershipTier, expireDate);
    if (!updated) return res.status(500).json({ ok: false, error: 'Failed to update membership' });

    await logActivity(null, 'admin_update_membership', { adminUsername: result.user!.username, targetUserId: userId, tier, expireAt }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'Membership updated successfully' } });
  } catch (error) {
    console.error('Update membership error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Admin Migrations (list) ----
async function handleAdminMigrations(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: migrations, count } = await supabase.from('migrations').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const formattedMigrations = (migrations || []).map(m => ({ ...m, categories: m.categories ? JSON.parse(m.categories) : [] }));

    return res.json({ ok: true, data: { migrations: formattedMigrations, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } } });
  } catch (error) {
    console.error('Get migrations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Admin Delete Migration ----
async function handleDeleteMigration(req: VercelRequest, res: VercelResponse, subPath: string) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const migrationId = parseInt(subPath.split('/')[1]);
    if (isNaN(migrationId)) return res.status(400).json({ ok: false, error: 'Invalid migration ID' });

    const { error } = await supabase.from('migrations').delete().eq('id', migrationId);
    if (error) return res.status(404).json({ ok: false, error: 'Migration not found' });

    await logActivity(null, 'delete_migration', { adminUsername: result.user!.username, migrationId }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'Migration deleted successfully' } });
  } catch (error) {
    console.error('Delete migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Admin Orders ----
async function handleGetOrders(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    let query = supabase.from('orders').select('*, users(username, email)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);

    const { data: orders, count } = await query;
    const formattedOrders = (orders || []).map(order => ({
      id: order.id, orderId: order.order_id, userId: order.user_id,
      username: order.users?.username || 'Unknown', email: order.users?.email || 'Unknown',
      plan: order.plan, planName: getPlanName(order.plan), amount: order.amount,
      payMethod: order.pay_method, status: order.status, statusName: getStatusName(order.status),
      createdAt: order.created_at, paidAt: order.paid_at
    }));

    return res.json({ ok: true, data: { orders: formattedOrders, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } } });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleUpdateOrder(req: VercelRequest, res: VercelResponse, subPath: string) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const orderId = subPath.split('/')[1];
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded'];
    if (!status || !validStatuses.includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' });

    const order = await findOrderByOrderId(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    const paidAt = status === 'paid' ? new Date() : undefined;
    const updated = await updateOrderStatus(orderId, status as 'pending' | 'paid' | 'cancelled' | 'refunded', paidAt);
    if (!updated) return res.status(500).json({ ok: false, error: 'Failed to update order' });

    if (status === 'paid') {
      const tier = getTierFromPlan(order.plan);
      const expireAt = getExpireAt(order.plan);
      await updateMembership(order.user_id, tier, expireAt);
    }

    await logActivity(null, 'admin_update_order', { adminUsername: result.user!.username, orderId, oldStatus: order.status, newStatus: status }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'Order updated successfully' } });
  } catch (error) {
    console.error('Update order error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Stats ----
async function handleStats(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalMigrations } = await supabase.from('migrations').select('*', { count: 'exact', head: true });
    const { count: completedMigrations } = await supabase.from('migrations').select('*', { count: 'exact', head: true }).eq('status', 'completed');
    const { count: failedMigrations } = await supabase.from('migrations').select('*', { count: 'exact', head: true }).eq('status', 'failed');
    const { count: inProgressMigrations } = await supabase.from('migrations').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');

    // 平台分布 - 直接返回数组格式
    const { data: platformStats } = await supabase.from('migrations').select('source_platform');
    const platformCountMap: Record<string, number> = {};
    platformStats?.forEach(m => {
      const p = m.source_platform || 'unknown';
      platformCountMap[p] = (platformCountMap[p] || 0) + 1;
    });
    const platformDistribution = Object.entries(platformCountMap).map(([platform, count]) => ({ platform, count }));

    // 会员分布 - 直接返回数组格式
    const { data: tierStats } = await supabase.from('users').select('membership_tier');
    const tierCountMap: Record<string, number> = { free: 0, pro: 0 };
    tierStats?.forEach(u => {
      const t = u.membership_tier || 'free';
      tierCountMap[t] = (tierCountMap[t] || 0) + 1;
    });
    const tierDistribution = Object.entries(tierCountMap).map(([tier, count]) => ({ tier, count }));

    const { data: paidUsersData } = await supabase.from('orders').select('user_id').eq('status', 'paid');
    const paidUsers = new Set(paidUsersData?.map(o => o.user_id) || []).size;
    const conversionRate = userCount && userCount > 0 ? Math.round((paidUsers / userCount) * 10000) / 100 : 0;

    const activityStats = await getActivityStats();
    const orderStats = await getOrderStats();

    return res.json({
      ok: true, data: {
        totalUsers: userCount || 0, totalMigrations: totalMigrations || 0,
        completedMigrations: completedMigrations || 0, failedMigrations: failedMigrations || 0,
        inProgressMigrations: inProgressMigrations || 0, todayPV: activityStats.todayPV,
        todayUV: activityStats.todayUV, platformDistribution, tierDistribution,
        conversionRate, paidUsers, totalOrders: orderStats.totalOrders,
        paidOrders: orderStats.paidOrders, totalRevenue: orderStats.totalRevenue,
        monthlyRevenue: orderStats.monthlyRevenue, orderByStatus: orderStats.byStatus,
        orderByPlan: orderStats.byPlan
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Trend (迁移趋势) ----
async function handleTrend(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data: migrations } = await supabase
      .from('migrations')
      .select('status, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // 按日期聚合
    const trendMap: Record<string, { migrations: number; success: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = { migrations: 0, success: 0 };
    }

    migrations?.forEach(m => {
      const key = new Date(m.created_at).toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].migrations++;
        if (m.status === 'completed') trendMap[key].success++;
      }
    });

    const trendData = Object.entries(trendMap).map(([date, val]) => ({ date, ...val }));

    return res.json({ ok: true, data: trendData });
  } catch (error) {
    console.error('Get trend error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Revenue Analysis (营收分析) ----
async function handleRevenue(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    // 最近30天每日收入趋势
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const { data: paidOrders } = await supabase
      .from('orders')
      .select('amount, plan, paid_at, user_id')
      .eq('status', 'paid')
      .gte('paid_at', startDate.toISOString())
      .order('paid_at', { ascending: true });

    // 按日期聚合收入
    const revenueMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      revenueMap[key] = { revenue: 0, orders: 0 };
    }

    paidOrders?.forEach(o => {
      const key = new Date(o.paid_at).toISOString().split('T')[0];
      if (revenueMap[key]) {
        revenueMap[key].revenue += Number(o.amount);
        revenueMap[key].orders++;
      }
    });

    const dailyRevenue = Object.entries(revenueMap).map(([date, val]) => ({ date, ...val }));

    // 按套餐统计
    const planRevenueMap: Record<string, { revenue: number; count: number }> = {};
    paidOrders?.forEach(o => {
      if (!planRevenueMap[o.plan]) planRevenueMap[o.plan] = { revenue: 0, count: 0 };
      planRevenueMap[o.plan].revenue += Number(o.amount);
      planRevenueMap[o.plan].count++;
    });
    const planRevenue = Object.entries(planRevenueMap).map(([plan, val]) => ({ plan, ...val }));

    // ARPU（每付费用户平均收入）
    const uniquePayingUsers = new Set(paidOrders?.map(o => o.user_id) || []).size;
    const totalRevenue30d = paidOrders?.reduce((sum, o) => sum + Number(o.amount), 0) || 0;
    const arpu = uniquePayingUsers > 0 ? Math.round(totalRevenue30d / uniquePayingUsers * 100) / 100 : 0;

    return res.json({
      ok: true, data: {
        dailyRevenue, planRevenue, arpu,
        totalRevenue30d, ordersCount30d: paidOrders?.length || 0,
        uniquePayingUsers
      }
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- User Detail (用户详情) ----
async function handleUserDetail(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId)) return res.status(400).json({ ok: false, error: 'Invalid user ID' });

    // 用户基本信息
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role, membership_tier, membership_expire_at, phone, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    // 用户迁移记录
    const { data: migrations } = await supabase
      .from('migrations')
      .select('id, source_platform, target_platform, status, items_count, categories, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 用户订单记录
    const { data: orders } = await supabase
      .from('orders')
      .select('order_id, plan, amount, status, created_at, paid_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 统计
    const { count: migrationCount } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'paid');

    return res.json({
      ok: true, data: {
        user: { ...user, tier: user.membership_tier, migrationCount: migrationCount || 0, paidOrderCount: orderCount || 0 },
        migrations: migrations || [],
        orders: orders || []
      }
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Users ----
async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    let query = supabase.from('users')
      .select('id, username, email, membership_tier, membership_expire_at, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, count } = await query.range(offset, offset + limit - 1);

    // 为每个用户添加 tier 和 migrationCount
    const usersWithTier = await Promise.all((users || []).map(async u => {
      const { count: mc } = await supabase
        .from('migrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id);
      return { ...u, tier: u.membership_tier, migrationCount: mc || 0 };
    }));

    return res.json({ ok: true, data: { users: usersWithTier, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } } });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleUpdateUser(req: VercelRequest, res: VercelResponse, subPath: string) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const userId = parseInt(subPath.split('/')[1]);
    if (isNaN(userId)) return res.status(400).json({ ok: false, error: 'Invalid user ID' });

    const { username, email, role } = req.body;
    const { data: existingUser } = await supabase.from('users').select('id, username, email').eq('id', userId).single();
    if (!existingUser) return res.status(404).json({ ok: false, error: 'User not found' });

    if (username && username !== existingUser.username) {
      const { data: usernameExists } = await supabase.from('users').select('id').eq('username', username).single();
      if (usernameExists) return res.status(400).json({ ok: false, error: 'Username already exists' });
    }
    if (email && email !== existingUser.email) {
      const { data: emailExists } = await supabase.from('users').select('id').eq('email', email).single();
      if (emailExists) return res.status(400).json({ ok: false, error: 'Email already exists' });
    }

    const updateData: { username?: string; email?: string; membership_tier?: string } = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const { data: updatedUser } = await supabase.from('users').update(updateData).eq('id', userId).select('id, username, email').single();
    await logActivity(null, 'update_user', { adminUsername: result.user!.username, targetUserId: userId, updates: updateData }, req.headers['x-forwarded-for'] as string || (req as any).ip);

    return res.json({ ok: true, data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleDeleteUser(req: VercelRequest, res: VercelResponse, subPath: string) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const userId = parseInt(subPath.split('/')[1]);
    if (isNaN(userId)) return res.status(400).json({ ok: false, error: 'Invalid user ID' });

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) return res.status(404).json({ ok: false, error: 'User not found' });

    await logActivity(null, 'delete_user', { adminUsername: result.user!.username, deletedUserId: userId }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'User deleted successfully' } });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Verify Admin (账号+密码登录) ----
async function handleVerify(req: VercelRequest, res: VercelResponse) {
  try {
    // 速率限制
    const rateLimitKey = `admin-verify:${getClientIp(req)}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return res.status(429).json({ ok: false, error: `尝试过于频繁，请 ${rateLimit.retryAfter} 秒后再试` });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: '请输入账号和密码' });
    }

    // 从 admins 表查询管理员
    const { data: admin } = await supabase
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', username)
      .single();

    if (!admin || !admin.password_hash) {
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ ok: false, error: '账号或密码错误' });
    }

    if (!bcrypt.compareSync(password, admin.password_hash)) {
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ ok: false, error: '账号或密码错误' });
    }

    clearRateLimit(rateLimitKey);

    // 生成 JWT token（24h 有效）
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ ok: false, error: 'Server authentication not configured' });
    const token = jwt.sign(
      { userId: admin.id, username: admin.username, role: 'admin' },
      secret,
      { expiresIn: '24h' }
    );

    return res.json({ ok: true, token, user: { id: admin.id, username: admin.username } });
  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Setup Status (检查是否已有管理员) ----
async function handleSetupStatus(req: VercelRequest, res: VercelResponse) {
  try {
    // 尝试查询 admins 表，如果表不存在则返回 hasAdmin: false
    const { count, error } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    // 如果表不存在或其他错误，返回 hasAdmin: false（允许 setup 流程自动建表）
    if (error) {
      return res.json({ ok: true, hasAdmin: false });
    }

    return res.json({ ok: true, hasAdmin: (count || 0) > 0 });
  } catch (error) {
    console.error('Setup status error:', error);
    return res.json({ ok: true, hasAdmin: false });
  }
}

// 确保 admins 表存在
async function ensureAdminsTable(): Promise<void> {
  try {
    // 尝试查询，如果报错说明表不存在
    const { error } = await supabase.from('admins').select('id').limit(1);
    if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
      // 通过 Supabase REST API 执行建表 SQL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            sql_text: `CREATE TABLE IF NOT EXISTS admins (
              id SERIAL PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );`
          })
        }).catch(() => {});
      }
    }
  } catch {
    // 忽略错误，setup 时 insert 会再次报错
  }
}

// ---- Setup (初始化管理员账号，仅在没有管理员时可用) ----
async function handleSetup(req: VercelRequest, res: VercelResponse) {
  try {
    // 先确保 admins 表存在
    await ensureAdminsTable();

    // 安全检查：如果已有管理员，禁止再次创建
    const { count: adminCount } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if ((adminCount || 0) > 0) {
      return res.status(403).json({ ok: false, error: '管理员账号已存在，如需新增请登录后台操作' });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: '用户名和密码为必填' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ ok: false, error: '用户名长度需 3-20 个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: '密码长度至少 6 位' });
    }

    // 检查 admins 表中是否已存在同名管理员
    const { data: existingAdmin } = await supabase.from('admins').select('id').eq('username', username).single();
    if (existingAdmin) {
      return res.status(400).json({ ok: false, error: '管理员用户名已存在' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const { data: newAdmin, error: insertError } = await supabase.from('admins').insert({
      username,
      password_hash: passwordHash
    }).select('id, username').single();

    if (insertError || !newAdmin) {
      console.error('Create admin error:', insertError);
      return res.status(500).json({ ok: false, error: '创建管理员账号失败，请稍后重试或联系管理员创建 admins 表' });
    }

    // 生成 JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ ok: false, error: 'Server authentication not configured' });
    const token = jwt.sign(
      { userId: newAdmin.id, username: newAdmin.username, role: 'admin' },
      secret,
      { expiresIn: '24h' }
    );

    return res.json({ ok: true, token, user: newAdmin });
  } catch (error) {
    console.error('Setup admin error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- 初始化数据库表（临时接口） ----
async function handleInitTables(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!projectRef || !serviceKey) {
      return res.status(500).json({ ok: false, error: 'Supabase config missing' });
    }

    // 尝试通过 Supabase REST API 的 rpc 功能执行 SQL
    // 方案1：尝试直接用 pg 连接
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD;
    const connectionString = process.env.DATABASE_URL ||
      (dbPassword ? `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres` : null);

    if (connectionString) {
      try {
        const { Client } = await import('pg');
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        await client.connect();

        await client.query(`
          CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
        await client.query(`ALTER TABLE admins ENABLE ROW LEVEL SECURITY;`);
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'admins_no_anon_access') THEN
              CREATE POLICY admins_no_anon_access ON admins FOR ALL USING (false);
            END IF;
          END $$;
        `);
        await client.query(`
          DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
          CREATE TRIGGER update_admins_updated_at
            BEFORE UPDATE ON admins
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
        await client.end();
        return res.json({ ok: true, message: 'admins table created via pg connection' });
      } catch (pgError) {
        console.error('PG connection failed:', pgError);
      }
    }

    // 方案2：返回 SQL 语句让用户手动执行
    return res.json({
      ok: false,
      error: '无法自动建表，需要手动执行',
      projectRef,
      sql: `CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY admins_no_anon_access ON admins FOR ALL USING (false);`,
      instructions: '请登录 Supabase 控制台，进入 SQL Editor，执行上面的 SQL 语句'
    });
  } catch (error) {
    console.error('Init tables error:', error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
