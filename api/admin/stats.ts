import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth';
import { getOrderStats } from '../../lib/membership';
import { getActivityStats } from '../../lib/utils';
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

    // Get user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get migration stats
    const { count: totalMigrations } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true });

    const { count: completedMigrations } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedMigrations } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: inProgressMigrations } = await supabase
      .from('migrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // Get platform distribution
    const { data: platformStats } = await supabase
      .from('migrations')
      .select('source_platform, target_platform');

    // Format platform distribution for frontend pie chart
    const platformDistribution: { platform: string; count: number }[] = [];
    const platformCount: Record<string, number> = {};
    
    platformStats?.forEach(m => {
      if (m.source_platform) {
        platformCount[m.source_platform] = (platformCount[m.source_platform] || 0) + 1;
      }
    });
    
    Object.entries(platformCount).forEach(([platform, count]) => {
      platformDistribution.push({ platform, count });
    });

    // Get tier distribution
    const { data: tierStats } = await supabase
      .from('users')
      .select('membership_tier');

    const tierDistribution: { tier: string; count: number }[] = [
      { tier: 'free', count: 0 },
      { tier: 'pro', count: 0 },
      { tier: 'enterprise', count: 0 }
    ];
    
    tierStats?.forEach(u => {
      const tierIndex = tierDistribution.findIndex(t => t.tier === (u.membership_tier || 'free'));
      if (tierIndex >= 0) {
        tierDistribution[tierIndex].count++;
      }
    });

    // Get paid users count
    const { data: paidUsersData } = await supabase
      .from('orders')
      .select('user_id')
      .eq('status', 'paid');

    const paidUsersSet = new Set(paidUsersData?.map(o => o.user_id) || []);
    const paidUsers = paidUsersSet.size;

    // Calculate conversion rate
    const conversionRate = userCount && userCount > 0
      ? Math.round((paidUsers / userCount) * 10000) / 100
      : 0;

    // Get activity stats
    const activityStats = await getActivityStats();

    // Get order stats
    const orderStats = await getOrderStats();

    return res.json({
      ok: true,
      totalUsers: userCount || 0,
      totalMigrations: totalMigrations || 0,
      completedMigrations: completedMigrations || 0,
      failedMigrations: failedMigrations || 0,
      inProgressMigrations: inProgressMigrations || 0,
      todayPV: activityStats.todayPV,
      todayUV: activityStats.todayUV,
      platformDistribution,
      tierDistribution,
      conversionRate,
      paidUsers,
      totalOrders: orderStats.totalOrders,
      paidOrders: orderStats.paidOrders,
      totalRevenue: orderStats.totalRevenue,
      monthlyRevenue: orderStats.monthlyRevenue,
      orderByStatus: orderStats.byStatus,
      orderByPlan: orderStats.byPlan
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
