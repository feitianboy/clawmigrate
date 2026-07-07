import { PlatformAdapter, UnifiedSchema, MigrationCategory } from '../adapters/core/types';
import { registry } from '../adapters';

export interface NormalizedConfig {
  agentName: string;
  settings: Record<string, any>;
  skills: Array<{ name: string; description?: string; config?: Record<string, any>; enabled?: boolean }>;
  memories: Array<{ content: string; type?: string; tags?: string[] }>;
  mcpConnections: Array<{
    name: string;
    serverUrl?: string;
    transportType?: string;
    tools?: string[];
    config?: Record<string, any>;
    apiKey?: string;
  }>;
  projects: Array<{ name: string; description?: string; content?: string }>;
}

export interface ConvertedResult {
  format: string;
  label: string;
  description: string;
  config: Record<string, any>;
  mcpServers?: any[];
  memories?: any[];
  skills?: any[];
  projects?: any[];
  manualSteps: string[];
}

export interface ConvertStats {
  totalItems: number;
  skills: number;
  memories: number;
  mcpConnections: number;
  projects: number;
  hasSettings: boolean;
  sensitiveItems: number;
  convertedFormat: string;
}

export function convertConfig(
  sourcePlatformId: string,
  targetPlatformId: string,
  rawData: string | object,
  categories?: MigrationCategory[],
): { converted: ConvertedResult; stats: ConvertStats } {
  const source = registry.get(sourcePlatformId);
  const target = registry.get(targetPlatformId);

  if (!source) throw new Error(`不支持的源平台: ${sourcePlatformId}`);
  if (!target) throw new Error(`不支持的目标平台: ${targetPlatformId}`);

  let parsed: any;
  try {
    parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
  } catch {
    throw new Error('JSON 格式无效，请检查输入数据');
  }

  const normalized = normalizeData(parsed);
  const converted = convertToTarget(normalized, target);
  const stats = calculateStats(normalized, converted);

  return { converted, stats };
}

function normalizeData(data: any): NormalizedConfig {
  return {
    agentName: data.agent_name || data.name || data.project_name || '迁移的助手',
    settings: {
      model: data.settings?.model || data.model || undefined,
      temperature: data.settings?.temperature ?? data.temperature ?? undefined,
      language: data.settings?.language || data.language || undefined,
      systemPrompt: data.settings?.system_prompt || data.settings?.systemPrompt || data.system_prompt || data.systemPrompt || undefined,
      ...data.settings,
    },
    skills: normalizeArray(data.skills || data.plugins || data.tools || data.actions, (item: any) => ({
      name: item.name || item.title || '未命名技能',
      description: item.description || item.desc || undefined,
      config: item.config || item.parameters || item.params || undefined,
      enabled: item.enabled ?? item.is_active ?? true,
    })),
    memories: normalizeArray(data.memories || data.knowledge || data.memory || [], (item: any) => ({
      content: item.content || item.text || item.value || String(item),
      type: item.type || 'fact',
      tags: item.tags || [],
    })),
    mcpConnections: normalizeArray(data.mcp_connections || data.mcpConnections || data.mcp_servers || data.mcpServers || [], (item: any) => ({
      name: item.name || item.server_name || '未命名 MCP',
      serverUrl: item.server_url || item.serverUrl || item.url || undefined,
      transportType: item.transport_type || item.transportType || item.type || 'sse',
      tools: item.tools || item.tool_list || [],
      config: item.config || item.options || undefined,
      apiKey: item.api_key || item.apiKey || item.token || undefined,
    })),
    projects: normalizeArray(data.projects || data.workflows || data.automations || [], (item: any) => ({
      name: item.name || item.title || '未命名项目',
      description: item.description || item.desc || undefined,
      content: item.content || item.prompt || item.definition || undefined,
    })),
  };
}

function normalizeArray(arr: any, mapper: (item: any) => any): any[] {
  if (!arr) return [];
  if (!Array.isArray(arr)) arr = [arr];
  return arr.map(mapper);
}

function convertToTarget(data: NormalizedConfig, target: PlatformAdapter): ConvertedResult {
  const targetId = target.id;

  switch (targetId) {
    case 'claude':
      return toClaudeFormat(data);
    case 'kimi':
      return toKimiFormat(data);
    case 'gemini':
      return toGeminiFormat(data);
    case 'coze':
      return toCozeFormat(data);
    case 'deepseek':
      return toDeepSeekFormat(data);
    default:
      return toGenericFormat(data, target.name);
  }
}

