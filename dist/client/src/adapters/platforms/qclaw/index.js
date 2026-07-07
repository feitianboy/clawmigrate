"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qclawAdapter = void 0;
const types_1 = require("@/adapters/core/types");
const utils_1 = require("@/adapters/core/utils");
exports.qclawAdapter = {
    id: 'qclaw',
    name: 'QClaw',
    version: '1.0.0',
    icon: '🐧',
    description: '腾讯出品的 AI 智能体，支持微信直联远程操控',
    website: 'https://claw.guanjia.qq.com',
    supportedExportCategories: [
        types_1.MigrationCategory.SKILLS,
        types_1.MigrationCategory.AUTOMATIONS,
        types_1.MigrationCategory.MCP_CONNECTIONS,
        types_1.MigrationCategory.MEMORIES,
        types_1.MigrationCategory.SETTINGS,
        types_1.MigrationCategory.PROMPTS,
        types_1.MigrationCategory.KNOWLEDGE_BASES,
    ],
    supportedImportCategories: [
        types_1.MigrationCategory.SKILLS,
        types_1.MigrationCategory.AUTOMATIONS,
        types_1.MigrationCategory.MCP_CONNECTIONS,
        types_1.MigrationCategory.MEMORIES,
        types_1.MigrationCategory.SETTINGS,
        types_1.MigrationCategory.PROMPTS,
        types_1.MigrationCategory.KNOWLEDGE_BASES,
    ],
    generateExportPrompt(options) {
        const categories = options.categories.map((c) => {
            const labels = {
                skills: '插件/技能',
                automations: '自动化工作流',
                mcp_connections: 'MCP 连接配置',
                memories: '用户记忆/上下文',
                settings: '系统设置（模型、温度等）',
                prompts: '系统提示词/角色设定',
                knowledge_bases: '知识库',
            };
            return labels[c] || c;
        });
        const prompt = `你好！我正在整理我的智能体配置清单，方便迁移到其他平台。能帮我梳理一下你当前的能力和配置吗？

请按以下 JSON 格式整理（不需要包含任何密钥、密码等敏感信息，只整理能力清单）：

\`\`\`json
{
  "agent_name": "助手名称",
  "agent_description": "简短描述你的功能",
  "prompts": [
    {
      "name": "人设/角色名称",
      "content": "你的人设描述和回复规则",
      "type": "system 或 character 或 template"
    }
  ],
  "skills": [
    {
      "name": "技能名称",
      "description": "功能描述",
      "type": "plugin 或 skill 或 tool",
      "enabled": true
    }
  ],
  "automations": [
    {
      "name": "工作流名称",
      "description": "工作流描述",
      "type": "workflow 或 schedule 或 trigger",
      "trigger": "触发条件",
      "actions": ["动作列表"],
      "schedule": "定时规则（如有）",
      "enabled": true
    }
  ],
  "mcp_connections": [
    {
      "name": "MCP服务名称",
      "transport_type": "stdio 或 sse 或 streamable-http",
      "tools": ["可用工具列表"]
    }
  ],
  "memories": [
    {
      "content": "记忆内容",
      "type": "fact 或 preference 或 instruction 或 context",
      "tags": []
    }
  ],
  "settings": {
    "model": "模型名称",
    "temperature": 0.7,
    "max_tokens": 4096,
    "language": "zh",
    "persona_description": "你的人设/角色描述（不是系统提示词原文，用你自己的话概括）"
  },
  "knowledge_bases": [
    {
      "name": "知识库名称",
      "description": "描述",
      "file_count": 0
    }
  ]
}
\`\`\`

说明：
- 敏感信息（API Key、密码、认证Token等）不需要输出，迁移时我会单独配置
- 对于不存在的配置项，用空数组 [] 或空对象 {} 代替
- 工作流请尽量描述清楚触发条件和执行步骤
- MCP 连接只需要名称、传输方式和工具列表，不需要服务器地址和认证信息`;
        return {
            prompt,
            instructions: '1. 复制上方提示词\\n2. 打开 QClaw 平台\\n3. 进入你的 AI 助手对话界面\\n4. 粘贴提示词并发送\\n5. 复制 AI 返回的 JSON 结果',
            note: '如果 AI 没有完整输出，可以分多次对话，每次只问一个类别的配置。',
        };
    },
    parseExportResult(raw) {
        const warnings = [];
        const sensitiveItems = [];
        let json;
        try {
            const cleaned = (0, utils_1.preprocessRawInput)(raw);
            json = JSON.parse(cleaned);
        }
        catch (e) {
            return {
                success: false,
                errors: [{
                        category: types_1.MigrationCategory.SETTINGS,
                        message: '无法解析粘贴的内容，请确保是完整的 JSON 格式',
                        suggestion: '请确保粘贴的是完整的 JSON 结果。常见问题：被 markdown 代码块包裹、多余文字前缀。',
                    }],
                warnings: [],
            };
        }
        const skills = [];
        const automations = [];
        const mcpConnections = [];
        const memories = [];
        const prompts = [];
        const knowledgeBases = [];
        let settings;
        // 解析提示词
        const rawPrompts = json.prompts;
        if (rawPrompts && Array.isArray(rawPrompts)) {
            rawPrompts.forEach((p, i) => {
                prompts.push({
                    id: `prompt_${i}`,
                    name: String(p.name || `未命名提示词 ${i + 1}`),
                    content: String(p.content || ''),
                    type: (0, utils_1.mapPromptType)(String(p.type || 'system')),
                    sensitivityLevel: types_1.SensitivityLevel.SAFE,
                    originalFieldNames: { name: '提示词名称', content: '提示词内容', type: '类型' },
                });
            });
        }
        // 解析技能
        const rawSkills = json.skills;
        if (rawSkills && Array.isArray(rawSkills)) {
            rawSkills.forEach((s, i) => {
                const configStr = JSON.stringify(s.config || {});
                const hasSensitive = (0, utils_1.containsSensitiveData)(configStr);
                skills.push({
                    id: `skill_${i}`,
                    name: String(s.name || `未命名技能 ${i + 1}`),
                    description: s.description ? String(s.description) : undefined,
                    type: (0, utils_1.mapSkillType)(String(s.type || 'plugin')),
                    config: s.config || {},
                    enabled: s.enabled !== false,
                    sensitivityLevel: hasSensitive ? types_1.SensitivityLevel.MUST_REMOVE : types_1.SensitivityLevel.SAFE,
                    originalFieldNames: { name: '技能名称', description: '技能描述', type: '技能类型', config: '配置详情', enabled: '是否启用' },
                });
                if (hasSensitive) {
                    sensitiveItems.push({
                        category: types_1.MigrationCategory.SKILLS,
                        field: `skills[${i}].config`,
                        level: types_1.SensitivityLevel.MUST_REMOVE,
                        originalValue: configStr,
                        maskedValue: (0, utils_1.maskSensitiveData)(configStr),
                    });
                    warnings.push({
                        category: types_1.MigrationCategory.SKILLS,
                        field: `skills[${i}].config`,
                        message: `技能"${s.name}"的配置中包含敏感信息`,
                        sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                    });
                }
            });
        }
        // 解析自动化
        const rawAutomations = json.automations;
        if (rawAutomations && Array.isArray(rawAutomations)) {
            rawAutomations.forEach((a, i) => {
                automations.push({
                    id: `automation_${i}`,
                    name: String(a.name || `未命名自动化 ${i + 1}`),
                    description: a.description ? String(a.description) : undefined,
                    type: (0, utils_1.mapAutomationType)(String(a.type || 'workflow')),
                    trigger: a.trigger ? String(a.trigger) : undefined,
                    actions: Array.isArray(a.actions) ? a.actions.map(String) : [],
                    schedule: a.schedule ? String(a.schedule) : undefined,
                    enabled: a.enabled !== false,
                    sensitivityLevel: types_1.SensitivityLevel.SAFE,
                    originalFieldNames: { name: '工作流名称', description: '描述', type: '类型', trigger: '触发条件', actions: '动作列表', schedule: '定时规则', enabled: '是否启用' },
                });
            });
        }
        // 解析 MCP
        const rawMcp = json.mcp_connections;
        if (rawMcp && Array.isArray(rawMcp)) {
            rawMcp.forEach((m, i) => {
                mcpConnections.push({
                    id: `mcp_${i}`,
                    name: String(m.name || `MCP服务器 ${i + 1}`),
                    serverUrl: m.server_url ? String(m.server_url) : undefined,
                    transportType: (0, utils_1.mapTransportType)(String(m.transport_type || 'stdio')),
                    tools: Array.isArray(m.tools) ? m.tools.map(String) : [],
                    config: m.config || {},
                    enabled: m.enabled !== false,
                    sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                    originalFieldNames: { name: 'MCP名称', server_url: '服务器地址', transport_type: '传输方式', tools: '工具列表', config: '配置', enabled: '是否启用' },
                });
                warnings.push({
                    category: types_1.MigrationCategory.MCP_CONNECTIONS,
                    field: `mcp_connections[${i}]`,
                    message: `MCP连接"${m.name}"包含敏感认证信息，需手动配置`,
                    sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                });
            });
        }
        // 解析记忆
        const rawMemories = json.memories;
        if (rawMemories && Array.isArray(rawMemories)) {
            rawMemories.forEach((m, i) => {
                const contentStr = JSON.stringify(m.content || '');
                const hasMemorySensitive = (0, utils_1.detectMemorySensitivity)(contentStr);
                memories.push({
                    id: `memory_${i}`,
                    content: String(m.content || ''),
                    type: (0, utils_1.mapMemoryType)(String(m.type || 'fact')),
                    tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
                    sensitivityLevel: hasMemorySensitive ? types_1.SensitivityLevel.REVIEW_SUGGESTED : types_1.SensitivityLevel.SAFE,
                    originalFieldNames: { content: '记忆内容', type: '类型', tags: '标签' },
                });
                if (hasMemorySensitive) {
                    warnings.push({
                        category: types_1.MigrationCategory.MEMORIES,
                        field: `memories[${i}].content`,
                        message: `记忆内容可能包含敏感信息，建议人工复核`,
                        sensitivityLevel: types_1.SensitivityLevel.REVIEW_SUGGESTED,
                    });
                }
            });
        }
        // 解析设置 - 兼容新版 persona_description 和旧版 system_prompt
        const rawSettings = json.settings;
        if (rawSettings) {
            settings = {
                model: rawSettings.model ? String(rawSettings.model) : undefined,
                temperature: typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
                maxTokens: typeof rawSettings.max_tokens === 'number' ? rawSettings.max_tokens : undefined,
                language: rawSettings.language ? String(rawSettings.language) : undefined,
                systemPrompt: rawSettings.system_prompt ? String(rawSettings.system_prompt) : undefined,
                personaDescription: rawSettings.persona_description ? String(rawSettings.persona_description) : undefined,
                customSettings: rawSettings.custom_settings || {},
                sensitivityLevel: types_1.SensitivityLevel.SAFE,
                originalFieldNames: { model: '模型', temperature: '温度', max_tokens: '最大Token数', language: '语言', system_prompt: '系统提示词', persona_description: '人设描述', custom_settings: '自定义设置' },
            };
        }
        // 解析知识库
        const rawKBs = json.knowledge_bases;
        if (rawKBs && Array.isArray(rawKBs)) {
            rawKBs.forEach((k, i) => {
                knowledgeBases.push({
                    id: `kb_${i}`,
                    name: String(k.name || `未命名知识库 ${i + 1}`),
                    description: k.description ? String(k.description) : undefined,
                    fileCount: typeof k.file_count === 'number' ? k.file_count : undefined,
                    totalSize: k.total_size ? String(k.total_size) : undefined,
                    sourceType: (0, utils_1.mapSourceType)(String(k.source_type || 'upload')),
                    sensitivityLevel: types_1.SensitivityLevel.REVIEW_SUGGESTED,
                    originalFieldNames: { name: '知识库名称', description: '描述', file_count: '文件数量', total_size: '总大小', source_type: '来源类型' },
                });
            });
        }
        const totalItems = skills.length + automations.length + mcpConnections.length + memories.length + prompts.length + knowledgeBases.length + (settings ? 1 : 0);
        const schema = {
            version: '1.0.0',
            sourcePlatform: 'qclaw',
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
    generateImportPrompt(schema, options) {
        const importWarnings = [];
        const configs = schema.configs;
        const parts = [];
        parts.push('请帮我配置以下内容到 QClaw 中：\\n');
        // 人设描述（来自新版导出）
        if (configs.settings?.personaDescription && options.categories.includes(types_1.MigrationCategory.SETTINGS)) {
            parts.push('## 人设/角色设定');
            parts.push('请按照以下人设描述设置你的角色：');
            parts.push(configs.settings.personaDescription);
            parts.push('');
        }
        if (configs.prompts && configs.prompts.length > 0 && options.categories.includes(types_1.MigrationCategory.PROMPTS)) {
            parts.push('## 提示词/角色设定');
            configs.prompts.forEach((p) => {
                if (p.sensitivityLevel === types_1.SensitivityLevel.MUST_REMOVE)
                    return;
                parts.push(`### ${p.name}（类型：${p.type === 'system' ? '系统提示词' : p.type}）`);
                parts.push(p.content);
                parts.push('');
            });
        }
        if (configs.skills && configs.skills.length > 0 && options.categories.includes(types_1.MigrationCategory.SKILLS)) {
            parts.push('## 技能/插件');
            configs.skills.forEach((s) => {
                if (s.sensitivityLevel === types_1.SensitivityLevel.MUST_REMOVE) {
                    importWarnings.push({
                        category: types_1.MigrationCategory.SKILLS,
                        field: s.name,
                        originalValue: '[已脱敏]',
                        reason: '该技能包含敏感信息，已自动脱敏',
                        alternative: '请手动重新配置认证信息',
                    });
                    return;
                }
                parts.push(`- ${s.name}：${s.description || '无描述'}（类型：${s.type}，${s.enabled ? '启用' : '禁用'}）`);
            });
            parts.push('⚠️ 注意：插件需要重新授权配置');
            parts.push('');
        }
        if (configs.automations && configs.automations.length > 0 && options.categories.includes(types_1.MigrationCategory.AUTOMATIONS)) {
            parts.push('## 自动化工作流');
            configs.automations.forEach((a) => {
                parts.push(`- ${a.name}：${a.description || '无描述'}`);
                if (a.trigger)
                    parts.push(`  触发条件：${a.trigger}`);
                if (a.schedule)
                    parts.push(`  定时规则：${a.schedule}`);
                parts.push(`  执行动作：${a.actions.join(' → ')}`);
            });
            parts.push('');
        }
        if (configs.mcpConnections && configs.mcpConnections.length > 0 && options.categories.includes(types_1.MigrationCategory.MCP_CONNECTIONS)) {
            parts.push('## MCP 连接');
            configs.mcpConnections.forEach((m) => {
                importWarnings.push({
                    category: types_1.MigrationCategory.MCP_CONNECTIONS,
                    field: m.name,
                    originalValue: '[已脱敏]',
                    reason: 'MCP 连接通常包含认证信息，需手动配置',
                    alternative: '请在 MCP 配置页面手动添加',
                });
                parts.push(`- ${m.name}（传输方式：${m.transportType}，需手动配置认证信息）`);
                if (m.tools && m.tools.length > 0)
                    parts.push(`  工具：${m.tools.join(', ')}`);
            });
            parts.push('');
        }
        if (configs.memories && configs.memories.length > 0 && options.categories.includes(types_1.MigrationCategory.MEMORIES)) {
            parts.push('## 记忆');
            configs.memories.forEach((m) => {
                if (m.sensitivityLevel !== types_1.SensitivityLevel.MUST_REMOVE) {
                    parts.push(`- [${m.type}] ${m.content}`);
                }
            });
            parts.push('');
        }
        if (configs.settings && options.categories.includes(types_1.MigrationCategory.SETTINGS)) {
            parts.push('## 系统设置');
            const s = configs.settings;
            if (s.model)
                parts.push(`- 默认模型：${s.model}`);
            if (s.temperature !== undefined)
                parts.push(`- 温度：${s.temperature}`);
            if (s.maxTokens !== undefined)
                parts.push(`- 最大Token数：${s.maxTokens}`);
            if (s.language)
                parts.push(`- 语言：${s.language}`);
            if (s.systemPrompt)
                parts.push(`- 系统提示词：${s.systemPrompt}`);
            parts.push('');
        }
        if (configs.knowledgeBases && configs.knowledgeBases.length > 0 && options.categories.includes(types_1.MigrationCategory.KNOWLEDGE_BASES)) {
            parts.push('## 知识库');
            importWarnings.push({
                category: types_1.MigrationCategory.KNOWLEDGE_BASES,
                field: 'knowledge_bases',
                originalValue: configs.knowledgeBases.map(k => k.name).join(', '),
                reason: '知识库文件无法通过提示词迁移',
                alternative: '请手动创建知识库并上传文件',
            });
            configs.knowledgeBases.forEach((k) => {
                parts.push(`- ${k.name}（${k.fileCount || 0} 个文件，需手动上传）`);
            });
            parts.push('');
        }
        if (importWarnings.length > 0) {
            parts.push('\\n⚠️ 以下内容需要手动配置：');
            importWarnings.forEach((w) => {
                parts.push(`- ${w.field}：${w.reason}${w.alternative ? ` → ${w.alternative}` : ''}`);
            });
        }
        return {
            prompt: parts.join('\\n'),
            instructions: '1. 复制上方导入提示词\\n2. 打开 QClaw 平台\\n3. 进入你的 AI 助手\\n4. 粘贴提示词并发送\\n5. 按照提示逐步完成配置',
            warnings: importWarnings.length > 0 ? importWarnings : undefined,
        };
    },
    getFieldMapping() {
        return {
            skills: {
                name: { unifiedField: 'name', displayName: '技能名称', type: 'string', required: true },
                description: { unifiedField: 'description', displayName: '技能描述', type: 'string', required: false },
                type: { unifiedField: 'type', displayName: '技能类型', type: 'string', required: true },
                config: { unifiedField: 'config', displayName: '配置详情', type: 'object', required: true, sensitivityLevel: types_1.SensitivityLevel.REVIEW_SUGGESTED },
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
                config: { unifiedField: 'config', displayName: '配置', type: 'object', required: true, sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE },
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
                persona_description: { unifiedField: 'personaDescription', displayName: '人设描述', type: 'string', required: false },
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
