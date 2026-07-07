import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';
import { registry, getPlatformFeatureMatrix } from '../../client/src/adapters';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const allAdapters = registry.getAll();
    const featureMatrix = getPlatformFeatureMatrix();
    const platforms = allAdapters.map(adapter => {
      const id = adapter.id;
      const features = featureMatrix[id as keyof typeof featureMatrix] || {};
      return {
        id,
        name: adapter.name || id,
        description: (features as any).description || '',
        supportedCategories: adapter.supportedExportCategories || [],
        features: {
          hasProjects: (features as any).hasProjects || false,
          hasSkills: (features as any).hasSkills || false,
          hasMCP: (features as any).hasMCP || false,
          hasMemories: (features as any).hasMemories || false,
          hasAutomations: (features as any).hasAutomations || false,
          hasKnowledgeBase: (features as any).hasKnowledgeBase || false,
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
  } catch (error) {
    console.error('Platforms API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}