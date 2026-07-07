"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.recordFailedAttempt = recordFailedAttempt;
exports.clearRateLimit = clearRateLimit;
exports.getClientIp = getClientIp;
exports.verifyAuth = verifyAuth;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.generateAdminToken = generateAdminToken;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("./supabase");
// 管理员 Token 有效期：24 小时（毫秒）
const ADMIN_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
// 获取 JWT 密钥，未配置则直接抛错（禁止使用默认密钥）
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
}
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 分钟窗口
const RATE_LIMIT_MAX_FAILURES = 10; // 最多 10 次失败
const RATE_LIMIT_LOCK_DURATION = 15 * 60 * 1000; // 锁定 15 分钟
function checkRateLimit(key) {
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry)
        return { allowed: true };
    if (entry.lockedUntil > now) {
        return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    return { allowed: true };
}
function recordFailedAttempt(key) {
    const now = Date.now();
    let entry = rateLimitMap.get(key);
    if (!entry) {
        entry = { count: 0, firstAttempt: now, lockedUntil: 0 };
        rateLimitMap.set(key, entry);
    }
    // 重置过期的窗口
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
        entry.count = 0;
        entry.firstAttempt = now;
        entry.lockedUntil = 0;
    }
    entry.count++;
    if (entry.count >= RATE_LIMIT_MAX_FAILURES) {
        entry.lockedUntil = now + RATE_LIMIT_LOCK_DURATION;
    }
}
function clearRateLimit(key) {
    rateLimitMap.delete(key);
}
// 获取客户端 IP
function getClientIp(req) {
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp)
        return cfConnectingIp;
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        const ips = xForwardedFor.split(',').map(ip => ip.trim());
        return ips[0] || 'unknown';
    }
    return req.ip || 'unknown';
}
// Helper function to extract token from cookies
function extractTokenFromCookies(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader)
        return null;
    // Parse cookies string
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
            acc[key.trim()] = value.trim();
        }
        return acc;
    }, {});
    return cookies['token'] || null;
}
// Extract token from Authorization header
function extractTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}
// Get token from either cookie or header (cookie takes priority)
function getToken(req) {
    // Try cookie first (HttpOnly cookie is the secure way)
    const cookieToken = extractTokenFromCookies(req);
    if (cookieToken)
        return cookieToken;
    // Fallback to Authorization header
    return extractTokenFromHeader(req);
}
async function verifyAuth(req) {
    const token = getToken(req);
    if (!token) {
        return null;
    }
    let secret;
    try {
        secret = getJwtSecret();
    }
    catch {
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // 从数据库验证用户仍然存在
        const { data: user } = await supabase_1.supabase
            .from('users')
            .select('id, username, email, role')
            .eq('id', decoded.userId)
            .single();
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };
    }
    catch (error) {
        return null;
    }
}
async function requireAuth(req) {
    const token = getToken(req);
    if (!token) {
        return { error: { status: 401, message: 'No token provided' } };
    }
    let secret;
    try {
        secret = getJwtSecret();
    }
    catch {
        return { error: { status: 500, message: 'Server authentication not configured' } };
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const { data: user } = await supabase_1.supabase
            .from('users')
            .select('id, username, email, role')
            .eq('id', decoded.userId)
            .single();
        if (!user) {
            return { error: { status: 401, message: 'User not found' } };
        }
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
    }
    catch (error) {
        return { error: { status: 401, message: 'Invalid token' } };
    }
}
async function requireAdmin(req) {
    // 管理员鉴权：使用独立的 admins 表，支持 X-Admin-Token 和 Authorization Bearer
    const adminToken = req.headers['x-admin-token'];
    const authHeader = req.headers.authorization;
    let token = null;
    if (adminToken) {
        token = adminToken;
    }
    else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        return { error: { status: 401, message: 'No token provided' } };
    }
    let secret;
    try {
        secret = getJwtSecret();
    }
    catch {
        return { error: { status: 500, message: 'Server authentication not configured' } };
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // 从 admins 表验证管理员存在
        const { data: admin } = await supabase_1.supabase
            .from('admins')
            .select('id, username')
            .eq('id', decoded.userId)
            .single();
        if (!admin) {
            return { error: { status: 401, message: 'Admin not found' } };
        }
        return {
            user: {
                id: admin.id,
                username: admin.username
            }
        };
    }
    catch (error) {
        return { error: { status: 401, message: 'Invalid or expired token' } };
    }
}
// 生成管理员 Token（含时间戳，24h 后过期）
function generateAdminToken(adminPassword) {
    const payload = `${adminPassword}:${Date.now()}`;
    return Buffer.from(payload).toString('base64');
}
function generateToken(user) {
    const secret = getJwtSecret();
    return jsonwebtoken_1.default.sign({ userId: user.id, username: user.username, role: user.role }, secret, { expiresIn: '7d' });
}