function toClaudeFormat(data: NormalizedConfig): ConvertedResult {
  return {
    format: 'claude',
    label: 'Claude Project 配置',
    description: '在 Claude 中创建新 Project，按以下说明配置',
    config: {
      project: {
        name: data.agentName,
        description: `从迁移导入 - ${new Date().toLocaleDateString()}`,
      },
      systemPrompt: data.settings.systemPrompt || `你是 ${data.agentName}。`,
      settings: {
        model: data.settings.model || 'claude-sonnet-4-20250514',
        temperature: data.settings.temperature ?? 1,
      },
    },
    mcpServers: data.mcpConnections.map(conn => ({
      name: conn.name,
      type: conn.transportType || 'sse',
      url: conn.serverUrl || '',
      tools: conn.tools || [],
      apiKey: conn.apiKey || '',
    })),
    memories: data.memories.map(m => m.content),
    skills: data.skills.map(s => ({
      name: s.name,
      description: s.description || '',
      config: s.config || {},
    })),
    projects: data.projects.map(p => ({
      name: p.name,
      description: p.description || '',
      content: p.content || '',
    })),
    manualSteps: [
      '在 Claude 中新建 Project',
      '将 System Prompt 粘贴到项目指令中',
      '在 Settings 中设置模型和温度',
      '在 MCP 连接中添加服务器配置（API Key 一并填入）',
      '检查敏感信息是否正确填写',
    ],
  };
}

function toKimiFormat(data: NormalizedConfig): ConvertedResult {
  return {
    format: 'kimi',
    label: 'Kimi 助手配置',
    description: '在 Kimi 中创建新助手，按以下说明配置',
    config: {
      assistant: {
        name: data.agentName,
        description: `从迁移导入 - ${new Date().toLocaleDateString()}`,
      },
      systemPrompt: data.settings.systemPrompt || `你是 ${data.agentName}。`,
      settings: {
        model: data.settings.model || 'moonshot-v1-auto',
        temperature: data.settings.temperature ?? 0.7,
      },
    },
    mcpServers: data.mcpConnections.map(conn => ({
      name: conn.name,
      url: conn.serverUrl || '',
      tools: conn.tools || [],
      apiKey: conn.apiKey || '',
    })),
    memories: data.memories.map(m => m.content),
    skills: data.skills.map(s => ({
      name: s.name,
      description: s.description || '',
    })),
    manualSteps: [
      '在 Kimi 中新建助手',
      '将 System Prompt 粘贴到助手设置中',
      '在 MCP 工具中添加服务器配置（API Key 一并填入）',
      '检查敏感信息是否正确填写',
    ],
  };
}

function toGeminiFormat(data: NormalizedConfig): ConvertedResult {
  return {
    format: 'gemini',
    label: 'Gemini Gem 配置',
    description: '在 Gemini 中创建新 Gem，按以下说明配置',
    config: {
      gem: {
        name: data.agentName,
        instructions: data.settings.systemPrompt || `You are ${data.agentName}.`,
      },
      settings: {
        model: data.settings.model || 'gemini-2.0-flash',
        temperature: data.settings.temperature ?? 1,
      },
    },
    memories: data.memories.map(m => m.content),
    skills: data.skills.map(s => ({
      name: s.name,
      description: s.description || '',
    })),
    manualSteps: [
      '在 Gemini 中新建 Gem',
      '将 Instructions 粘贴到 Gem 指令中',
      '手动补充知识库文件',
      '手动填写 API Key 和敏感信息',
    ],
  };
}

function toCozeFormat(data: NormalizedConfig): ConvertedResult {
  return {
    format: 'coze',
    label: 'Coze Bot 配置',
    description: '在 Coze 中创建新 Bot，按以下说明配置',
    config: {
      bot: {
        name: data.agentName,
        description: data.settings.systemPrompt || `你是 ${data.agentName}。`,
      },
      settings: {
        model: data.settings.model || 'doubao-pro-32k',
        temperature: data.settings.temperature ?? 0.7,
      },
    },
    memories: data.memories.map(m => m.content),
    skills: data.skills.map(s => ({
      name: s.name,
      description: s.description || '',
      config: s.config || {},
    })),
    projects: data.projects.map(p => ({
      name: p.name,
      description: p.description || '',
      workflow: p.content || '',
    })),
    manualSteps: [
      '在 Coze 中新建 Bot',
      '将描述粘填入 Bot Prompt',
      '添加对应的插件和工具',
      '手动填写 API Key 和敏感信息',
    ],
  };
}

function toDeepSeekFormat(data: NormalizedConfig): ConvertedResult {
  return {
    format: 'deepseek',
    label: 'DeepSeek 助手配置',
    description: '在 DeepSeek 中创建新对话，将以下内容作为系统提示词',
    config: {
      systemPrompt: data.settings.systemPrompt || `你是 ${data.agentName}。`,
      settings: {
        model: data.settings.model || 'deepseek-chat',
        temperature: data.settings.temperature ?? 0.7,
      },
    },
    memories: data.memories.map(m => m.content),
    manualSteps: [
      '在 DeepSeek 中新建对话',
      '将 System Prompt 粘贴到系统提示词设置中',
      '手动填写 API Key 和敏感信息',
    ],
  };
}

