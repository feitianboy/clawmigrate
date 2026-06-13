import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : path;

  if (method === 'GET' && (!pathStr || pathStr === 'list')) {
    return handleGetUsers(req, res);
  } else if (method === 'DELETE' && pathStr) {
    return handleDeleteUser(req, res, pathStr);
  } else {
    return res.status(404).json({ ok: false, error: 'Route not found' });
  }
}

async function handleGetUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { data: users, count } = await supabase
      .from('users')
      .select('id, username, email, role, membership_tier, membership_expire_at, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Format users for frontend
    const formattedUsers = (users || []).map(u => ({
      id: String(u.id),
      username: u.username,
      email: u.email,
      role: u.role,
      tier: u.membership_tier || 'free',
      created_at: u.created_at,
      updated_at: u.updated_at
    }));

    return res.json({
      ok: true,
      users: formattedUsers,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleDeleteUser(req: VercelRequest, res: VercelResponse, pathStr: string) {
  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    // Parse user ID from path like users/123 or users/u_xxx
    const userIdMatch = pathStr.match(/^users[/\\]+\/]+)$/);
    if (!userIdMatch) {
      return res.status(400).json({ ok: false, error: 'Invalid path' });
    }

    const userIdStr = userIdMatch[1];
    // Check if userId is numeric
    const userId = parseInt(userIdStr);

    if (!isNaN(userId)) {
      // Check if deleting own account
      if (result.user && result.user.id === userId) {
        return res.status(400).json({ ok: false, error: 'Cannot delete your own account' });
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }
    } else {
      // UUID format
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userIdStr);

      if (error) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }
    }

    if (result.user) {
      await logActivity(
        result.user.id,
        'delete_user',
        { deletedUserId: userIdStr },
        req.headers['x-forwarded-for'] || req.ip
      );
    }

    return res.json({
      ok: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
