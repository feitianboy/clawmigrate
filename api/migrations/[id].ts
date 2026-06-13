import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAuth(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid migration ID' });
    }

    const migrationId = parseInt(id);

    if (isNaN(migrationId)) {
      return res.status(400).json({ ok: false, error: 'Invalid migration ID' });
    }

    const { data: migration } = await supabase
      .from('migrations')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (!migration) {
      return res.status(404).json({ ok: false, error: 'Migration not found' });
    }

    // Check ownership
    if (migration.user_id !== result.user!.id && result.user!.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    return res.json({
      ok: true,
      data: {
        ...migration,
        categories: migration.categories ? JSON.parse(migration.categories) : []
      }
    });
  } catch (error) {
    console.error('Get migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
