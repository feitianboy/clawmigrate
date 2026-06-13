import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action as string;
  const authResult = await requireAdmin(req);
  if (authResult.error) return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });

  if (action === 'stats' && req.method === 'GET') {
    const [{ count: userCount }, { count: migrationCount }, { count: orderCount }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('migrations').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true })
    ]);
    return res.json({ ok: true, data: { users: userCount || 0, migrations: migrationCount || 0, orders: orderCount || 0 } });
  }

  if (action === 'users' && req.method === 'GET') {
    const { data } = await supabase.from('users').select('id, username, email, role, created_at').order('id');
    return res.json({ ok: true, data: data || [] });
  }

  if (action === 'migrations' && req.method === 'GET') {
    const { data } = await supabase.from('migrations').select('*').order('created_at', { ascending: false });
    return res.json({ ok: true, data: data || [] });
  }

  if (action === 'orders' && req.method === 'GET') {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    return res.json({ ok: true, data: data || [] });
  }

  return res.status(404).json({ ok: false, error: 'Admin route not found' });
}
