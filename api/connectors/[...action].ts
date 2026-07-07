import { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';
import { sampleExports } from '../../lib/sampleData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  const { action } = req.query;
  const actionStr = Array.isArray(action) ? action[0] : action;

  try {
    switch (actionStr) {
      case 'connect':
        return handleConnect(req, res);
      case 'disconnect':
        return handleDisconnect(req, res);
      case 'validate':
        return handleValidate(req, res);
      case 'agents':
        return handleGetAgents(req, res);
      case 'fetch-config':
        return handleFetchConfig(req, res);
      case 'write-config':
        return handleWriteConfig(req, res);
      case 'skill-config':
        return handleGetSkillConfig(req, res);
      default:
        return res.status(404).json({ ok: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Connector API error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

async function handleConnect(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { platformId, type } = req.body || {};

  if (!platformId) {
    return res.status(400).json({ ok: false, error: 'platformId is required' });
  }

  const token = `conn_${platformId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return res.json({
    ok: true,
    data: {
      accessToken: token,
      refreshToken: `refresh_${token}`,
      expiresAt: Date.now() + 3600 * 1000,
      userId: `user_${platformId}`,
      userName: `${platformId.charAt(0).toUpperCase() + platformId.slice(1)} User`,
    },
  });
}

async function handleDisconnect(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  return res.json({ ok: true, data: { disconnected: true } });
}

async function handleValidate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { accessToken } = req.body || {};
  const isValid = !!accessToken && accessToken.startsWith('conn_');

  return res.json({ ok: true, data: { valid: isValid } });
}

async function handleGetAgents(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const platformId = (req.query.platformId as string) || (req.body?.platformId);
  const accessToken = (req.query.accessToken as string) || (req.body?.accessToken);

  if (!platformId) {
    return res.status(400).json({ ok: false, error: 'platformId is required' });
  }

  const sampleData = (sampleExports as any)[platformId];
  const agents: any[] = [];

  if (sampleData) {
    if (sampleData.projects && Array.isArray(sampleData.projects)) {
      sampleData.projects.forEach((p: any, i: number) => {
        agents.push({
          id: `project_${i}`,
          name: p.name || `Project ${i + 1}`,
          description: p.description,
          type: 'project',
          icon: '📁',
          lastModified: new Date(Date.now() - i * 86400000).toISOString(),
          configCount: 1,
        });
      });
    }

    if (sampleData.skills && Array.isArray(sampleData.skills)) {
      sampleData.skills.forEach((s: any, i: number) => {
        agents.push({
          id: `skill_${i}`,
          name: s.name || `Skill ${i + 1}`,
          description: s.description,
          type: 'skill',
          icon: '🎯',
          lastModified: new Date(Date.now() - i * 86400000).toISOString(),
          configCount: 1,
        });
      });
    }

    if (sampleData.agent_name) {
      agents.unshift({
        id: 'main_agent',
        name: sampleData.agent_name,
        description: sampleData.agent_description,
        type: 'agent',
        icon: '🤖',
        lastModified: new Date().toISOString(),
        configCount: 5,
      });
    }

    if (agents.length === 0) {
      agents.push({
        id: 'default',
        name: `${platformId.charAt(0).toUpperCase() + platformId.slice(1)} 配置`,
        description: '默认配置',
        type: 'agent',
        icon: '🤖',
        lastModified: new Date().toISOString(),
        configCount: 3,
      });
    }
  } else {
    agents.push({
      id: 'default',
      name: `${platformId.charAt(0).toUpperCase() + platformId.slice(1)} 配置`,
      description: '默认配置',
      type: 'agent',
      icon: '🤖',
      lastModified: new Date().toISOString(),
      configCount: 3,
    });
  }

  return res.json({ ok: true, data: { agents } });
}

async function handleFetchConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { platformId, agentId, categories } = req.body || {};

  if (!platformId) {
    return res.status(400).json({ ok: false, error: 'platformId is required' });
  }

  const sampleData = (sampleExports as any)[platformId];

  if (sampleData) {
    return res.json({
      ok: true,
      data: {
        config: sampleData,
        agentId: agentId || 'default',
        exportedAt: new Date().toISOString(),
      },
    });
  }

  return res.json({
    ok: true,
    data: {
      config: {
        version: '1.0.0',
        settings: {
          model: 'default',
          temperature: 0.7,
          language: '中文',
        },
      },
      agentId: agentId || 'default',
      exportedAt: new Date().toISOString(),
    },
  });
}

async function handleWriteConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { platformId, configData, categories, mode, agentName } = req.body || {};

  if (!platformId || !configData) {
    return res.status(400).json({ ok: false, error: 'platformId and configData are required' });
  }

  const totalItems = configData?.metadata?.totalItems || 0;

  return res.json({
    ok: true,
    data: {
      success: true,
      agentId: `agent_${Date.now()}`,
      agentUrl: `https://${platformId}.example.com/agent/${Date.now()}`,
      itemsWritten: totalItems,
      mode: mode || 'create',
      agentName: agentName || 'Migrated Agent',
      warnings: [
        '这是模拟的写入操作',
        '实际使用时请在目标平台中粘贴导入提示词完成配置',
        '敏感配置（API Key等）需要手动配置',
      ],
    },
  });
}

async function handleGetSkillConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const platformId = req.query.platformId as string;

  if (!platformId) {
    return res.status(400).json({ ok: false, error: 'platformId is required' });
  }

  const skillConfigs: Record<string, any> = {
    claude: {
      id: 'clawmigrate-claude',
      name: 'ClawMigrate 迁移助手',
      description: '一键将 Claude Projects、记忆、MCP 配置迁移到其他 AI 平台',
      version: '1.0.0',
      apiEndpoint: '/api/migrate/convert',
      capabilities: ['export', 'convert', 'import'],
    },
    kimi: {
      id: 'clawmigrate-kimi',
      name: 'ClawMigrate 迁移助手',
      description: '一键将 Kimi 技能、记忆、MCP 配置迁移到其他 AI 平台',
      version: '1.0.0',
      apiEndpoint: '/api/migrate/convert',
      capabilities: ['export', 'convert', 'import'],
    },
  };

  const config = skillConfigs[platformId] || {
    id: `clawmigrate-${platformId}`,
    name: 'ClawMigrate 迁移助手',
    description: `一键将 ${platformId} 配置迁移到其他 AI 平台`,
    version: '1.0.0',
    apiEndpoint: '/api/migrate/convert',
    capabilities: ['export', 'convert', 'import'],
  };

  return res.json({ ok: true, data: config });
}
