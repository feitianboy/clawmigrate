import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from '../../lib/cors';
import { sampleExports } from '../../lib/sampleData';

const PLATFORMS = [
  { id: 'claude', name: 'Claude', icon: '🦜', description: 'Anthropic Claude AI 助手' },
  { id: 'kimi', name: 'Kimi', icon: '🦊', description: 'Moonshot Kimi 智能助手' },
  { id: 'openclaw', name: 'OpenClaw', icon: '🦅', description: '开源 AI 助手框架' },
  { id: 'coze', name: 'Coze', icon: '🐦', description: '字节跳动 Coze Bot' },
  { id: 'doubao', name: '豆包', icon: '🫘', description: '字节跳动 豆包' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠', description: '深度求索 DeepSeek' },
  { id: 'tongyi', name: '通义千问', icon: '🐉', description: '阿里云 通义千问' },
  { id: 'wenxin', name: '文心一言', icon: '🤖', description: '百度 文心一言' },
  { id: 'qwen', name: 'Qwen', icon: '🦄', description: '阿里 通义 Qwen' },
  { id: 'xunfei', name: '讯飞星火', icon: '🔥', description: '科大讯飞 星火认知' },
  { id: 'gemini', name: 'Gemini', icon: '🌟', description: 'Google Gemini' },
];

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

    const sourceInfo = PLATFORMS.find(p => p.id === sourcePlatform);
    const targetInfo = PLATFORMS.find(p => p.id === targetPlatform);

    if (!sourceInfo) {
      return res.status(400).json({ ok: false, error: `Source platform ${sourcePlatform} not supported` });
    }

    if (!targetInfo) {
      return res.status(400).json({ ok: false, error: `Target platform ${targetPlatform} not supported` });
    }

    const normalizedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    
    const totalItems = countItems(normalizedData);

    const importPrompt = generateImportPrompt(normalizedData, targetInfo, totalItems);

    return res.json({
      ok: true,
      data: {
        schema: {
          version: '1.0.0',
          sourcePlatform,
          exportTime: new Date().toISOString(),
          configs: normalizedData,
          metadata: {
            totalItems,
            sensitiveItems: [],
            unsupportedItems: [],
          },
        },
        importPrompt: importPrompt.prompt,
        instructions: importPrompt.instructions,
        warnings: [],
        sourcePlatform,
        targetPlatform,
        migrationSummary: {
          totalItems,
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

function countItems(data: any): number {
  let count = 0;
  if (data.skills) count += Array.isArray(data.skills) ? data.skills.length : 1;
  if (data.memories) count += Array.isArray(data.memories) ? data.memories.length : 1;
  if (data.projects) count += Array.isArray(data.projects) ? data.projects.length : 1;
  if (data.mcp_connections) count += Array.isArray(data.mcp_connections) ? data.mcp_connections.length : 1;
  if (data.settings) count += 1;
  return count;
}

function generateImportPrompt(data: any, targetInfo: any, totalItems: number): { prompt: string; instructions: string } {
  const agentName = data.agent_name || data.name || '迁移的 Agent';
  
  let prompt = `请帮我创建一个名为 "${agentName}" 的配置，包含以下内容：\n\n`;

  if (data.settings) {
    prompt += `【系统设置】\n`;
    if (data.settings.model) prompt += `- 模型：${data.settings.model}\n`;
    if (data.settings.temperature !== undefined) prompt += `- 温度：${data.settings.temperature}\n`;
    if (data.settings.language) prompt += `- 语言：${data.settings.language}\n`;
    if (data.settings.system_prompt || data.settings.systemPrompt) {
      const systemPrompt = data.settings.system_prompt || data.settings.systemPrompt;
      prompt += `- 系统提示词：${systemPrompt.substring(0, 200)}${systemPrompt.length > 200 ? '...' : ''}\n`;
    }
    prompt += '\n';
  }

  if (data.skills && Array.isArray(data.skills)) {
    prompt += `【技能/插件】共 ${data.skills.length} 个\n`;
    data.skills.forEach((skill: any) => {
      prompt += `- ${skill.name}: ${skill.description || '无描述'}\n`;
    });
    prompt += '\n';
  }

  if (data.memories && Array.isArray(data.memories)) {
    prompt += `【记忆/知识库】共 ${data.memories.length} 条\n`;
    data.memories.slice(0, 5).forEach((mem: any) => {
      prompt += `- ${mem.content ? mem.content.substring(0, 100) : '无内容'}${mem.content && mem.content.length > 100 ? '...' : ''}\n`;
    });
    if (data.memories.length > 5) prompt += `- ... 还有 ${data.memories.length - 5} 条\n`;
    prompt += '\n';
  }

  if (data.projects && Array.isArray(data.projects)) {
    prompt += `【项目/工作流】共 ${data.projects.length} 个\n`;
    data.projects.forEach((proj: any) => {
      prompt += `- ${proj.name}: ${proj.description || '无描述'}\n`;
    });
    prompt += '\n';
  }

  if (data.mcp_connections && Array.isArray(data.mcp_connections)) {
    prompt += `【MCP 连接】共 ${data.mcp_connections.length} 个\n`;
    data.mcp_connections.forEach((conn: any) => {
      prompt += `- ${conn.name}: ${conn.server_url || conn.serverUrl || '未配置URL'}\n`;
    });
    prompt += '\n';
  }

  prompt += `请按照 ${targetInfo.name} 的格式创建这些配置。注意：API Key、密码等敏感信息请留空，我会手动填写。`;

  const instructions = `1. 复制上方提示词\n2. 打开 ${targetInfo.name}\n3. 新建对话或 Agent\n4. 粘贴提示词并发送\n5. AI 会自动帮你创建所有配置`;

  return { prompt, instructions };
}