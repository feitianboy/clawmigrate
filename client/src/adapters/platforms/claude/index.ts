import {
  PlatformAdapter,
  MigrationCategory,
  SensitivityLevel,
  ExportOptions,
  ExportPromptResult,
  ParseResult,
  ParseWarning,
  UnifiedSchema,
  MCPConfig,
  MemoryConfig,
  SettingsConfig,
  PromptConfig,
  SensitiveItem,
  ImportOptions,
  ImportPromptResult,
  ImportWarning,
  FieldMappingTable,
} from '@/adapters/core/types';

import {
  preprocessRawInput,
  containsSensitiveData,
  maskSensitiveData,
  detectSensitivity,
  detectMemorySensitivity,
  mapTransportType,
  mapMemoryType,
} from '@/adapters/core/utils';

export const claudeAdapter: PlatformAdapter = {
  id: 'claude',
  name: 'Claude',
  version: '1.0.0',
  icon: '🟣',
  description: 'Anthropic 出品的 AI 助手，支持 MCP、Projects、Artifacts',
  website: 'https://claude.ai',

  supportedExportCategories: [
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
  ],

  // 注意：SKILLS 和 AUTOMATIONS 在 supportedImportCategories 中是因为 Claude 可以接受其他平台的技能和自动化配置，
  // 但 Claude 自身不直接支持"技能"和"自动化"的原生概念，所以 supportedExportCategories 不包含这两项。
  // 这是设计意图而非遗漏——其他平台导出的技能/自动化可以转为 Claude 的 Projects + 自定义指令。
  supportedImportCategories: [
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
    MigrationCategory.SKILLS,      // 其他平台的技能 → Claude Projects
    MigrationCategory.AUTOMATIONS, // 其他平台的自动化 → Claude 自定义指令
  ],

  generateExportPrompt(options: ExportOptions): ExportPromptResult {
    const categories = options.categories.map((c) => {
      const labels: Record<string, string> = {
        skills: '自定义工具/插件',
        automations: '自动化任务',
        mcp_connections: 'MCP 服务器配置',
        memories: '项目记忆和对话历史摘要',
        settings: 'Claude 设置（模型偏好、语言等）',
        prompts: 'Projects 中的提示词和系统指令',
        knowledge_bases: '知识库和上传的文件',
      };
      return labels[c] || c;
    });

    const prompt = `你好！我正在整理我的智能体配置清单，方便迁移到其他平台。能帮我梳理一下你当前的能力和配置吗？

请按以下 JSON 格式整理（不需要包含任何密钥、密码等敏感信息，只整理能力清单）：

\`\`\`json
{
  "projects": [
    {
      "name": "项目名称",
      "description": "项目描述",
      "persona_description": "你的人设/角色描述（用你自己的话概括，不是系统提示词原文）",
      "custom_instructions": "自定义指令"
    }
  ],
  "mcp_servers": [
    {
      "name": "MCP服务器名称",
      "transport_type": "stdio 或 sse 或 streamable-http",
      "tools": ["可用工具列表"]
    }
  ],
  "settings": {
    "model": "默认模型名称",
    "temperature": 0.7,
    "language": "语言偏好",
    "effort_level": "思考量 low/normal/high/max",
    "persona_description": "你的人设/角色描述（用你自己的话概括）"
  },
  "memories": [
    {
      "content": "记忆/偏好内容",
      "type": "fact 或 preference 或 instruction",
      "tags": []
    }
  ]
}
\`\`\`

说明：
- 敏感信息（API Key、密码、认证Token等）不需要输出，迁移时我会单独配置
- MCP 连接只需要名称、传输方式和工具列表，不需要服务器地址和认证信息
- Projects 中的提示词用你的人设描述来概括即可，不需要完整原文`;

    return {
      prompt,
      instructions: '1. 复制上方提示词\\n2. 打开 Claude 对话界面（claude.ai）\\n3. 在任意项目或对话中粘贴提示词并发送\\n4. 复制 AI 返回的 JSON 结果\\n\\n💡 提示：MCP 配置也可以手动从 ~/.claude/settings.json 或 claude_desktop_config.json 中获取',
      note: 'Claude 的 MCP 配置通常存储在本地文件系统中。如果 AI 无法完整导出，建议用户手动检查配置文件。',
    };
  },

  parseExportResult(raw: string): ParseResult {
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

    // 解析 Projects（提示词）
    const rawProjects = json.projects as Record<string, unknown>[] | undefined;
    if (rawProjects && Array.isArray(rawProjects)) {
      rawProjects.forEach((p, i) => {
        if (p.persona_description) {
          prompts.push({
            id: `prompt_${i}`,
            name: String(p.name || `项目 ${i + 1}`),
            content: String(p.persona_description),
            type: 'system',
            sensitivityLevel: SensitivityLevel.SAFE,
            originalFieldNames: { name: '项目名称', persona_description: '人设描述', custom_instructions: '自定义指令' },
          });
        }
        if (p.system_prompt) {
          const content = String(p.system_prompt);
          const sensitivity = detectSensitivity({ content });
          prompts.push({
            id: `prompt_sp_${i}`,
            name: String(p.name || `项目 ${i + 1} - 系统指令`),
            content,
            type: 'system',
            sensitivityLevel: sensitivity,
            originalFieldNames: { name: '项目名称', system_prompt: '系统指令' },
          });
          if (sensitivity !== SensitivityLevel.SAFE) {
            sensitiveItems.push({
              category: MigrationCategory.PROMPTS,
              field: `projects[${i}].system_prompt`,
              level: sensitivity,
              originalValue: content,
              maskedValue: maskSensitiveData(content),
            });
          }
        }
        if (p.custom_instructions) {
          const content = String(p.custom_instructions);
          const sensitivity = detectSensitivity({ content });
          prompts.push({
            id: `prompt_custom_${i}`,
            name: String(p.name || `项目 ${i + 1} - 自定义指令`),
            content,
            type: 'character',
            sensitivityLevel: sensitivity,
            originalFieldNames: { name: '项目名称', custom_instructions: '自定义指令' },
          });
          if (sensitivity !== SensitivityLevel.SAFE) {
            sensitiveItems.push({
              category: MigrationCategory.PROMPTS,
              field: `projects[${i}].custom_instructions`,
              level: sensitivity,
              originalValue: content,
              maskedValue: maskSensitiveData(content),
            });
          }
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

        if (m.env && Object.keys(m.env as object).length > 0) {
          const envStr = JSON.stringify(m.env || {});
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

    // 解析设置 - 兼容新版 persona_description 和旧版 system_prompt
    const rawSettings = json.settings as Record<string, unknown> | undefined;
    if (rawSettings) {
      const customSettings = {
        effortLevel: rawSettings.effort_level ? String(rawSettings.effort_level) : undefined,
        ...(rawSettings.custom_settings as Record<string, unknown> || {}),
      };
      const sensitivity = detectSensitivity(customSettings);

      settings = {
        model: rawSettings.model ? String(rawSettings.model) : undefined,
        temperature: typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
        language: rawSettings.language ? String(rawSettings.language) : undefined,
        systemPrompt: undefined,
        personaDescription: rawSettings.persona_description ? String(rawSettings.persona_description) : undefined,
        customSettings,
        sensitivityLevel: sensitivity,
        originalFieldNames: { model: '模型', temperature: '温度', language: '语言', effort_level: '思考量', persona_description: '人设描述', custom_settings: '自定义设置' },
      };

      if (sensitivity !== SensitivityLevel.SAFE) {
        sensitiveItems.push({
          category: MigrationCategory.SETTINGS,
          field: 'settings.custom_settings',
          level: sensitivity,
          originalValue: JSON.stringify(customSettings),
          maskedValue: maskSensitiveData(JSON.stringify(customSettings)),
        });
      }
    }

    const totalItems = prompts.length + mcpConnections.length + memories.length + (settings ? 1 : 0);

    const schema: UnifiedSchema = {
      version: '1.0.0',
      sourcePlatform: 'claude',
      exportTime: new Date().toISOString(),
      configs: {
        prompts: prompts.length > 0 ? prompts : undefined,
        mcpConnections: mcpConnections.length > 0 ? mcpConnections : undefined,
        memories: memories.length > 0 ? memories : undefined,
        settings,
      },
      metadata: { totalItems, sensitiveItems, unsupportedItems: [] },
    };

    return { success: true, data: schema, errors: [], warnings };
  },

  generateImportPrompt(schema: UnifiedSchema, options: ImportOptions): ImportPromptResult {
    const importWarnings: ImportWarning[] = [];
    const configs = schema.configs;
    const parts: string[] = [];

    parts.push('请帮我配置以下内容到 Claude 中：\\n');

    // 处理其他平台导入的技能 → 转为 Claude Projects
    if (configs.skills && configs.skills.length > 0 && options.categories.includes(MigrationCategory.SKILLS)) {
      parts.push('## Projects（来自其他平台的技能）');
      parts.push('请在 Claude 中创建对应的 Project，将以下技能配置为项目指令：\\n');
      configs.skills.forEach((s) => {
        if (s.sensitivityLevel === SensitivityLevel.MUST_REMOVE) {
          importWarnings.push({
            category: MigrationCategory.SKILLS,
            field: s.name,
            originalValue: '[已脱敏]',
            reason: '该技能包含敏感信息，已自动脱敏',
            alternative: '请手动重新配置认证信息',
          });
          return;
        }
        parts.push(`### ${s.name}`);
        parts.push(`描述：${s.description || '无描述'}`);
        const content = typeof s.config === 'object' && s.config.content ? String(s.config.content) : '';
        if (content) parts.push(`项目指令：${content}`);
        parts.push('');
      });
    }

    if (configs.prompts && configs.prompts.length > 0 && options.categories.includes(MigrationCategory.PROMPTS)) {
      parts.push('## Projects / 提示词');
      parts.push('请在 Claude 中创建对应的 Project，并设置以下内容：\\n');
      configs.prompts.forEach((p) => {
        if (p.sensitivityLevel === SensitivityLevel.MUST_REMOVE) return;
        parts.push(`### ${p.name}`);
        parts.push(p.content);
        parts.push('');
      });
    }

    if (configs.mcpConnections && configs.mcpConnections.length > 0 && options.categories.includes(MigrationCategory.MCP_CONNECTIONS)) {
      parts.push('## MCP 服务器配置');
      parts.push('请将以下配置添加到 claude_desktop_config.json 中：\\n');
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
        if (m.config.command) serverConfig.command = m.config.command;
        if (m.config.args) serverConfig.args = m.config.args;
        if (m.config.env) serverConfig.env = '请手动填写环境变量';
        if (m.serverUrl) serverConfig.url = m.serverUrl;
        parts.push(`    "${m.name}": ${JSON.stringify(serverConfig)}${i < configs.mcpConnections!.length - 1 ? ',' : ''}`);
      });
      parts.push('  }');
      parts.push('}');
      parts.push('```');
      parts.push('⚠️ 注意：需要手动配置认证信息');
      parts.push('\\n配置文件位置：');
      parts.push('- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
      parts.push('- Windows: %APPDATA%\\Claude\\claude_desktop_config.json\\n');
    }

    if (configs.memories && configs.memories.length > 0 && options.categories.includes(MigrationCategory.MEMORIES)) {
      parts.push('## 记忆/偏好');
      parts.push('请在 Claude 设置中添加以下记忆：\\n');
      configs.memories.forEach((m) => {
        if (m.sensitivityLevel !== SensitivityLevel.MUST_REMOVE) {
          parts.push(`- [${m.type}] ${m.content}`);
        }
      });
      parts.push('');
    }

    if (configs.settings && options.categories.includes(MigrationCategory.SETTINGS)) {
      parts.push('## 设置');
      const s = configs.settings;
      if (s.model) parts.push(`- 默认模型：${s.model}`);
      if (s.temperature !== undefined) parts.push(`- 温度：${s.temperature}`);
      if (s.language) parts.push(`- 语言：${s.language}`);
      if (s.personaDescription) {
        parts.push('## 人设/角色设定');
        parts.push('请按照以下人设描述设置你的角色：');
        parts.push(s.personaDescription);
      }
      if (s.customSettings.effortLevel) parts.push(`- 思考量：${s.customSettings.effortLevel}`);
      parts.push('这些设置可在 ~/.claude/settings.json 中配置\\n');
    }

    if (importWarnings.length > 0) {
      parts.push('\\n⚠️ 以下内容需要手动配置：');
      importWarnings.forEach((w) => {
        parts.push(`- ${w.field}：${w.reason}${w.alternative ? ` → ${w.alternative}` : ''}`);
      });
    }

    return {
      prompt: parts.join('\\n'),
      instructions: '1. 复制上方导入提示词\\n2. 打开 Claude（claude.ai）\\n3. 按照提示创建 Projects、配置 MCP 服务器和设置\\n4. MCP 配置需要手动编辑 claude_desktop_config.json 文件',
      warnings: importWarnings.length > 0 ? importWarnings : undefined,
    };
  },

  getFieldMapping(): FieldMappingTable {
    return {
      prompts: {
        name: { unifiedField: 'name', displayName: '项目名称', type: 'string', required: true },
        system_prompt: { unifiedField: 'content', displayName: '系统指令', type: 'string', required: true },
        persona_description: { unifiedField: 'content', displayName: '人设描述', type: 'string', required: false },
        custom_instructions: { unifiedField: 'content', displayName: '自定义指令', type: 'string', required: false },
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
        type: { unifiedField: 'type', displayName: '类型', type: 'string', required: true },
        tags: { unifiedField: 'tags', displayName: '标签', type: 'array', required: false },
      },
      settings: {
        model: { unifiedField: 'model', displayName: '模型', type: 'string', required: false },
        temperature: { unifiedField: 'temperature', displayName: '温度', type: 'number', required: false },
        language: { unifiedField: 'language', displayName: '语言', type: 'string', required: false },
        effort_level: { unifiedField: 'customSettings.effortLevel', displayName: '思考量', type: 'string', required: false },
        persona_description: { unifiedField: 'personaDescription', displayName: '人设描述', type: 'string', required: false },
        custom_settings: { unifiedField: 'customSettings', displayName: '自定义设置', type: 'object', required: false },
      },
    };
  },
};
