import { supabase } from './supabase';

export async function logActivity(
  userId: number | null,
  action: string,
  detail?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    detail: detail ? JSON.stringify(detail) : null,
    ip: ip || null
  });
}

export async function getActivityLogs(page: number = 1, limit: number = 20, logType: string = 'all') {
  const offset = (page - 1) * limit;
  
  let query = supabase
    .from('activity_logs')
    .select('*, users(username)', { count: 'exact' });

  if (logType === 'frontend') {
    query = query.not('action', 'ilike', 'admin_%');
  } else if (logType === 'admin') {
    query = query.ilike('action', 'admin_%');
  }

  const { data: logs, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return {
    logs: logs || [],
    total: count || 0
  };
}

export async function getActivityStats() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayLogs } = await supabase
    .from('activity_logs')
    .select('user_id, ip, action')
    .gte('created_at', today);

  const userLogs = (todayLogs || []).filter(log => !log.action.startsWith('admin_'));
  const todayPV = userLogs.length;

  const uniqueUsers = new Set<string>();
  userLogs.forEach(log => {
    if (log.user_id) {
      uniqueUsers.add(`user_${log.user_id}`);
    } else if (log.ip) {
      uniqueUsers.add(`ip_${log.ip}`);
    }
  });
  
  const { count: totalLogs } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true });

  return {
    todayPV: todayPV || 0,
    todayUV: uniqueUsers.size,
    totalLogs: totalLogs || 0
  };
}

export function getTierName(tier: string): string {
  const names: Record<string, string> = {
    free: '免费版',
    pro: 'Pro 会员'
  };
  return names[tier] || '免费版';
}

export function getTierBenefits(tier: string): string[] {
  const benefits: Record<string, string[]> = {
    free: ['终身 2 次迁移'],
    pro: ['无限次迁移', '迁移历史永久保存'],
    // enterprise removed
  };
  return benefits[tier] || benefits.free;
}

export function getPlanName(plan: string): string {
  const names: Record<string, string> = {
    pro_monthly: 'Pro 月度',
    pro_yearly: 'Pro 年度'
  };
  return names[plan] || plan;
}

export function getStatusName(status: string): string {
  const names: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款'
  };
  return names[status] || status;
}

export function getTierFromPlan(plan: string): 'pro' {
  return 'pro';
}

export function getExpireAt(plan: string): Date {
  const now = new Date();
  if (plan.includes('yearly')) {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
}
