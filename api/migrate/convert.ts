import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';
import { registry } from '../../client/src/adapters';
import { preprocessRawInput, containsSensitiveData, maskSensitiveData } from '../../client/src/adapters/core/utils';
import { transformSchema } from '../../client/src/adapters/core/mapper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { sourcePlatform, targetPlatform, rawData, categories } = req.body || {};

    if (!sourcePlatform || !targetPlatform || !rawData) {
      return res.status(400).json({ ok: false, error: 'sourcePlatform, targetPlatform, and rawData are required' });
    }

    const sourceAdapter = registry.get(sourcePlatform);
    const targetAdapter = registry.get(targetPlatform);

    if (!sourceAdapter) {
      return res.status(400).json({ ok: false, error: `Source platform ${sourcePlatform} not supported` });
    }

    if (!targetAdapter) {
      return res.status(400).json({ ok: false, error: `Target platform ${targetPlatform} not supported` });
    }

    const preprocessed = preprocessRawInput(rawData);

    const parseResult = sourceAdapter.parseExportResult(preprocessed);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: 'Failed to parse export data', details: parseResult.errors });
    }

    const transformedSchema = transformSchema(parseResult.data, targetAdapter);

    const importOptions = {
      categories: categories || Object.values(sourceAdapter.supportedExportCategories),
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
  } catch (error) {
    console.error('Migration API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}