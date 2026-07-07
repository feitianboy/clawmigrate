import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';

const PLATFORMS = [
  { id: 'claude', name: 'Claude', icon: '🦜', description: 'Anthropic Claude AI 助手', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'kimi', name: 'Kimi', icon: '🦊', description: 'Moonshot Kimi 智能助手', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'openclaw', name: 'OpenClaw', icon: '🦅', description: '开源 AI 助手框架', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'coze', name: 'Coze', icon: '🐦', description: '字节跳动 Coze Bot', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'doubao', name: '豆包', icon: '🫘', description: '字节跳动 豆包', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠', description: '深度求索 DeepSeek', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'tongyi', name: '通义千问', icon: '🐉', description: '阿里云 通义千问', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'wenxin', name: '文心一言', icon: '🤖', description: '百度 文心一言', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'qwen', name: 'Qwen', icon: '🦄', description: '阿里 通义 Qwen', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'xunfei', name: '讯飞星火', icon: '🔥', description: '科大讯飞 星火认知', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
  { id: 'gemini', name: 'Gemini', icon: '🌟', description: 'Google Gemini', supportedCategories: ['skills', 'memories', 'mcp_connections', 'projects', 'settings'] },
];

const FEATURE_MATRIX: Record<string, any> = {
  claude: { description: 'Anthropic Claude AI 助手', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  kimi: { description: 'Moonshot Kimi 智能助手', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  openclaw: { description: '开源 AI 助手框架', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  coze: { description: '字节跳动 Coze Bot', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  doubao: { description: '字节跳动 豆包', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  deepseek: { description: '深度求索 DeepSeek', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  tongyi: { description: '阿里云 通义千问', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  wenxin: { description: '百度 文心一言', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  qwen: { description: '阿里 通义 Qwen', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  xunfei: { description: '科大讯飞 星火认知', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
  gemini: { description: 'Google Gemini', hasProjects: true, hasSkills: true, hasMCP: true, hasMemories: true, hasAutomations: true, hasKnowledgeBase: true },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const platforms = PLATFORMS.map(platform => {
      const id = platform.id;
      const features = FEATURE_MATRIX[id] || {};
      return {
        id,
        name: platform.name || id,
        description: features.description || platform.description,
        icon: platform.icon,
        supportedCategories: platform.supportedCategories,
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