import { supabase } from './supabase';

export type MembershipTier = 'free' | 'pro' ;
export type PlanType = 'pro_monthly' | 'pro_yearly';

export const USAGE_LIMITS = {
  free: 2,
  pro: Infinity,
};

export const PLAN_PRICES = {
  pro_monthly: 19,
  pro_yearly: 149,
};

export interface UserMembership {
  id: number;
  user_id: number;
  membership_tier: MembershipTier;
  membership_expire_at: string | null;
}

export interface MembershipUsage {
  used: number;
  limit: number;
  unlimited: boolean;
}

export interface MembershipInfo {
  tier: MembershipTier;
  expireAt: string | null;
  isExpired: boolean;
  usage: MembershipUsage;
}

export async function getUserMembership(userId: number): Promise<UserMembership | null> {
  const { data } = await supabase
    .from('users')
    .select('id, id as user_id, membership_tier, membership_expire_at')
    .eq('id', userId)
    .single();
  
  return data as UserMembership | null;
}

export async function isMembershipValid(userId: number): Promise<boolean> {
  const membership = await getUserMembership(userId);
  if (!membership) return false;
  
  if (membership.membership_tier === 'free') return true;
  if (!membership.membership_expire_at) return true;
  
  return new Date(membership.membership_expire_at) > new Date();
}

export async function getEffectiveTier(userId: number): Promise<MembershipTier> {
  if (!await isMembershipValid(userId)) {
    return 'free';
  }
  const membership = await getUserMembership(userId);
  return membership?.membership_tier || 'free';
}

export async function getTotalUsage(userId: number): Promise<number> {
  const { count } = await supabase
    .from('migrations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  return count || 0;
}

export async function getUsage(userId: number): Promise<MembershipUsage> {
  const tier = await getEffectiveTier(userId);
  const limit = USAGE_LIMITS[tier];
  const used = await getTotalUsage(userId);
  
  return {
    used,
    limit,
    unlimited: limit === -1
  };
}

export async function canMigrate(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsage(userId);
  
  if (!usage.unlimited && usage.used >= usage.limit) {
    return {
      allowed: false,
      reason: '免费迁移次数已用完，升级Pro解锁无限迁移'
    };
  }
  
  return { allowed: true };
}

export async function getMembershipInfo(userId: number): Promise<MembershipInfo> {
  const membership = await getUserMembership(userId);
  const tier = membership?.membership_tier || 'free';
  const expireAt = membership?.membership_expire_at || null;
  
  let isExpired = false;
  if (tier !== 'free' && expireAt) {
    isExpired = new Date(expireAt) <= new Date();
  }
  
  return {
    tier: isExpired ? 'free' : tier,
    expireAt,
    isExpired,
    usage: await getUsage(userId)
  };
}

export async function updateMembership(userId: number, tier: MembershipTier, expireAt?: Date): Promise<boolean> {
  try {
    const updateData: { membership_tier: MembershipTier; membership_expire_at: string | null } = {
      membership_tier: tier,
      membership_expire_at: expireAt ? expireAt.toISOString() : null
    };

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
    
    if (error) {
      console.error('Update membership error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Update membership error:', error);
    return false;
  }
}

export async function createOrder(
  userId: number,
  plan: PlanType,
  amount: number,
  payMethod?: 'wechat' | 'alipay' | 'stripe'
): Promise<{ order_id: string } | null> {
  const orderId = `CM${Date.now()}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_id: orderId,
      plan,
      amount,
      pay_method: payMethod || null,
      status: 'pending'
    })
    .select('order_id')
    .single();
  
  if (error) {
    console.error('Create order error:', error);
    return null;
  }
  
  return data;
}

export async function findOrderByOrderId(orderId: string) {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();
  
  return data;
}

export async function getOrdersByUserId(userId: number) {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return data || [];
}

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'cancelled' | 'refunded',
  paidAt?: Date
): Promise<boolean> {
  try {
    const updateData: { status: string; paid_at?: string } = { status };
    if (status === 'paid' && paidAt) {
      updateData.paid_at = paidAt.toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId);
    
    if (error) {
      console.error('Update order status error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Update order status error:', error);
    return false;
  }
}

export async function getOrderStats() {
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: paidOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid');

  const { data: revenueData } = await supabase
    .from('orders')
    .select('amount')
    .eq('status', 'paid');

  const totalRevenue = revenueData?.reduce((sum, o) => sum + o.amount, 0) || 0;

  // 本月收入
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyData } = await supabase
    .from('orders')
    .select('amount')
    .eq('status', 'paid')
    .gte('paid_at', startOfMonth.toISOString());

  const monthlyRevenue = monthlyData?.reduce((sum, o) => sum + o.amount, 0) || 0;

  // 按套餐统计
  const { data: byPlanData } = await supabase
    .from('orders')
    .select('plan')
    .eq('status', 'paid');

  const byPlan: Record<string, number> = {};
  byPlanData?.forEach(o => {
    byPlan[o.plan] = (byPlan[o.plan] || 0) + 1;
  });

  // 按状态统计
  const { data: byStatusData } = await supabase
    .from('orders')
    .select('status');

  const byStatus: Record<string, number> = {};
  byStatusData?.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });

  return {
    totalOrders: totalOrders || 0,
    paidOrders: paidOrders || 0,
    totalRevenue,
    monthlyRevenue,
    byPlan,
    byStatus
  };
}

export function getTierFromPlan(plan: string): 'pro'  {
  if (plan.startsWith('invalid')) {
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
