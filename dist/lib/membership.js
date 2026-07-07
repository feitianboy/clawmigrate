"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_PRICES = exports.USAGE_LIMITS = void 0;
exports.getUserMembership = getUserMembership;
exports.isMembershipValid = isMembershipValid;
exports.getEffectiveTier = getEffectiveTier;
exports.getTotalUsage = getTotalUsage;
exports.getUsage = getUsage;
exports.canMigrate = canMigrate;
exports.getMembershipInfo = getMembershipInfo;
exports.updateMembership = updateMembership;
exports.createOrder = createOrder;
exports.findOrderByOrderId = findOrderByOrderId;
exports.getOrdersByUserId = getOrdersByUserId;
exports.updateOrderStatus = updateOrderStatus;
exports.getOrderStats = getOrderStats;
const supabase_1 = require("./supabase");
exports.USAGE_LIMITS = {
    free: 2,
    pro: -1
};
exports.PLAN_PRICES = {
    pro_monthly: 19,
    pro_yearly: 149
};
async function getUserMembership(userId) {
    const { data } = await supabase_1.supabase
        .from('users')
        .select('id, membership_tier, membership_expire_at')
        .eq('id', userId)
        .single();
    if (!data)
        return null;
    return { ...data, user_id: data.id };
}
async function isMembershipValid(userId) {
    const membership = await getUserMembership(userId);
    if (!membership)
        return false;
    if (membership.membership_tier === 'free')
        return true;
    if (!membership.membership_expire_at)
        return true;
    return new Date(membership.membership_expire_at) > new Date();
}
async function getEffectiveTier(userId) {
    if (!await isMembershipValid(userId)) {
        return 'free';
    }
    const membership = await getUserMembership(userId);
    return membership?.membership_tier || 'free';
}
async function getTotalUsage(userId) {
    // 只统计已完成的迁移记录，不把 in_progress/failed 算进免费额度
    const { count } = await supabase_1.supabase
        .from('migrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed']);
    return count || 0;
}
async function getUsage(userId) {
    const tier = await getEffectiveTier(userId);
    const limit = exports.USAGE_LIMITS[tier];
    const used = await getTotalUsage(userId);
    return {
        used,
        limit,
        unlimited: limit === Infinity || limit === -1
    };
}
async function canMigrate(userId) {
    const usage = await getUsage(userId);
    if (!usage.unlimited && usage.used >= usage.limit) {
        return {
            allowed: false,
            reason: '免费迁移次数已用完，升级Pro解锁无限迁移'
        };
    }
    return { allowed: true };
}
async function getMembershipInfo(userId) {
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
async function updateMembership(userId, tier, expireAt) {
    try {
        const updateData = {
            membership_tier: tier,
            membership_expire_at: expireAt ? expireAt.toISOString() : null
        };
        const { error } = await supabase_1.supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);
        if (error) {
            console.error('Update membership error:', error);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Update membership error:', error);
        return false;
    }
}
async function createOrder(userId, plan, amount, payMethod) {
    const orderId = 'CM' + Date.now() + crypto.randomUUID().substring(0, 8).toUpperCase();
    const { data, error } = await supabase_1.supabase
        .from('orders')
        .insert({
        user_id: userId,
        order_id: orderId,
        plan,
        amount: amount,
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
async function findOrderByOrderId(orderId) {
    const { data } = await supabase_1.supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
    return data;
}
async function getOrdersByUserId(userId) {
    const { data } = await supabase_1.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return data || [];
}
async function updateOrderStatus(orderId, status, paidAt) {
    try {
        const updateData = { status };
        if (status === 'paid' && paidAt) {
            updateData.paid_at = paidAt.toISOString();
        }
        const { error } = await supabase_1.supabase
            .from('orders')
            .update(updateData)
            .eq('order_id', orderId);
        if (error) {
            console.error('Update order status error:', error);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('Update order status error:', error);
        return false;
    }
}
async function getOrderStats() {
    const { count: totalOrders } = await supabase_1.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
    const { count: paidOrders } = await supabase_1.supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');
    const { data: revenueData } = await supabase_1.supabase
        .from('orders')
        .select('amount')
        .eq('status', 'paid');
    const totalRevenue = revenueData?.reduce((sum, o) => sum + o.amount, 0) || 0;
    // 本月收入
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthlyData } = await supabase_1.supabase
        .from('orders')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth.toISOString());
    const monthlyRevenue = monthlyData?.reduce((sum, o) => sum + o.amount, 0) || 0;
    // 按套餐统计
    const { data: byPlanData } = await supabase_1.supabase
        .from('orders')
        .select('plan')
        .eq('status', 'paid');
    const byPlan = {};
    byPlanData?.forEach(o => {
        byPlan[o.plan] = (byPlan[o.plan] || 0) + 1;
    });
    // 按状态统计
    const { data: byStatusData } = await supabase_1.supabase
        .from('orders')
        .select('status');
    const byStatus = {};
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
