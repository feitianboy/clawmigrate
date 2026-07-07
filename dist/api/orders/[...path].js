"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const auth_1 = require("../../lib/auth");
const membership_1 = require("../../lib/membership");
const utils_1 = require("../../lib/utils");
const cors_1 = require("../../lib/cors");
const payment_1 = require("../../lib/payment");
const ZPAY_BASE_URL = 'https://zpayz.cn/submit.php';
const NOTIFY_URL = `${process.env.APP_URL || 'https://clawmigrate.xyz'}/api/orders/callback`;
const RETURN_URL_BASE = process.env.APP_URL || 'https://clawmigrate.xyz';
const ZPAY_PID = process.env.ZPAY_PID || '';
const ZPAY_KEY = process.env.ZPAY_KEY || '';
async function handler(req, res) {
    (0, cors_1.setCorsHeaders)(req, res);
    if ((0, cors_1.handlePreflight)(req, res))
        return;
    const segments = [].concat(req.query['...path'] || []);
    const subPath = segments.join('/');
    // GET /api/orders → list user's orders
    if (!subPath && req.method === 'GET')
        return handleListOrders(req, res);
    // POST /api/orders/create → create order (ZPAY)
    if (subPath === 'create' && req.method === 'POST')
        return handleCreateOrder(req, res);
    // GET /api/orders/callback → ZPAY payment callback
    if (subPath === 'callback' && req.method === 'GET')
        return handleCallback(req, res);
    // GET /api/orders/:id → get single order
    if (segments.length === 1 && req.method === 'GET')
        return handleGetOrder(req, res, segments[0]);
    // POST /api/orders/:id/cancel → cancel order
    if (segments.length === 2 && segments[1] === 'cancel' && req.method === 'POST')
        return handleCancelOrder(req, res, segments[0]);
    return res.status(404).json({ ok: false, error: 'Order route not found' });
}
// ---- List Orders ----
async function handleListOrders(req, res) {
    try {
        const result = await (0, auth_1.requireAuth)(req);
        if (result.error)
            return res.status(result.error.status).json({ ok: false, error: result.error.message });
        const orders = await (0, membership_1.getOrdersByUserId)(result.user.id);
        const formattedOrders = orders.map(order => ({
            orderId: order.order_id, plan: order.plan, planName: (0, utils_1.getPlanName)(order.plan),
            amount: order.amount, payMethod: order.pay_method, status: order.status,
            statusName: (0, utils_1.getStatusName)(order.status), createdAt: order.created_at, paidAt: order.paid_at
        }));
        return res.json({ ok: true, data: formattedOrders });
    }
    catch (error) {
        console.error('Get orders error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}
// ---- Create Order (ZPAY) ----
async function handleCreateOrder(req, res) {
    try {
        const result = await (0, auth_1.requireAuth)(req);
        if (result.error)
            return res.status(result.error.status).json({ ok: false, error: result.error.message });
        const { plan, payType } = req.body;
        if (!plan || !membership_1.PLAN_PRICES[plan])
            return res.status(400).json({ ok: false, error: 'Invalid plan' });
        const validPayTypes = ['wxpay'];
        if (!payType || !validPayTypes.includes(payType))
            return res.status(400).json({ ok: false, error: 'Invalid payment type, must be wxpay' });
        if (!ZPAY_PID || !ZPAY_KEY) {
            console.error('ZPAY credentials not configured');
            return res.status(500).json({ ok: false, error: 'Payment system not configured' });
        }
        const amount = membership_1.PLAN_PRICES[plan];
        const payMethod = 'wechat';
        // Create order (no discount - MVP dropped first-order discount)
        const order = await (0, membership_1.createOrder)(result.user.id, plan, amount, payMethod);
        if (!order)
            return res.status(500).json({ ok: false, error: 'Failed to create order' });
        // Build ZPAY payment params
        const planName = plan === 'pro_yearly' ? '虾管家Pro年度' : '虾管家Pro月费';
        const zpayParams = {
            pid: ZPAY_PID,
            type: payType,
            out_trade_no: order.order_id,
            notify_url: NOTIFY_URL,
            return_url: RETURN_URL_BASE + '?out_trade_no=' + order.order_id,
            name: planName,
            money: amount.toFixed(2),
        };
        const sign = (0, payment_1.generateSign)(zpayParams, ZPAY_KEY);
        zpayParams.sign = sign;
        zpayParams.sign_type = 'MD5';
        const queryString = Object.keys(zpayParams)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(zpayParams[k]))
            .join('&');
        const payUrl = ZPAY_BASE_URL + '?' + queryString;
        await (0, utils_1.logActivity)(result.user.id, 'create_order', { orderId: order.order_id, plan, amount, payType }, req.headers['x-forwarded-for'] || '');
        return res.status(201).json({
            ok: true,
            data: { orderId: order.order_id, amount, payUrl, payType }
        });
    }
    catch (error) {
        console.error('Create order error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}
// ---- Process payment asynchronously (extracted from callback) ----
async function processPayment(orderId, tradeNo, type, money, clientIp) {
    try {
        const order = await (0, membership_1.findOrderByOrderId)(orderId);
        if (!order) {
            console.error('ZPAY callback order not found:', orderId);
            return;
        }
        if (order.status === 'paid') {
            console.log('ZPAY callback order already paid:', orderId);
            return;
        }
        const callbackAmount = parseFloat(money);
        const orderAmount = parseFloat(String(order.amount));
        // 用整数分比较，避免浮点数精度问题
        if (Math.round(callbackAmount * 100) !== Math.round(orderAmount * 100)) {
            console.error('ZPAY callback amount mismatch:', { callbackAmount, orderAmount, orderId });
            return;
        }
        const paidAt = new Date();
        await (0, membership_1.updateOrderStatus)(orderId, 'paid', paidAt);
        const tier = (0, utils_1.getTierFromPlan)(order.plan);
        const expireAt = (0, utils_1.getExpireAt)(order.plan);
        await (0, membership_1.updateMembership)(order.user_id, tier, expireAt);
        await (0, utils_1.logActivity)(order.user_id, 'payment_success', {
            orderId, tradeNo, plan: order.plan, tier, amount: order.amount, payType: type, paidAt: paidAt.toISOString()
        }, clientIp);
        console.log('ZPAY payment successful: order=' + orderId + ' user=' + order.user_id + ' tier=' + tier);
    }
    catch (error) {
        console.error('processPayment error:', error);
    }
}
// ---- ZPAY Payment Callback (GET) ----
async function handleCallback(req, res) {
    try {
        const { out_trade_no, trade_no, type, money, trade_status, sign } = req.query;
        console.log('ZPAY callback received:', JSON.stringify(req.query));
        // 先校验必要参数
        if (!out_trade_no || !trade_status || !sign) {
            console.error('ZPAY callback missing required params');
            res.send('fail');
            return;
        }
        if (!ZPAY_KEY) {
            console.error('ZPAY_KEY not configured');
            res.send('fail');
            return;
        }
        // 组装参数并验签（必须在返回 success 之前完成）
        const params = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (key === '...path')
                continue;
            if (typeof value === 'string') {
                params[key] = value;
            }
            else if (Array.isArray(value)) {
                params[key] = value[0];
            }
        }
        const receivedSign = String(sign);
        if (!(0, payment_1.verifySign)(params, ZPAY_KEY, receivedSign)) {
            console.error('ZPAY callback signature verification failed');
            res.send('fail');
            return;
        }
        if (trade_status !== 'TRADE_SUCCESS') {
            console.log('ZPAY callback trade_status not SUCCESS:', trade_status);
            res.send('success'); // 非成功状态也告知 ZPAY 已收到
            return;
        }
        // 验签通过后，同步处理支付，完成后再返回 success
        // Serverless 环境中 res.send() 后函数可能被终止，必须确保支付处理完成
        const orderId = String(out_trade_no);
        const clientIp = req.headers['x-forwarded-for'] || '';
        await processPayment(orderId, String(trade_no || ''), String(type || ''), String(money || ''), clientIp);
        res.send('success');
    }
    catch (error) {
        console.error('ZPAY callback error:', error);
        // 异常时返回 fail，让 ZPAY 重试
        try {
            res.send('fail');
        }
        catch { /* already sent */ }
    }
}
// ---- Get Single Order ----
async function handleGetOrder(req, res, orderId) {
    try {
        const result = await (0, auth_1.requireAuth)(req);
        if (result.error)
            return res.status(result.error.status).json({ ok: false, error: result.error.message });
        const order = await (0, membership_1.findOrderByOrderId)(orderId);
        if (!order)
            return res.status(404).json({ ok: false, error: 'Order not found' });
        if (order.user_id !== result.user.id)
            return res.status(403).json({ ok: false, error: 'Access denied' });
        // Active ZPAY polling: if order is pending, query ZPAY API
        if (order.status === 'pending') {
            const zpayResult = await (0, payment_1.queryZpayOrder)(orderId);
            if (zpayResult.paid) {
                const paidAt = new Date();
                await (0, membership_1.updateOrderStatus)(orderId, 'paid', paidAt);
                const tier = (0, utils_1.getTierFromPlan)(order.plan);
                const expireAt = (0, utils_1.getExpireAt)(order.plan);
                await (0, membership_1.updateMembership)(order.user_id, tier, expireAt);
                await (0, utils_1.logActivity)(order.user_id, 'payment_success', {
                    orderId, tradeNo: zpayResult.tradeNo || '', plan: order.plan, tier,
                    amount: order.amount, paidAt: paidAt.toISOString()
                }, req.headers['x-forwarded-for'] || '');
                console.log('ZPAY active poll: order=' + orderId + ' user=' + order.user_id + ' tier=' + tier);
                return res.json({
                    ok: true, data: {
                        orderId: order.order_id, plan: order.plan, planName: (0, utils_1.getPlanName)(order.plan),
                        amount: order.amount, payMethod: order.pay_method, status: 'paid',
                        statusName: '已支付', createdAt: order.created_at, paidAt: paidAt.toISOString()
                    }
                });
            }
        }
        return res.json({
            ok: true, data: {
                orderId: order.order_id, plan: order.plan, planName: (0, utils_1.getPlanName)(order.plan),
                amount: order.amount, payMethod: order.pay_method, status: order.status,
                statusName: (0, utils_1.getStatusName)(order.status), createdAt: order.created_at, paidAt: order.paid_at
            }
        });
    }
    catch (error) {
        console.error('Get order error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}
// ---- Cancel Order ----
async function handleCancelOrder(req, res, orderId) {
    try {
        const result = await (0, auth_1.requireAuth)(req);
        if (result.error)
            return res.status(result.error.status).json({ ok: false, error: result.error.message });
        const order = await (0, membership_1.findOrderByOrderId)(orderId);
        if (!order)
            return res.status(404).json({ ok: false, error: 'Order not found' });
        if (order.user_id !== result.user.id)
            return res.status(403).json({ ok: false, error: 'Access denied' });
        if (order.status !== 'pending')
            return res.status(400).json({ ok: false, error: 'Only pending orders can be cancelled' });
        const updated = await (0, membership_1.updateOrderStatus)(orderId, 'cancelled');
        if (!updated)
            return res.status(500).json({ ok: false, error: 'Failed to cancel order' });
        await (0, utils_1.logActivity)(result.user.id, 'cancel_order', { orderId }, req.headers['x-forwarded-for'] || '');
        return res.json({ ok: true, data: { message: 'Order cancelled successfully' } });
    }
    catch (error) {
        console.error('Cancel order error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}
