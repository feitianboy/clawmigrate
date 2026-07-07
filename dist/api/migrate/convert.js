"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const cors_1 = require("../../lib/cors");
const adapters_1 = require("../../client/src/adapters");
const utils_1 = require("../../client/src/adapters/core/utils");
const mapper_1 = require("../../client/src/adapters/core/mapper");
async function handler(req, res) {
    (0, cors_1.setCorsHeaders)(req, res);
    if ((0, cors_1.handlePreflight)(req, res))
        return;
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    try {
        const { sourcePlatform, targetPlatform, rawData, categories } = req.body || {};
        if (!sourcePlatform || !targetPlatform || !rawData) {
            return res.status(400).json({ ok: false, error: 'sourcePlatform, targetPlatform, and rawData are required' });
        }
        const sourceAdapter = adapters_1.registry.get(sourcePlatform);
        const targetAdapter = adapters_1.registry.get(targetPlatform);
        if (!sourceAdapter) {
            return res.status(400).json({ ok: false, error: `Source platform ${sourcePlatform} not supported` });
        }
        if (!targetAdapter) {
            return res.status(400).json({ ok: false, error: `Target platform ${targetPlatform} not supported` });
        }
        const preprocessed = (0, utils_1.preprocessRawInput)(rawData);
        const parseResult = sourceAdapter.parseExportResult(preprocessed);
        if (!parseResult.success) {
            return res.status(400).json({ ok: false, error: 'Failed to parse export data', details: parseResult.errors });
        }
        const transformedSchema = (0, mapper_1.transformSchema)(parseResult.data, targetAdapter);
        const importOptions = {
            categories: categories || Object.values(sourceAdapter.supportedCategories),
            includeSensitive: false,
        };
        const importPrompt = targetAdapter.generateImportPrompt(transformedSchema, importOptions);
        return res.json({
            ok: true,
            data: {
                schema: transformedSchema,
                importPrompt: importPrompt.prompt,
                instructions: importPrompt.instructions,
                warnings: parseResult.warnings.map(w => ({
                    category: w.category,
                    field: w.field,
                    message: w.message,
                })),
                sourcePlatform: sourcePlatform,
                targetPlatform: targetPlatform,
                migrationSummary: {
                    totalItems: transformedSchema.metadata?.totalItems || 0,
                    sourcePlatform,
                    targetPlatform,
                },
            },
        });
    }
    catch (error) {
        console.error('Migration API error:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}
