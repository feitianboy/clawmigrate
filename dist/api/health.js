"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    res.json({
        ok: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString()
        }
    });
}
