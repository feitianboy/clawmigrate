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

  if (action === 'check' && req.method === 'POST') {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });
    return res.json({ ok: true, data: { canMigrate: true, remaining: 999 } });
  }

  if (action === 'plans' && req.method === 'GET') {
    return res.json({ ok: true, data: { plans: [
      { id: 'free', name: '免费版', price: 0, migrations: 5 },
      { id: 'pro', name: '专业版', price: 29, migrations: 100 },
      { id: 'enterprise', name: '企业版', price: 99, migrations: -1 }
    ]}});
  }

  if (action === 'info' && req.method === 'GET') {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });
    return res.json({ ok: true, data: { plan: 'free', used: 0, limit: 5 } });
  }

  if (action === 'usage' && req.method === 'GET') {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });
    return res.json({ ok: true, data: { usage: [] } });
  }

  return res.status(404).json({ ok: false, error: 'Membership route not found' });
}
