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

// ===== 自然语言解析辅助函数 =====
function extractListItems(text: string, keyword: string): string[] {
  const regex = new RegExp(
    `${keyword}[：:：]?\\s*([\\s\\S]*?)(?=\\n\\n|\\n(?:插件|工具|工作流|定时|MCP|外部|知识库|模型|记忆|设置|项目|功能)|$)`,
    'i'
  );
  const match = text.match(regex);
  if (!match) return [];

  const section = match[1];
  return section
    .split(/\n/)
    .map((line) =>
      line
        .replace(/^[\d]+[.、）)]?\s*|^[-•·*]\s*/gm, '')
        .trim()
    )
    .filter((line) => line.length > 1 && line.length < 500);
}

function parseNaturalLanguage(raw: string, sourcePlatform: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const sensitiveItems: SensitiveItem[] = [];

  const prompts: PromptConfig[] = [];
  const mcpConnections: MCPConfig[] = [];
  const memories: MemoryConfig[] = [];
  let settings: SettingsConfig | undefined;

  const text = raw.trim();

  // 提取名称
  const nameMatch = text.match(
    /(?:我叫|我的名字是|我是|我叫做)\s*[：:]?\s*([^\s，。,.!?！？\n]{2,20})/
  );
  const botName = nameMatch ? nameMatch[1].trim() : '未命名项目';

  // 提取功能描述
  const firstPara = text.split(/\n\n/)[0] || text.slice(0, 200);
  const botDescription = firstPara.slice(0, 200);

  // 提取项目设定
  const personaMatch = text.match(
    /(?:项目设定|项目描述|角色|说话风格|性格)[：:：]?\s*([\s\S]*?)(?=\n\n|\n(?:插件|工具|工作流|定时|MCP|外部|知识库|模型|记忆|设置|工具|功能)|$)/i
  );
  if (personaMatch) {
    prompts.push({
      id: 'prompt_0',
      name: '项目设定',
      content: personaMatch[1].trim().slice(0, 2000),
      type: 'character',
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { content: '项目设定' },
    });
  }

  // 提取工具/功能
  const skillItems = extractListItems(text, '工具|功能|插件');
  skillItems.forEach((item, i) => {
    const parts = item.split(/[：:—–-]\s*/);
    prompts.push({
      id: `prompt_skill_${i}`,
      name: parts[0].trim().slice(0, 50) || `功能 ${i + 1}`,
      content: parts.slice(1).join('：').trim() || item,
      type: 'character',
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { name: '功能名称', content: '功能描述' },
    });
  });

  // 提取 MCP / 外部服务
  const mcpItems = extractListItems(text, '外部服务|MCP|连接.*服务');
  mcpItems.forEach((item, i) => {
    const parts = item.split(/[：:—–-]\s*/);
    mcpConnections.push({
      id: `mcp_${i}`,
      name: parts[0].trim().slice(0, 50) || `外部服务 ${i + 1}`,
      transportType: undefined,
      tools: [],
      config: {},
      enabled: true,
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { name: '服务名称', description: '描述' },
    });
  });

  // 提取记忆
  const memoryItems = extractListItems(text, '记忆|偏好|用户信息');
  memoryItems.forEach((item, i) => {
    memories.push({
      id: `memory_${i}`,
      content: item,
      type: 'fact',
      tags: [],
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { content: '记忆内容' },
    });
  });

  // 提取设置
  const modelMatch = text.match(/模型[：:：]?\s*([^\s，。,.！？\n]+)/i);
  const tempMatch = text.match(/温度[：:：]?\s*([\d.]+)/i);
  const effortMatch = text.match(/(?:思考深度|effort)[：:：]?\s*([^\s，。,.！？\n]+)/i);

  settings = {
    model: modelMatch ? modelMatch[1].trim() : undefined,
    temperature: tempMatch ? parseFloat(tempMatch[1]) : undefined,
    customSettings: effortMatch ? { effortLevel: effortMatch[1].trim() } : {},
    sensitivityLevel: SensitivityLevel.SAFE,
    originalFieldNames: { model: '模型', temperature: '温度', effort_level: '思考深度' },
  };

  // 如果什么都没提取到
  const totalItems = prompts.length + mcpConnections.length + memories.length + (settings ? 1 : 0);

  if (totalItems === 0) {
    return {
      success: false,
      errors: [
        {
          category: MigrationCategory.SETTINGS,
          message: '未能从对话内容中识别出有效配置信息',
          suggestion:
            '请确保粘贴了AI的完整回复。如果AI回复内容较少，可以尝试追问更多细节后再粘贴。',
        },
      ],
      warnings: [],
    };
  }

  warnings.push({
    category: MigrationCategory.SETTINGS,
    field: 'all',
    message: '本次解析基于自然语言对话内容，信息可能不完整，建议在迁移预览页面逐项核对',
    sensitivityLevel: SensitivityLevel.SAFE,
  });

  const schema: UnifiedSchema = {
    version: '1.0.0',
    sourcePlatform,
    exportTime: new Date().toISOString(),
    configs: {
      prompts: prompts.length > 0 ? prompts : undefined,
      mcpConnections: mcpConnections.length > 0 ? mcpConnections : undefined,
      memories: memories.length > 0 ? memories : undefined,
      settings,
    },
    metadata: { totalItems, sensitiveItems, unsupportedItems: [] },
  };

  return {
    success: true,
    data: schema,
    errors: [],
    warnings,
  };
}

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
    MigrationCategory.SKILLS, // 其他平台的技能 → Claude Projects
    MigrationCategory.AUTOMATIONS, // 其他平台的自动化 → Claude 自定义指令
  ],

  generateExportPrompt(options: ExportOptions): ExportPromptResult {
    const categories = options.categories;

    // 主提示词 — 对话式开头
    const prompt = '你好！我想了解一下你的情况，方便我做个记录。能先简单介绍一下自己吗？';

    // 根据选的类别生成追问
    const followUpQuestions: string[] = [];

    if (categories.includes(MigrationCategory.PROMPTS)) {
      followUpQuestions.push('你有什么项目设定或角色描述吗？');
    }

    if (categories.includes(MigrationCategory.SKILLS)) {
      followUpQuestions.push('你目前开启了哪些工具或功能？');
    }

    if (categories.includes(MigrationCategory.AUTOMATIONS)) {
      followUpQuestions.push('你有什么项目或自动化设定吗？');
    }

    if (categories.includes(MigrationCategory.MCP_CONNECTIONS)) {
      followUpQuestions.push('你有连接什么外部服务吗？');
    }

    if (categories.includes(MigrationCategory.MEMORIES)) {
      followUpQuestions.push('你记得关于用户的什么信息或偏好吗？');
    }

    if (categories.includes(MigrationCategory.SETTINGS)) {
      followUpQuestions.push('你用的什么模型？你的思考深度设置是什么？有没有什么特别的参数设置？');
    }

    return {
      prompt,
      instructions: '1. 复制上方提示词\n2. 打开 Claude 对话界面（claude.ai）\n3. 在任意项目或对话中粘贴提示词并发送\n4. 等 AI 回复后，依次发送下方追问问题\n5. 把所有对话内容复制回来粘贴到解析框',
      note: '每个问题单独发送，等 AI 回复后再发下一个。把所有回复拼在一起粘贴回来即可。',
      followUpQuestions,
    };
  },

  parseExportResult(raw: string): ParseResult {
    // 先尝试 JSON 解析（兼容旧版或万一 AI 输出了 JSON）
    try {
      const cleaned = preprocessRawInput(raw);
      const json = JSON.parse(cleaned);
      return this.parseExportResultJson(json);
    } catch {
      // JSON 解析失败，走自然语言解析
      return parseNaturalLanguage(raw, 'claude');
    }
  },

  parseExportResultJson(json: Record<string, unknown>): ParseResult {
    const warnings: ParseWarning[] = [];
    const sensitiveItems: SensitiveItem[] = [];

    const prompts: PromptConfig[] = [];
    const mcpConnections: MCPConfig[] = [];
    const memories: MemoryConfig[] = [];
    let settings: SettingsConfig | undefined;

    // 解析 Projects（提示词）
    const rawProjects = json.projects as Record<string, unknown>[] | undefined;
    if (rawProjects && Array.isArray(rawProjects)) {
      rawProjects.forEach((p, i) => {
        if (p.system_prompt) {
          const content = String(p.system_prompt);
          const sensitivity = detectSensitivity({ content });
          prompts.push({
            id: `prompt_${i}`,
            name: String(p.name || `项目 ${i + 1} - 系统指令`),
            content,
            type: 'system',
            sensitivityLevel: sensitivity,
            originalFieldNames: {
              name: '项目名称',
              system_prompt: '系统指令',
              custom_instructions: '自定义指令',
            },
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
          originalFieldNames: {
            name: '服务器名称',
            command: '启动命令',
            args: '参数',
            env: '环境变量',
            url: 'URL',
            transport_type: '传输方式',
            tools: '工具列表',
          },
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
      const customSettings = {
        effortLevel: rawSettings.effort_level ? String(rawSettings.effort_level) : undefined,
        ...(rawSettings.custom_settings as Record<string, unknown> || {}),
      };
      const sensitivity = detectSensitivity(customSettings);

      settings = {
        model: rawSettings.model ? String(rawSettings.model) : undefined,
        temperature:
          typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
        language: rawSettings.language ? String(rawSettings.language) : undefined,
        systemPrompt: undefined,
        customSettings,
        sensitivityLevel: sensitivity,
        originalFieldNames: {
          model: '模型',
          temperature: '温度',
          language: '语言',
          effort_level: '思考量',
          custom_settings: '自定义设置',
        },
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

    parts.push('我整理了一份智能体配置信息，请帮我按照以下内容设置：\n');

    // 处理其他平台导入的技能 → 转为 Claude Projects
    if (
      configs.skills &&
      configs.skills.length > 0 &&
      options.categories.includes(MigrationCategory.SKILLS)
    ) {
      parts.push('## Projects（来自其他平台的技能）');
      parts.push('请在 Claude 中创建对应的 Project，将以下技能配置为项目指令：\n');
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

    if (
      configs.prompts &&
      configs.prompts.length > 0 &&
      options.categories.includes(MigrationCategory.PROMPTS)
    ) {
      parts.push('## Projects / 提示词');
      parts.push('请在 Claude 中创建对应的 Project，并设置以下内容：\n');
      configs.prompts.forEach((p) => {
        if (p.sensitivityLevel === SensitivityLevel.MUST_REMOVE) return;
        parts.push(`### ${p.name}`);
        parts.push(p.content);
        parts.push('');
      });
    }

    if (
      configs.mcpConnections &&
      configs.mcpConnections.length > 0 &&
      options.categories.includes(MigrationCategory.MCP_CONNECTIONS)
    ) {
      parts.push('## MCP 服务器配置');
      parts.push('请将以下配置添加到 claude_desktop_config.json 中：\n');
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
        parts.push(
          `    "${m.name}": ${JSON.stringify(serverConfig)}${i < configs.mcpConnections!.length - 1 ? ',' : ''}`
        );
      });
      parts.push('  }');
      parts.push('}');
      parts.push('```');
      parts.push('\n配置文件位置：');
      parts.push('- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
      parts.push('- Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n');
    }

    if (
      configs.memories &&
      configs.memories.length > 0 &&
      options.categories.includes(MigrationCategory.MEMORIES)
    ) {
      parts.push('## 记忆/偏好');
      parts.push('请在 Claude 设置中添加以下记忆：\n');
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
      if (s.customSettings.effortLevel) parts.push(`- 思考量：${s.customSettings.effortLevel}`);
      parts.push('这些设置可在 ~/.claude/settings.json 中配置\n');
    }

    if (importWarnings.length > 0) {
      parts.push('\n⚠️ 以下内容需要手动配置：');
      importWarnings.forEach((w) => {
        parts.push(`- ${w.field}：${w.reason}${w.alternative ? ` → ${w.alternative}` : ''}`);
      });
    }

    return {
      prompt: parts.join('\n'),
      instructions:
        '1. 复制上方导入提示词\n2. 打开 Claude（claude.ai）\n3. 按照提示创建 Projects、配置 MCP 服务器和设置\n4. MCP 配置需要手动编辑 claude_desktop_config.json 文件',
      warnings: importWarnings.length > 0 ? importWarnings : undefined,
    };
  },

  getFieldMapping(): FieldMappingTable {
    return {
      prompts: {
        name: { unifiedField: 'name', displayName: '项目名称', type: 'string', required: true },
        system_prompt: {
          unifiedField: 'content',
          displayName: '系统指令',
          type: 'string',
          required: true,
        },
        custom_instructions: {
          unifiedField: 'content',
          displayName: '自定义指令',
          type: 'string',
          required: false,
        },
      },
      mcp_connections: {
        name: { unifiedField: 'name', displayName: '服务器名称', type: 'string', required: true },
        command: { unifiedField: 'config.command', displayName: '启动命令', type: 'string', required: false },
        args: { unifiedField: 'config.args', displayName: '参数', type: 'array', required: false },
        env: {
          unifiedField: 'config.env',
          displayName: '环境变量',
          type: 'object',
          required: false,
          sensitivityLevel: SensitivityLevel.MUST_REMOVE,
        },
        url: { unifiedField: 'serverUrl', displayName: 'URL', type: 'string', required: false },
        transport_type: {
          unifiedField: 'transportType',
          displayName: '传输方式',
          type: 'string',
          required: false,
        },
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
        effort_level: {
          unifiedField: 'customSettings.effortLevel',
          displayName: '思考量',
          type: 'string',
          required: false,
        },
        custom_settings: {
          unifiedField: 'customSettings',
          displayName: '自定义设置',
          type: 'object',
          required: false,
        },
      },
    };
  },
};
