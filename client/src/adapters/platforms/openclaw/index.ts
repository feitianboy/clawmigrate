import {
  PlatformAdapter,
  MigrationCategory,
  SensitivityLevel,
  ExportOptions,
  ExportPromptResult,
  ParseResult,
  ParseWarning,
  UnifiedSchema,
  SkillConfig,
  AutomationConfig,
  MCPConfig,
  MemoryConfig,
  SettingsConfig,
  PromptConfig,
  KnowledgeBaseConfig,
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
  mapSkillType,
  mapAutomationType,
  mapTransportType,
  mapMemoryType,
  mapPromptType,
  mapSourceType,
} from '@/adapters/core/utils';

// ===== 自然语言解析辅助函数 =====
function extractListItems(text: string, keyword: string): string[] {
  const regex = new RegExp(
    `${keyword}[：:：]?\\s*([\\s\\S]*?)(?=\\n\\n|\\n(?:插件|技能|工作流|定时|MCP|外部|知识库|模型|记忆|设置|agent)|$)`,
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

  const skills: SkillConfig[] = [];
  const automations: AutomationConfig[] = [];
  const mcpConnections: MCPConfig[] = [];
  const memories: MemoryConfig[] = [];
  const prompts: PromptConfig[] = [];
  const knowledgeBases: KnowledgeBaseConfig[] = [];
  let settings: SettingsConfig | undefined;

  const text = raw.trim();

  // 提取名称
  const nameMatch = text.match(
    /(?:我叫|我的名字是|我是|我叫做)\s*[：:]?\s*([^\s，。,.!?！？\n]{2,20})/
  );
  const botName = nameMatch ? nameMatch[1].trim() : '未命名助手';

  // 提取功能描述
  const firstPara = text.split(/\n\n/)[0] || text.slice(0, 200);
  const botDescription = firstPara.slice(0, 200);

  // 提取 agent 设定
  const personaMatch = text.match(
    /(?:agent设定|设定|角色|说话风格|性格)[：:：]?\s*([\s\S]*?)(?=\n\n|\n(?:插件|技能|工作流|定时|MCP|外部|知识库|模型|记忆|设置)|$)/i
  );
  if (personaMatch) {
    prompts.push({
      id: 'prompt_0',
      name: 'Agent 设定',
      content: personaMatch[1].trim().slice(0, 2000),
      type: 'character',
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { content: 'Agent 设定' },
    });
  }

  // 提取技能模块
  const skillItems = extractListItems(text, '技能模块|技能|插件|功能');
  skillItems.forEach((item, i) => {
    const parts = item.split(/[：:—–-]\s*/);
    const name = parts[0].trim().slice(0, 50);
    const description = parts.slice(1).join('：').trim() || undefined;
    skills.push({
      id: `skill_${i}`,
      name: name || `技能 ${i + 1}`,
      description,
      type: 'plugin',
      config: {},
      enabled: true,
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { name: '技能名称', description: '技能描述' },
    });
  });

  // 提取工作流/自动化
  const automationItems = extractListItems(text, '工作流|自动化|定时任务');
  automationItems.forEach((item, i) => {
    const parts = item.split(/[：:—–-]\s*/);
    automations.push({
      id: `automation_${i}`,
      name: parts[0].trim().slice(0, 50) || `自动化 ${i + 1}`,
      description: parts.slice(1).join('：').trim() || undefined,
      type: 'workflow',
      trigger: undefined,
      actions: [item],
      enabled: true,
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { name: '名称', description: '描述' },
    });
  });

  // 提取 MCP
  const mcpItems = extractListItems(text, 'MCP|外部工具|外部服务');
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
  const memoryItems = extractListItems(text, '记忆|用户信息|偏好');
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
  if (modelMatch || personaMatch) {
    settings = {
      model: modelMatch ? modelMatch[1].trim() : undefined,
      temperature: tempMatch ? parseFloat(tempMatch[1]) : undefined,
      customSettings: {},
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { model: '模型', temperature: '温度' },
    };
  }

  // 提取知识库
  const kbItems = extractListItems(text, '知识库');
  kbItems.forEach((item, i) => {
    const parts = item.split(/[：:—–-]\s*/);
    knowledgeBases.push({
      id: `kb_${i}`,
      name: parts[0].trim().slice(0, 50) || `知识库 ${i + 1}`,
      description: parts.slice(1).join('：').trim() || undefined,
      sensitivityLevel: SensitivityLevel.SAFE,
      originalFieldNames: { name: '名称', description: '描述' },
    });
  });

  // 如果什么都没提取到
  const totalItems =
    skills.length +
    automations.length +
    mcpConnections.length +
    memories.length +
    prompts.length +
    knowledgeBases.length +
    (settings ? 1 : 0);

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
      skills: skills.length > 0 ? skills : undefined,
      automations: automations.length > 0 ? automations : undefined,
      mcpConnections: mcpConnections.length > 0 ? mcpConnections : undefined,
      memories: memories.length > 0 ? memories : undefined,
      settings,
      prompts: prompts.length > 0 ? prompts : undefined,
      knowledgeBases: knowledgeBases.length > 0 ? knowledgeBases : undefined,
    },
    metadata: { totalItems, sensitiveItems, unsupportedItems: [] },
  };

  return { success: true, data: schema, errors: [], warnings };
}

