"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const cors_1 = require("../../lib/cors");
const adapters_1 = require("../../client/src/adapters");
async function handler(req, res) {
    (0, cors_1.setCorsHeaders)(req, res);
    if ((0, cors_1.handlePreflight)(req, res))
        return;
    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    try {
        const platforms = Array.from(adapters_1.registry.keys()).map(id => {
            const adapter = adapters_1.registry.get(id);
            const features = (0, adapters_1.getPlatformFeatureMatrix)()[id] || {};
            return {
                id,
                name: adapter?.name || id,
                description: features.description || '',
                supportedCategories: adapter?.supportedCategories || [],
                features: {
                    hasProjects: features.hasProjects || false,
                    hasSkills: features.hasSkills || false,
                    hasMCP: features.hasMCP || false,
                    hasMemories: features.hasMemories || false,
                    hasAutomations: features.hasAutomations || false,
                    hasKnowledgeBase: features.hasKnowledgeBase || false,
                },
            };
        });
        return res.json({
            ok: true,
            data: {
                platforms,
                total: platforms.length,
                apiVersion: '1.0.0',
            },
        });
    }
    catch (error) {
        console.error('Platforms API error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}
