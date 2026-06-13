import {
  PlatformAdapter,
  MigrationCategory,
  SensitivityLevel,
  ExportOptions,
  ExportPromptResult,
  ParseResult,
  ParseError,
  ParseWarning,
  UnifiedSchema,
  MCPConfig,
  MemoryConfig,
  SettingsConfig,
  PromptConfig,
  ImportOptions,
  ImportPromptResult,
  ImportWarning,
  FieldMappingTable,
  SensitiveItem,
} from '@/adapters/core/types';

import {
  preprocessRawInput,
  containsSensitiveData,
  maskSensitiveData,
  detectSensitivity,
  detectMemorySensitivity,
  mapTransportType,
  mapMemoryType,
  mapPromptType,
} from '@/adapters/core/utils';

export const kimiAdapter: PlatformAdapter = {
  id: 'kimi',
  name: 'Kimi',
  version: '1.0.0',
  icon: '🟠',
  description: '月之暗面 Moonshot AI 出品的 Kimi 智能助手，支持超长上下文和 MCP',
  website: 'https://kimi.moonshot.cn',

  supportedExportCategories: [
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
  ],

  supportedImportCategories: [
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
  ],

  generateExportPrompt(options: ExportOptions): ExportPromptResult {
    const categories = options.categories.map((c) => {
      const labels: Record<string, string> = {
        skills: '自定义工具/插件',
        automations: '自动化任务',
        mcp_connections: 'MCP 服务器配置',
        memories: 'Kimi+ 记忆和知识',
        settings: '设置（模型偏好、语言等）',
        prompts: '提示词和系统指令',
        knowledge_bases: '知识库',
      };
      return labels[c] || c;
    });

    const prompt = `请将你当前的所有配置以 JSON 格式导出。我需要以下类别的配置信息：

${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

请按以下 JSON 格式输出（不要添加任何其他文字说明，只输出 JSON）：

\`\`\`json
{
  "prompts": [
    {
      "name": "提示词名称",
      "content": "完整的提示词内容",
      "type": "system"
    }
  ],
  "mcp_servers": [
    {
      "name": "MCP服务器名称",
      "command": "启动命令（如 npx 或 python）",
      "args": ["参数列表"],
      "env": {},
      "url": "HTTP模式的URL（如有）",
      "transport_type": "stdio 或 sse 或 streamable-http",
      "tools": ["可用工具列表"]
    }
  ],
  "settings": {
    "model": "默认模型名称（如 moonshot-v1-8k）",
    "temperature": 0.7,
    "language": "语言偏好",
    "custom_settings": {}
  },
  "memories": [
    {
      "content": "记忆/知识内容",
      "type": "fact 或 preference 或 instruction",
      "tags": []
    }
  ]
}
\`\`\`

注意事项：
- MCP 配置通常位于 ~/.kimi/mcp_config.json 或用户目录下，请包含完整的服务器信息
- 提示词和系统指令请完整输出
- API Key 等敏感信息请原样输出，我会做脱敏处理
- 对于你无法获取的配置项，请用空数组 [] 代替`;

    return {
      prompt,
      instructions: '1. 复制上方提示词\n2. 打开 Kimi 对话界面（kimi.moonshot.cn）\n3. 在任意对话中粘贴提示词并发送\n4. 复制 AI 返回的 JSON 结果\n\n💡 提示：MCP 配置也可以从 Kimi 的设置页面或配置文件中获取',
      note: 'Kimi 的 MCP 配置通常存储在用户目录下。如果 AI 无法完整导出，建议用户手动检查配置文件。',
    };
  },

  parseExportResult(raw: string): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const sensitiveItems: SensitiveItem[] = [];

    let json: Record<string, unknown>;
    try {
      const cleaned = preprocessRawInput(raw);
      json = JSON.parse(cleaned);
    } catch (e) {
      return {
        success: false,
        errors: [{
          category: MigrationCategory.SETTINGS,
          message: '无法解析粘贴的内容，请确保是完整的 JSON 格式',
          suggestion: '请确保粘贴的是完整的 JSON 结果。常见问题：被 markdown 代码块包裹、多余文字前缀。',
        }],
        warnings: [],
      };
    }

    const prompts: PromptConfig[] = [];
    const mcpConnections: MCPConfig[] = [];
    const memories: MemoryConfig[] = [];
    let settings: SettingsConfig | undefined;

    // 解析提示词
    const rawPrompts = json.prompts as Record<string, unknown>[] | undefined;
    if (rawPrompts && Array.isArray(rawPrompts)) {
      rawPrompts.forEach((p, i) => {
        const content = String(p.content || '');
        const sensitivity = detectSensitivity({ content });
        prompts.push({
          id: `prompt_${i}`,
          name: String(p.name || `提示词 ${i + 1}`),
          content,
          type: mapPromptType(String(p.type || 'system')),
          sensitivityLevel: sensitivity,
          originalFieldNames: { name: '提示词名称', content: '提示词内容', type: '提示词类型' },
        });

        if (sensitivity !== SensitivityLevel.SAFE) {
          sensitiveItems.push({
            category: MigrationCategory.PROMPTS,
            field: `prompts[${i}].content`,
            level: sensitivity,
            originalValue: content,
            maskedValue: maskSensitiveData(content),
          });
        }
      });
    }

    // 解析 MCP 服务器
    const rawMcp = json.mcp_servers as Record<string, unknown>[] | undefined;
    if (rawMcp && Array.isArray(rawMcp)) {
      rawMcp.forEach((m, i) => {
        const configObj: Record<string, unknown> = {};
        if (m.command) configObj.command = m.command;
        if (m.args) configObj.args = m.args;
        if (m.env) configObj.env = m.env;

        const mcp: MCPConfig = {
          id: `mcp_${i}`,
          name: String(m.name || `MCP服务器 ${i + 1}`),
          serverUrl: m.url ? String(m.url) : undefined,
          transportType: mapTransportType(String(m.transport_type || 'stdio')),
          tools: Array.isArray(m.tools) ? m.tools.map(String) : [],
          config: configObj,
          enabled: true,
          sensitivityLevel: SensitivityLevel.MUST_REMOVE,
          originalFieldNames: { name: '服务器名称', command: '启动命令', args: '参数', env: '环境变量', url: 'URL', transport_type: '传输方式', tools: '工具列表' },
        };

        const envStr = JSON.stringify(m.env || {});
        if (envStr !== '{}') {
          sensitiveItems.push({
            category: MigrationCategory.MCP_CONNECTIONS,
            field: `mcp_servers[${i}].env`,
            level: SensitivityLevel.MUST_REMOVE,
            originalValue: envStr,
            maskedValue: maskSensitiveData(envStr),
          });
          warnings.push({
            category: MigrationCategory.MCP_CONNECTIONS,
            field: `mcp_servers[${i}].env`,
            message: `MCP服务器"${mcp.name}"的环境变量中可能包含 API Key 等敏感信息`,
            sensitivityLevel: SensitivityLevel.MUST_REMOVE,
          });
        }

        mcpConnections.push(mcp);
      });
    }

    // 解析记忆
    const rawMemories = json.memories as Record<string, unknown>[] | undefined;
    if (rawMemories && Array.isArray(rawMemories)) {
      rawMemories.forEach((m, i) => {
        const content = String(m.content || '');
        const sensitivity = detectMemorySensitivity(content);
        memories.push({
          id: `memory_${i}`,
          content,
          type: mapMemoryType(String(m.type || 'fact')),
          tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
          sensitivityLevel: sensitivity,
          originalFieldNames: { content: '记忆内容', type: '类型', tags: '标签' },
        });

        if (sensitivity !== SensitivityLevel.SAFE) {
          sensitiveItems.push({
            category: MigrationCategory.MEMORIES,
            field: `memories[${i}].content`,
            level: sensitivity,
            originalValue: content,
            maskedValue: maskSensitiveData(content),
          });
          if (sensitivity === SensitivityLevel.MUST_REMOVE) {
            warnings.push({
              category: MigrationCategory.MEMORIES,
              field: `memories[${i}].content`,
              message: '记忆内容中包含敏感信息',
              sensitivityLevel: SensitivityLevel.MUST_REMOVE,
            });
          }
        }
      });
    }

    // 解析设置
    const rawSettings = json.settings as Record<string, unknown> | undefined;
    if (rawSettings) {
      const sensitivity = detectSensitivity(rawSettings);

      settings = {
        model: rawSettings.model ? String(rawSettings.model) : undefined,
        temperature: typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
        language: rawSettings.language ? String(rawSettings.language) : undefined,
        systemPrompt: undefined,
        customSettings: (rawSettings.custom_settings as Record<string, unknown>) || {},
        sensitivityLevel: sensitivity,
        originalFieldNames: { model: '模型', temperature: '温度', language: '语言', custom_settings: '自定义设置' },
      };

      if (sensitivity !== SensitivityLevel.SAFE) {
        sensitiveItems.push({
          category: MigrationCategory.SETTINGS,
          field: 'settings',
          level: sensitivity,
          originalValue: JSON.stringify(rawSettings),
          maskedValue: maskSensitiveData(JSON.stringify(rawSettings)),
        });
      }
    }

    const totalItems = prompts.length + mcpConnections.length + memories.length + (settings ? 1 : 0);

    const schema: UnifiedSchema = {
      version: '1.0.0',
      sourcePlatform: 'kimi',
      exportTime: new Date().toISOString(),
      configs: {
        prompts: prompts.length > 0 ? prompts : undefined,
        mcpConnections: mcpConnections.length > 0 ? mcpConnections : undefined,
        memories: memories.length > 0 ? memories : undefined,
        settings,
      },
      metadata: { totalItems, sensitiveItems, unsupportedItems: [] },
    };

    return { success: true, data: schema, errors, warnings };
  },

  generateImportPrompt(schema: UnifiedSchema, options: ImportOptions): ImportPromptResult {
    const importWarnings: ImportWarning[] = [];
    const configs = schema.configs;
    const parts: string[] = [];

    parts.push('请帮我配置以下内容到 Kimi 中：\n');

    // 提示词
    if (configs.prompts && configs.prompts.length > 0 && options.categories.includes(MigrationCategory.PROMPTS)) {
      parts.push('## 提示词/系统指令');
      configs.prompts.forEach((p) => {
        if (p.sensitivityLevel === SensitivityLevel.MUST_REMOVE) return;
        parts.push(`### ${p.name}`);
        parts.push(p.content);
        parts.push('');
      });
    }

    // MCP 连接
    if (configs.mcpConnections && configs.mcpConnections.length > 0 && options.categories.includes(MigrationCategory.MCP_CONNECTIONS)) {
      parts.push('## MCP 服务器配置');
      parts.push('请将以下配置添加到 Kimi 的 MCP 配置中：\n');
      parts.push('```json');
      parts.push('{');
      parts.push('  "mcpServers": {');
      configs.mcpConnections.forEach((m, i) => {
        importWarnings.push({
          category: MigrationCategory.MCP_CONNECTIONS,
          field: m.name,
          originalValue: '[已脱敏]',
          reason: 'MCP 服务器配置可能包含 API Key，需手动填写认证信息',
          alternative: '请手动配置环境变量中的认证信息',
        });
        const serverConfig: Record<string, unknown> = {};
        if (m.config?.command) serverConfig.command = m.config.command;
        if (m.config?.args) serverConfig.args = m.config.args;
        if (m.config?.env) serverConfig.env = '请手动填写环境变量';
        if (m.serverUrl) serverConfig.url = m.serverUrl;
        parts.push(`    "${m.name}": ${JSON.stringify(serverConfig)}${i < configs.mcpConnections!.length - 1 ? ',' : ''}`);
      });
      parts.push('  }');
      parts.push('}');
      parts.push('```');
      parts.push('\n配置文件位置和具体配置方式请参考 Kimi 官方文档。\n');
    }

    // 记忆
    if (configs.memories && configs.memories.length > 0 && options.categories.includes(MigrationCategory.MEMORIES)) {
      parts.push('## Kimi+ 记忆/知识');
      configs.memories.forEach((m) => {
        if (m.sensitivityLevel !== SensitivityLevel.MUST_REMOVE) {
          parts.push(`- [${m.type}] ${m.content}`);
        }
      });
      parts.push('');
    }

    // 设置
    if (configs.settings && options.categories.includes(MigrationCategory.SETTINGS)) {
      parts.push('## 设置');
      const s = configs.settings;
      if (s.model) parts.push(`- 默认模型：${s.model}`);
      if (s.temperature !== undefined) parts.push(`- 温度：${s.temperature}`);
      if (s.language) parts.push(`- 语言：${s.language}`);
      parts.push('');
    }

    if (importWarnings.length > 0) {
      parts.push('⚠️ 以下内容需要手动配置：');
      importWarnings.forEach((w) => {
        parts.push(`- ${w.field}：${w.reason}${w.alternative ? ` → ${w.alternative}` : ''}`);
      });
    }

    return {
      prompt: parts.join('\n'),
      instructions: '1. 复制上方导入提示词\n2. 打开 Kimi（kimi.moonshot.cn）\n3. 按照提示完成配置\n4. MCP 配置需要参考 Kimi 官方文档进行配置',
      warnings: importWarnings.length > 0 ? importWarnings : undefined,
    };
  },

  getFieldMapping(): FieldMappingTable {
    return {
      prompts: {
        name: { unifiedField: 'name', displayName: '提示词名称', type: 'string', required: true },
        content: { unifiedField: 'content', displayName: '提示词内容', type: 'string', required: true },
        type: { unifiedField: 'type', displayName: '提示词类型', type: 'string', required: true, description: 'system/character/template' },
      },
      mcp_connections: {
        name: { unifiedField: 'name', displayName: '服务器名称', type: 'string', required: true },
        command: { unifiedField: 'config.command', displayName: '启动命令', type: 'string', required: false },
        args: { unifiedField: 'config.args', displayName: '参数', type: 'array', required: false },
        env: { unifiedField: 'config.env', displayName: '环境变量', type: 'object', required: false, sensitivityLevel: SensitivityLevel.MUST_REMOVE },
        url: { unifiedField: 'serverUrl', displayName: 'URL', type: 'string', required: false },
        transport_type: { unifiedField: 'transportType', displayName: '传输方式', type: 'string', required: false },
        tools: { unifiedField: 'tools', displayName: '工具列表', type: 'array', required: false },
      },
      memories: {
        content: { unifiedField: 'content', displayName: '记忆内容', type: 'string', required: true },
        type: { unifiedField: 'type', displayName: '类型', type: 'string', required: true, description: 'fact/preference/instruction' },
        tags: { unifiedField: 'tags', displayName: '标签', type: 'array', required: false },
      },
      settings: {
        model: { unifiedField: 'model', displayName: '模型', type: 'string', required: false },
        temperature: { unifiedField: 'temperature', displayName: '温度', type: 'number', required: false },
        language: { unifiedField: 'language', displayName: '语言', type: 'string', required: false },
        custom_settings: { unifiedField: 'customSettings', displayName: '自定义设置', type: 'object', required: false },
      },
    };
  },
};