export const openclawAdapter: PlatformAdapter = {
  id: 'openclaw',
  name: 'OpenClaw',
  version: '1.0.0',
  icon: '🐾',
  description: '开源 AI 助手平台，支持插件、工作流、MCP、知识库',
  website: 'https://openclaw.dev',

  supportedExportCategories: [
    MigrationCategory.SKILLS,
    MigrationCategory.AUTOMATIONS,
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
    MigrationCategory.KNOWLEDGE_BASES,
  ],

  supportedImportCategories: [
    MigrationCategory.SKILLS,
    MigrationCategory.AUTOMATIONS,
    MigrationCategory.MCP_CONNECTIONS,
    MigrationCategory.MEMORIES,
    MigrationCategory.SETTINGS,
    MigrationCategory.PROMPTS,
    MigrationCategory.KNOWLEDGE_BASES,
  ],

  generateExportPrompt(options: ExportOptions): ExportPromptResult {
    const categories = options.categories;

    // 主提示词 — 对话式开头
    const prompt = '你好！我想了解一下你的情况，方便我做个记录。能先简单介绍一下自己吗？';

    // 根据选的类别生成追问
    const followUpQuestions: string[] = [];

    if (categories.includes(MigrationCategory.PROMPTS)) {
      followUpQuestions.push('你的 agent 设定是什么样的？');
    }

    if (categories.includes(MigrationCategory.SKILLS)) {
      followUpQuestions.push('你有哪些技能模块？能分别说说每个的功能吗？');
    }

    if (categories.includes(MigrationCategory.AUTOMATIONS)) {
      followUpQuestions.push('你有设置什么自动化工作流吗？大概是什么触发条件、做什么事？');
    }

    if (categories.includes(MigrationCategory.MCP_CONNECTIONS)) {
      followUpQuestions.push('你有连接什么外部工具或服务吗？分别是什么，能做什么？');
    }

    if (categories.includes(MigrationCategory.MEMORIES)) {
      followUpQuestions.push('你记得关于用户的什么信息或偏好吗？');
    }

    if (categories.includes(MigrationCategory.SETTINGS)) {
      followUpQuestions.push('你用的什么模型？有没有什么特别的参数设置？');
    }

    if (categories.includes(MigrationCategory.KNOWLEDGE_BASES)) {
      followUpQuestions.push('你有没有挂载知识库？大概是什么内容的？');
    }

    return {
      prompt,
      instructions: '1. 复制上方提示词\n2. 打开 OpenClaw 平台\n3. 进入你的 AI 助手对话界面\n4. 粘贴提示词并发送\n5. 等 AI 回复后，依次发送下方追问问题\n6. 把所有对话内容复制回来粘贴到解析框',
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
      return parseNaturalLanguage(raw, 'openclaw');
    }
  },

  parseExportResultJson(json: Record<string, unknown>): ParseResult {
    const warnings: ParseWarning[] = [];
    const sensitiveItems: SensitiveItem[] = [];

    const skills: SkillConfig[] = [];
    const automations: AutomationConfig[] = [];
    const mcpConnections: MCPConfig[] = [];
    const memories: MemoryConfig[] = [];
    const prompts: PromptConfig[] = [];
    const knowledgeBases: KnowledgeBaseConfig[] = [];
    let settings: SettingsConfig | undefined;

    // 解析提示词
    const rawPrompts = json.prompts as Record<string, unknown>[] | undefined;
    if (rawPrompts && Array.isArray(rawPrompts)) {
      rawPrompts.forEach((p, i) => {
        prompts.push({
          id: `prompt_${i}`,
          name: String(p.name || `未命名提示词 ${i + 1}`),
          content: String(p.content || ''),
          type: mapPromptType(String(p.type || 'system')),
          sensitivityLevel: SensitivityLevel.SAFE,
          originalFieldNames: { name: '提示词名称', content: '提示词内容', type: '类型' },
        });
      });
    }

    // 解析技能
    const rawSkills = json.skills as Record<string, unknown>[] | undefined;
    if (rawSkills && Array.isArray(rawSkills)) {
      rawSkills.forEach((s, i) => {
        const configStr = JSON.stringify(s.config || {});
        const hasSensitive = containsSensitiveData(configStr);

        skills.push({
          id: `skill_${i}`,
          name: String(s.name || `未命名技能 ${i + 1}`),
          description: s.description ? String(s.description) : undefined,
          type: mapSkillType(String(s.type || 'plugin')),
          config: (s.config as Record<string, unknown>) || {},
          enabled: s.enabled !== false,
          sensitivityLevel: hasSensitive ? SensitivityLevel.MUST_REMOVE : SensitivityLevel.SAFE,
          originalFieldNames: {
            name: '技能名称',
            description: '技能描述',
            type: '技能类型',
            config: '配置详情',
            enabled: '是否启用',
          },
        });

        if (hasSensitive) {
          sensitiveItems.push({
            category: MigrationCategory.SKILLS,
            field: `skills[${i}].config`,
            level: SensitivityLevel.MUST_REMOVE,
            originalValue: configStr,
            maskedValue: maskSensitiveData(configStr),
          });
          warnings.push({
            category: MigrationCategory.SKILLS,
            field: `skills[${i}].config`,
            message: `技能"${s.name}"的配置中包含敏感信息`,
            sensitivityLevel: SensitivityLevel.MUST_REMOVE,
          });
        }
      });
    }

    // 解析自动化
    const rawAutomations = json.automations as Record<string, unknown>[] | undefined;
    if (rawAutomations && Array.isArray(rawAutomations)) {
      rawAutomations.forEach((a, i) => {
        automations.push({
          id: `automation_${i}`,
          name: String(a.name || `未命名自动化 ${i + 1}`),
          description: a.description ? String(a.description) : undefined,
          type: mapAutomationType(String(a.type || 'workflow')),
          trigger: a.trigger ? String(a.trigger) : undefined,
          actions: Array.isArray(a.actions) ? a.actions.map(String) : [],
          schedule: a.schedule ? String(a.schedule) : undefined,
          enabled: a.enabled !== false,
          sensitivityLevel: SensitivityLevel.SAFE,
          originalFieldNames: {
            name: '工作流名称',
            description: '描述',
            type: '类型',
            trigger: '触发条件',
            actions: '动作列表',
            schedule: '定时规则',
            enabled: '是否启用',
          },
        });
      });
    }

    // 解析 MCP
    const rawMcp = json.mcp_connections as Record<string, unknown>[] | undefined;
    if (rawMcp && Array.isArray(rawMcp)) {
      rawMcp.forEach((m, i) => {
        mcpConnections.push({
          id: `mcp_${i}`,
          name: String(m.name || `MCP服务器 ${i + 1}`),
          serverUrl: m.server_url ? String(m.server_url) : undefined,
          transportType: mapTransportType(String(m.transport_type || 'stdio')),
          tools: Array.isArray(m.tools) ? m.tools.map(String) : [],
          config: (m.config as Record<string, unknown>) || {},
          enabled: m.enabled !== false,
          sensitivityLevel: SensitivityLevel.MUST_REMOVE,
          originalFieldNames: {
            name: 'MCP名称',
            server_url: '服务器地址',
            transport_type: '传输方式',
            tools: '工具列表',
            config: '配置',
            enabled: '是否启用',
          },
        });

        sensitiveItems.push({
          category: MigrationCategory.MCP_CONNECTIONS,
          field: `mcp_connections[${i}].config`,
          level: SensitivityLevel.MUST_REMOVE,
          originalValue: JSON.stringify(m.config || {}),
          maskedValue: maskSensitiveData(JSON.stringify(m.config || {})),
        });
        warnings.push({
          category: MigrationCategory.MCP_CONNECTIONS,
          field: `mcp_connections[${i}].config`,
          message: `MCP连接"${m.name}"可能包含认证信息`,
          sensitivityLevel: SensitivityLevel.MUST_REMOVE,
        });
      });
    }

    // 解析记忆
    const rawMemories = json.memories as Record<string, unknown>[] | undefined;
    if (rawMemories && Array.isArray(rawMemories)) {
      rawMemories.forEach((m, i) => {
        memories.push({
          id: `memory_${i}`,
          content: String(m.content || ''),
          type: mapMemoryType(String(m.type || 'fact')),
          tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
          sensitivityLevel: SensitivityLevel.SAFE,
          originalFieldNames: { content: '记忆内容', type: '类型', tags: '标签' },
        });
      });
    }

    // 解析设置
    const rawSettings = json.settings as Record<string, unknown> | undefined;
    if (rawSettings) {
      settings = {
        model: rawSettings.model ? String(rawSettings.model) : undefined,
        temperature:
          typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
        maxTokens: typeof rawSettings.max_tokens === 'number' ? rawSettings.max_tokens : undefined,
        language: rawSettings.language ? String(rawSettings.language) : undefined,
        systemPrompt: rawSettings.system_prompt ? String(rawSettings.system_prompt) : undefined,
        customSettings: (rawSettings.custom_settings as Record<string, unknown>) || {},
        sensitivityLevel: SensitivityLevel.SAFE,
        originalFieldNames: {
          model: '模型',
          temperature: '温度',
          max_tokens: '最大Token数',
          language: '语言',
          system_prompt: '系统提示词',
          custom_settings: '自定义设置',
        },
      };
    }

    // 解析知识库
    const rawKBs = json.knowledge_bases as Record<string, unknown>[] | undefined;
    if (rawKBs && Array.isArray(rawKBs)) {
      rawKBs.forEach((k, i) => {
        knowledgeBases.push({
          id: `kb_${i}`,
          name: String(k.name || `未命名知识库 ${i + 1}`),
          description: k.description ? String(k.description) : undefined,
          fileCount: typeof k.file_count === 'number' ? k.file_count : undefined,
          totalSize: k.total_size ? String(k.total_size) : undefined,
          sourceType: mapSourceType(String(k.source_type || 'upload')),
          sensitivityLevel: SensitivityLevel.REVIEW_SUGGESTED,
          originalFieldNames: {
            name: '知识库名称',
            description: '描述',
            file_count: '文件数量',
            total_size: '总大小',
            source_type: '来源类型',
          },
        });
      });
    }

    const totalItems =
      skills.length +
      automations.length +
      mcpConnections.length +
      memories.length +
      prompts.length +
      knowledgeBases.length +
      (settings ? 1 : 0);

    const schema: UnifiedSchema = {
      version: '1.0.0',
      sourcePlatform: 'openclaw',
      exportTime: new Date().toISOString(),
      configs: {
        skills: skills.length > 0 ? skills : undefined,
        automations: automations.length > 0 ? automations : undefined,
        mcpConnections: mcpConnections.length > 0 ? mcpConnections : undefined,
        memories: memories.length > 0 ? memories : undefined,
        settings,
        prompts: prompts.length > 0 ? prompts : undefined,
        knowledgeBases: knowledgeBases.length > 0 ? knowledgeBases : undefined,
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

    if (
      configs.prompts &&
      configs.prompts.length > 0 &&
      options.categories.includes(MigrationCategory.PROMPTS)
    ) {
      parts.push('## 提示词/角色设定');
      configs.prompts.forEach((p) => {
        if (p.sensitivityLevel === SensitivityLevel.MUST_REMOVE) return;
        parts.push(`### ${p.name}（类型：${p.type === 'system' ? '系统提示词' : p.type}）`);
        parts.push(p.content);
        parts.push('');
      });
    }

    if (
      configs.skills &&
      configs.skills.length > 0 &&
      options.categories.includes(MigrationCategory.SKILLS)
    ) {
      parts.push('## 技能/插件');
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
        parts.push(
          `- ${s.name}：${s.description || '无描述'}（类型：${s.type}，${s.enabled ? '启用' : '禁用'}）`
        );
      });
      parts.push('');
    }

    if (
      configs.automations &&
      configs.automations.length > 0 &&
      options.categories.includes(MigrationCategory.AUTOMATIONS)
    ) {
      parts.push('## 自动化工作流');
      configs.automations.forEach((a) => {
        parts.push(`- ${a.name}：${a.description || '无描述'}`);
        if (a.trigger) parts.push(`  触发条件：${a.trigger}`);
        if (a.schedule) parts.push(`  定时规则：${a.schedule}`);
        parts.push(`  执行动作：${a.actions.join(' → ')}`);
      });
      parts.push('');
    }

    if (
      configs.mcpConnections &&
      configs.mcpConnections.length > 0 &&
      options.categories.includes(MigrationCategory.MCP_CONNECTIONS)
    ) {
      parts.push('## MCP 连接');
      configs.mcpConnections.forEach((m) => {
        importWarnings.push({
          category: MigrationCategory.MCP_CONNECTIONS,
          field: m.name,
          originalValue: '[已脱敏]',
          reason: 'MCP 连接通常包含认证信息，需手动配置',
          alternative: '请在 MCP 配置页面手动添加',
        });
        parts.push(`- ${m.name}（传输方式：${m.transportType}，需手动配置认证信息）`);
        if (m.tools && m.tools.length > 0) parts.push(`  工具：${m.tools.join(', ')}`);
      });
      parts.push('');
    }

    if (
      configs.memories &&
      configs.memories.length > 0 &&
      options.categories.includes(MigrationCategory.MEMORIES)
    ) {
      parts.push('## 记忆');
      configs.memories.forEach((m) => {
        if (m.sensitivityLevel !== SensitivityLevel.MUST_REMOVE) {
          parts.push(`- [${m.type}] ${m.content}`);
        }
      });
      parts.push('');
    }

    if (configs.settings && options.categories.includes(MigrationCategory.SETTINGS)) {
      parts.push('## 系统设置');
      const s = configs.settings;
      if (s.model) parts.push(`- 默认模型：${s.model}`);
      if (s.temperature !== undefined) parts.push(`- 温度：${s.temperature}`);
      if (s.maxTokens !== undefined) parts.push(`- 最大Token数：${s.maxTokens}`);
      if (s.language) parts.push(`- 语言：${s.language}`);
      if (s.systemPrompt) parts.push(`- 系统提示词：${s.systemPrompt}`);
      parts.push('');
    }

    if (
      configs.knowledgeBases &&
      configs.knowledgeBases.length > 0 &&
      options.categories.includes(MigrationCategory.KNOWLEDGE_BASES)
    ) {
      parts.push('## 知识库');
      importWarnings.push({
        category: MigrationCategory.KNOWLEDGE_BASES,
        field: 'knowledge_bases',
        originalValue: configs.knowledgeBases.map((k) => k.name).join(', '),
        reason: '知识库文件无法通过提示词迁移',
        alternative: '请手动创建知识库并上传文件',
      });
      configs.knowledgeBases.forEach((k) => {
        parts.push(`- ${k.name}（${k.fileCount || 0} 个文件，需手动上传）`);
      });
      parts.push('');
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
        '1. 复制上方导入提示词\n2. 打开 OpenClaw 平台\n3. 进入你的 AI 助手\n4. 粘贴提示词并发送\n5. 按照提示逐步完成配置',
      warnings: importWarnings.length > 0 ? importWarnings : undefined,
    };
  },

  getFieldMapping(): FieldMappingTable {
    return {
      skills: {
        name: { unifiedField: 'name', displayName: '技能名称', type: 'string', required: true },
        description: { unifiedField: 'description', displayName: '技能描述', type: 'string', required: false },
        type: { unifiedField: 'type', displayName: '技能类型', type: 'string', required: true },
        config: {
          unifiedField: 'config',
          displayName: '配置详情',
          type: 'object',
          required: true,
          sensitivityLevel: SensitivityLevel.REVIEW_SUGGESTED,
        },
        enabled: { unifiedField: 'enabled', displayName: '是否启用', type: 'boolean', required: false },
      },
      automations: {
        name: { unifiedField: 'name', displayName: '工作流名称', type: 'string', required: true },
        description: { unifiedField: 'description', displayName: '描述', type: 'string', required: false },
        type: { unifiedField: 'type', displayName: '类型', type: 'string', required: true },
        trigger: { unifiedField: 'trigger', displayName: '触发条件', type: 'string', required: false },
        actions: { unifiedField: 'actions', displayName: '动作列表', type: 'array', required: true },
        schedule: { unifiedField: 'schedule', displayName: '定时规则', type: 'string', required: false },
        enabled: { unifiedField: 'enabled', displayName: '是否启用', type: 'boolean', required: false },
      },
      mcp_connections: {
        name: { unifiedField: 'name', displayName: 'MCP名称', type: 'string', required: true },
        server_url: { unifiedField: 'serverUrl', displayName: '服务器地址', type: 'string', required: false },
        transport_type: { unifiedField: 'transportType', displayName: '传输方式', type: 'string', required: false },
        tools: { unifiedField: 'tools', displayName: '工具列表', type: 'array', required: false },
        config: {
          unifiedField: 'config',
          displayName: '配置',
          type: 'object',
          required: true,
          sensitivityLevel: SensitivityLevel.MUST_REMOVE,
        },
        enabled: { unifiedField: 'enabled', displayName: '是否启用', type: 'boolean', required: false },
      },
      memories: {
        content: { unifiedField: 'content', displayName: '记忆内容', type: 'string', required: true },
        type: { unifiedField: 'type', displayName: '类型', type: 'string', required: true },
        tags: { unifiedField: 'tags', displayName: '标签', type: 'array', required: false },
      },
      settings: {
        model: { unifiedField: 'model', displayName: '模型', type: 'string', required: false },
        temperature: { unifiedField: 'temperature', displayName: '温度', type: 'number', required: false },
        max_tokens: { unifiedField: 'maxTokens', displayName: '最大Token数', type: 'number', required: false },
        language: { unifiedField: 'language', displayName: '语言', type: 'string', required: false },
        system_prompt: { unifiedField: 'systemPrompt', displayName: '系统提示词', type: 'string', required: false },
        custom_settings: { unifiedField: 'customSettings', displayName: '自定义设置', type: 'object', required: false },
      },
      prompts: {
        name: { unifiedField: 'name', displayName: '提示词名称', type: 'string', required: true },
        content: { unifiedField: 'content', displayName: '提示词内容', type: 'string', required: true },
        type: { unifiedField: 'type', displayName: '类型', type: 'string', required: true },
      },
      knowledge_bases: {
        name: { unifiedField: 'name', displayName: '知识库名称', type: 'string', required: true },
        description: { unifiedField: 'description', displayName: '描述', type: 'string', required: false },
        file_count: { unifiedField: 'fileCount', displayName: '文件数量', type: 'number', required: false },
        total_size: { unifiedField: 'totalSize', displayName: '总大小', type: 'string', required: false },
        source_type: { unifiedField: 'sourceType', displayName: '来源类型', type: 'string', required: false },
      },
    };
  },
};
