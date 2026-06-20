import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { canMigrate } from '../../lib/membership';
import { logActivity } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = [].concat(req.query['...path'] || []);
  const subPath = segments.join('/');

  // GET /api/migrations → list user's migrations
  // POST /api/migrations → create migration
  if (!subPath && (req.method === 'GET' || req.method === 'POST')) {
    if (req.method === 'GET') return handleGetMigrations(req, res);
    return handleCreateMigration(req, res);
  }

  // GET /api/migrations/:id → get single migration
  if (segments.length === 1 && req.method === 'GET') {
    return handleGetMigration(req, res, segments[0]);
  }

  // PUT /api/migrations/:id → update migration (e.g. status → completed)
  if (segments.length === 1 && req.method === 'PUT') {
    return handleUpdateMigration(req, res, segments[0]);
  }

  return res.status(404).json({ ok: false, error: 'Migration route not found' });
}

async function handleGetMigrations(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const { data: migrations } = await supabase.from('migrations').select('*').eq('user_id', result.user!.id).order('created_at', { ascending: false });
    const formattedMigrations = (migrations || []).map(m => ({ ...m, categories: m.categories ? JSON.parse(m.categories) : [] }));

    return res.json({ ok: true, data: formattedMigrations });
  } catch (error) {
    console.error('Get migrations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleCreateMigration(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const { sourcePlatform, targetPlatform, itemsCount, categories, status } = req.body;
    if (!sourcePlatform || !targetPlatform) return res.status(400).json({ ok: false, error: 'Source and target platforms are required' });

    // 始终先检查迁移权限（包含 in_progress 记录）
    const checkResult = await canMigrate(result.user!.id);
    if (!checkResult.allowed) {
      return res.status(403).json({ ok: false, error: checkResult.reason, code: 'USAGE_LIMIT_EXCEEDED', upgradeUrl: '/pricing' });
    }

    const { data: migration, error } = await supabase.from('migrations').insert({
      user_id: result.user!.id, source_platform: sourcePlatform, target_platform: targetPlatform,
      items_count: itemsCount || 0, categories: categories ? JSON.stringify(categories) : null, status: 'in_progress' // 先占位，防止并发绕过计数
    }).select().single();

    if (error || !migration) return res.status(500).json({ ok: false, error: 'Failed to create migration' });

    await logActivity(result.user!.id, 'migration', { migrationId: migration.id, sourcePlatform, targetPlatform, itemsCount: migration.items_count, status: migration.status }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.status(201).json({ ok: true, data: migration });
  } catch (error) {
    console.error('Create migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleUpdateMigration(req: VercelRequest, res: VercelResponse, idStr: string) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const migrationId = parseInt(idStr);
    if (isNaN(migrationId)) return res.status(400).json({ ok: false, error: 'Invalid migration ID' });

    const { data: migration } = await supabase.from('migrations').select('*').eq('id', migrationId).single();
    if (!migration) return res.status(404).json({ ok: false, error: 'Migration not found' });
    if (migration.user_id !== result.user!.id) return res.status(403).json({ ok: false, error: 'Access denied' });

    const { status } = req.body;
    const validStatuses = ['in_progress', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status. Must be one of: in_progress, completed, failed' });
    }

    const { data: updated, error } = await supabase.from('migrations').update({ status }).eq('id', migrationId).select().single();
    if (error || !updated) return res.status(500).json({ ok: false, error: 'Failed to update migration' });

    await logActivity(result.user!.id, 'migration_update', { migrationId, status }, req.headers['x-forwarded-for'] as string || (req as any).ip);
    return res.json({ ok: true, data: { ...updated, categories: updated.categories ? JSON.parse(updated.categories) : [] } });
  } catch (error) {
    console.error('Update migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleGetMigration(req: VercelRequest, res: VercelResponse, idStr: string) {
  try {
    const result = await requireAuth(req);
    if (result.error) return res.status(result.error.status).json({ ok: false, error: result.error.message });

    const migrationId = parseInt(idStr);
    if (isNaN(migrationId)) return res.status(400).json({ ok: false, error: 'Invalid migration ID' });

    const { data: migration } = await supabase.from('migrations').select('*').eq('id', migrationId).single();
    if (!migration) return res.status(404).json({ ok: false, error: 'Migration not found' });

    if (migration.user_id !== result.user!.id && result.user!.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    return res.json({ ok: true, data: { ...migration, categories: migration.categories ? JSON.parse(migration.categories) : [] } });
  } catch (error) {
    console.error('Get migration error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
