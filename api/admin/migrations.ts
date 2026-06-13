import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get migrations with user info
    const { data: migrations, count } = await supabase
      .from('migrations')
      .select(`
        *,
        user:users(id, username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const formattedMigrations = (migrations || []).map(m => ({
      id: m.id,
      user_id: m.user_id,
      username: m.user?.username || '未知用户',
      source_platform: m.source_platform,
      target_platform: m.target_platform,
      status: m.status,
      categories: m.categories ? (typeof m.categories === 'string' ? JSON.parse(m.categories) : m.categories) : [],
      created_at: m.created_at,
      completed_at: m.completed_at
    }));

    return res.json({
      ok: true,
      migrations: formattedMigrations,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Get migrations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
