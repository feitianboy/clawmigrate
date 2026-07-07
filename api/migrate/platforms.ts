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
    const platforms = Array.from(registry.keys()).map(id => {
      const adapter = registry.get(id);
      const features = getPlatformFeatureMatrix()[id] || {};
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
  } catch (error) {
    console.error('Platforms API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}