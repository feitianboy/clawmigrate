import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const { path } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // Parse migration ID from path like migrations/123
    const migrationIdMatch = pathStr?.match(/^migrations\\/\(\\d+\)$/);
    if (!migrationIdMatch) {
      return res.status(400).json({ ok: false, error: 'Invalid path' });
    }

    const migrationId = parseInt(migrationIdMatch[1]);

    const { error } = await supabase
      .from('migrations')
      .delete()
      .eq('id', migrationId);

    if (error) {
      return res.status(404).json({ ok: false, error: 'Migration not found' });
    }

    await logActivity(
      result.user!.id,
      'delete_migration',
      { migrationId },
      req.headers['x-forwarded-for'] || req.ip
    );

    return res.json({
      ok: true,
      data: { message: 'Migration deleted successfully' }
    });
  } catch (error) {
    console.error('Delete migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