function toGenericFormat(data: NormalizedConfig, targetName: string): ConvertedResult {
  return {
    format: 'generic',
    label: `${targetName} 配置`,
    description: `将以下配置导入 ${targetName}`,
    config: {
      name: data.agentName,
      systemPrompt: data.settings.systemPrompt || `你是 ${data.agentName}。`,
      settings: {
        model: data.settings.model,
        temperature: data.settings.temperature,
        language: data.settings.language,
      },
    },
    mcpServers: data.mcpConnections,
    memories: data.memories,
    skills: data.skills,
    projects: data.projects,
    manualSteps: [
      `在 ${targetName} 中创建新助手/项目`,
      '将 System Prompt 粘贴到对应设置中',
      '手动填写 API Key 和敏感信息',
    ],
  };
}

function calculateStats(normalized: NormalizedConfig, converted: ConvertedResult): ConvertStats {
  const total = normalized.skills.length + normalized.memories.length + normalized.mcpConnections.length + normalized.projects.length + (Object.keys(normalized.settings).length > 0 ? 1 : 0);
  const sensitive = [
    ...normalized.mcpConnections.filter(c => c.apiKey && c.apiKey !== '***' && c.apiKey.length > 0),
    ...normalized.skills.filter(s => s.config && Object.values(s.config).some(v => typeof v === 'string' && v.length > 10 && v !== '***')),
  ].length;

  return {
    totalItems: total,
    skills: normalized.skills.length,
    memories: normalized.memories.length,
    mcpConnections: normalized.mcpConnections.length,
    projects: normalized.projects.length,
    hasSettings: Object.keys(normalized.settings).length > 0,
    sensitiveItems: sensitive,
    convertedFormat: converted.format,
  };
}

export function generateImportPrompt(converted: ConvertedResult, targetPlatformName: string): string {
  const lines: string[] = [];

  lines.push(`请帮我在 ${targetPlatformName} 中创建一个新助手，配置如下：\n`);

  if (converted.config.project?.name || converted.config.assistant?.name || converted.config.gem?.name || converted.config.name) {
    lines.push(`【名称】${converted.config.project?.name || converted.config.assistant?.name || converted.config.gem?.name || converted.config.name}`);
  }

  const systemPrompt = converted.config.systemPrompt || converted.config.gem?.instructions || '';
  if (systemPrompt) {
    lines.push(`\n【系统提示词】\n${systemPrompt}`);
  }

  if (converted.config.settings) {
    lines.push(`\n【设置】`);
    if (converted.config.settings.model) lines.push(`- 模型：${converted.config.settings.model}`);
    if (converted.config.settings.temperature !== undefined) lines.push(`- 温度：${converted.config.settings.temperature}`);
  }

  if (converted.skills && converted.skills.length > 0) {
    lines.push(`\n【技能/插件】（共 ${converted.skills.length} 个）`);
    converted.skills.forEach((s: any) => {
      lines.push(`- ${s.name}${s.description ? `：${s.description}` : ''}`);
      if (s.config && Object.keys(s.config).length > 0) {
        Object.entries(s.config).forEach(([k, v]) => {
          lines.push(`  ${k}: ${v}`);
        });
      }
    });
  }

  if (converted.mcpServers && converted.mcpServers.length > 0) {
    lines.push(`\n【MCP 服务器】（共 ${converted.mcpServers.length} 个）`);
    converted.mcpServers.forEach((s: any) => {
      lines.push(`- ${s.name}`);
      if (s.url) lines.push(`  URL: ${s.url}`);
      if (s.type) lines.push(`  类型: ${s.type}`);
      if (s.apiKey) lines.push(`  API Key: ${s.apiKey}`);
      if (s.tools && s.tools.length > 0) lines.push(`  工具: ${s.tools.join(', ')}`);
    });
  }

  if (converted.memories && converted.memories.length > 0) {
    lines.push(`\n【记忆/知识库】（共 ${converted.memories.length} 条）`);
    converted.memories.forEach((m: any, i: number) => {
      const content = typeof m === 'string' ? m : m.content;
      lines.push(`${i + 1}. ${content}`);
    });
  }

  if (converted.projects && converted.projects.length > 0) {
    lines.push(`\n【项目/工作流】（共 ${converted.projects.length} 个）`);
    converted.projects.forEach((p: any) => {
      lines.push(`- ${p.name}${p.description ? `：${p.description}` : ''}`);
      if (p.content || p.workflow) {
        lines.push(`  ${p.content || p.workflow}`);
      }
    });
  }

  lines.push(`\n【注意事项】`);
  lines.push('- 请检查所有 API Key 和敏感信息是否正确');
  lines.push('- 如遇配置失败，请检查目标平台的权限限制');
  lines.push('- 建议先测试一个简单配置确认无误后再全部迁移');

  return lines.join('\n');
}