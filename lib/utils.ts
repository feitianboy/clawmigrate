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

export async function getActivityLogs(page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;
  
  const { data: logs, count } = await supabase
    .from('activity_logs')
    .select('*, users(username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return {
    logs: logs || [],
    total: count || 0
  };
}

export async function getActivityStats() {
  const today = new Date().toISOString().split('T')[0];
  
  const { count: todayPV } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  const { data: todayUVData } = await supabase
    .from('activity_logs')
    .select('user_id')
    .gte('created_at', today)
    .not('user_id', 'is', null);

  const uniqueUsers = new Set(todayUVData?.map(l => l.user_id) || []);
  
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
    pro: 'Pro 会员',
    enterprise: '企业版'
  };
  return names[tier] || '免费版';
}

export function getTierBenefits(tier: string): string[] {
  const benefits: Record<string, string[]> = {
    free: ['每月 3 次迁移', '基础导出格式', '社区支持'],
    pro: ['每月无限次迁移', '所有导出格式', '优先客服支持', '迁移历史永久保存'],
    enterprise: [
      '无限次迁移',
      '所有导出格式',
      '专属客服经理',
      'API 接口访问',
      '自定义品牌域名',
      '团队协作功能',
      '优先新功能体验'
    ]
  };
  return benefits[tier] || benefits.free;
}

export function getPlanName(plan: string): string {
  const names: Record<string, string> = {
    pro_monthly: 'Pro 月度',
    pro_yearly: 'Pro 年度',
    enterprise_monthly: '企业版 月度',
    enterprise_yearly: '企业版 年度'
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

export function getTierFromPlan(plan: string): 'pro' | 'enterprise' {
  if (plan.startsWith('enterprise')) {
    return 'enterprise';
  }
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
