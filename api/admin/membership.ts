import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { updateMembership, MembershipTier } from '../../lib/membership';
import { logActivity } from '../../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const result = await requireAdmin(req);

    if (result.error) {
      return res.status(result.error.status).json({ ok: false, error: result.error.message });
    }

    const { path } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // Parse user ID from path like users/123/membership
    const userIdMatch = pathStr?.match(/^users\\/\(\\d+\)\\/\membership$/);
    if (!userIdMatch) {
      return res.status(400).json({ ok: false, error: 'Invalid path' });
    }

    const userId = parseInt(userIdMatch[1]);
    const { tier, expireAt } = req.body;

    const validTiers = ['free', 'pro', 'enterprise'];
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({ ok: false, error: 'Invalid tier' });
    }

    const expireDate = expireAt ? new Date(expireAt) : undefined;
    const updated = await updateMembership(userId, tier as MembershipTier, expireDate);

    if (!updated) {
      return res.status(500).json({ ok: false, error: 'Failed to update membership' });
    }

    await logActivity(
      result.user!.id,
      'admin_update_membership',
      { targetUserId: userId, tier, expireAt },
      req.headers['x-forwarded-for'] || req.ip
    );

    return res.json({
      ok: true,
      data: { message: 'Membership updated successfully' }
    });
  } catch (error) {
    console.error('Update membership error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
