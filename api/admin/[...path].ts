import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { logActivity, getPlanName, getStatusName, getTierFromPlan, getExpireAt, getActivityLogs, getActivityStats } from '../../lib/utils';
import { updateMembership, MembershipTier, getOrdersByUserId, findOrderByOrderId, updateOrderStatus, getOrderStats } from '../../lib/membership';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = [].concat(req.query['...path'] || []);
  const subPath = segments.join('/');

  if (subPath === 'verify' && req.method === 'POST') return handleVerify(req, res);
  if (subPath === 'activity-logs' && req.method === 'GET') return handleActivityLogs(req, res);
  if (subPath === 'membership' && req.method === 'PUT') return handleMembership(req, res);
  if (subPath === 'migrations' && req.method === 'GET') return handleAdminMigrations(req, res);
  if ((subPath.match(/^migrations\/\d+$/) || segments[0] === 'migrations' && segments.length === 2) && req.method === 'DELETE') return handleDeleteMigration(req, res, subPath);
  if ((subPath === 'orders' || subPath === 'list') && req.method === 'GET') return handleGetOrders(req, res);
  if (segments[0] === 'orders' && segments.length === 2 && req.method === 'PUT') return handleUpdateOrder(req, res, subPath);
  if (subPath === 'stats' && req.method === 'GET') return handleStats(req, res);
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

    await logActivity(result.user!.id, 'admin_update_membership', { targetUserId: userId, tier, expireAt }, req.headers['x-forwarded-for'] as string || (req as any).ip);
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

    await logActivity(result.user!.id, 'delete_migration', { migrationId }, req.headers['x-forwarded-for'] as string || (req as any).ip);
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

    await logActivity(result.user!.id, 'admin_update_order', { orderId, oldStatus: order.status, newStatus: status }, req.headers['x-forwarded-for'] as string || (req as any).ip);
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

    const { data: platformStats } = await supabase.from('migrations').select('source_platform, target_platform');
    const platformDistribution: Record<string, Record<string, number>> = {};
    platformStats?.forEach(m => {
      if (!platformDistribution[m.source_platform]) platformDistribution[m.source_platform] = {};
      platformDistribution[m.source_platform][m.target_platform] = (platformDistribution[m.source_platform][m.target_platform] || 0) + 1;
    });

    const { data: tierStats } = await supabase.from('users').select('membership_tier');
    const tierDistribution: Record<string, number> = { free: 0, pro: 0 };
    tierStats?.forEach(u => { if (u.membership_tier && tierDistribution[u.membership_tier] !== undefined) tierDistribution[u.membership_tier]++; });

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

// ---- Users ----
async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: users, count } = await supabase.from('users')
      .select('id, username, email, role, membership_tier, membership_expire_at, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    return res.json({ ok: true, data: { users: users || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } } });
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

    const updateData: { username?: string; email?: string; role?: string } = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role && (role === 'user' || role === 'admin')) updateData.role = role;

    const { data: updatedUser } = await supabase.from('users').update(updateData).eq('id', userId).select('id, username, email, role').single();
    await logActivity(result.user!.id, 'update_user', { targetUserId: userId, updates: updateData }, req.headers['x-forwarded-for'] as string || (req as any).ip);

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
    if (userId === result.user!.id) return res.status(400).json({ ok: false, error: 'Cannot delete your own account' });

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) return res.status(404).json({ ok: false, error: 'User not found' });

    await logActivity(result.user!.id, 'delete_user', { deletedUserId: userId }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { message: 'User deleted successfully' } });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

// ---- Verify Admin Password ----
async function handleVerify(req: VercelRequest, res: VercelResponse) {
  try {
    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return res.status(500).json({ ok: false, error: 'Admin password not configured' });
    }
    
    if (password !== adminPassword) {
      return res.status(401).json({ ok: false, error: '密码错误' });
    }
    
    // Generate a simple token (base64 of password + timestamp, for MVP)
    const token = Buffer.from(`${adminPassword}:${Date.now()}`).toString('base64');
    
    return res.json({ ok: true, token });
  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
