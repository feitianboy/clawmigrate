import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action as string;
  const authResult = await requireAuth(req);
  if (authResult.error) return res.status(authResult.error.status).json({ ok: false, error: authResult.error.message });

  if (action === 'list' && req.method === 'GET') {
    const { data } = await supabase.from('orders').select('*').eq('user_id', authResult.user!.id).order('created_at', { ascending: false });
    return res.json({ ok: true, data: data || [] });
  }

  if (action === 'create' && req.method === 'POST') {
    return res.json({ ok: true, data: { message: 'Order creation not yet implemented' } });
  }

  return res.status(404).json({ ok: false, error: 'Orders route not found' });
}
