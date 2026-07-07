"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kimiAdapter = void 0;
const types_1 = require("@/adapters/core/types");
const utils_1 = require("@/adapters/core/utils");
exports.kimiAdapter = {
    id: 'kimi',
    name: 'Kimi',
    version: '1.0.0',
    icon: '🟠',
    description: '月之暗面 Moonshot AI 出品的 Kimi 智能助手，支持超长上下文和 MCP',
    website: 'https://kimi.moonshot.cn',
    supportedExportCategories: [
        types_1.MigrationCategory.MCP_CONNECTIONS,
        types_1.MigrationCategory.MEMORIES,
        types_1.MigrationCategory.SETTINGS,
        types_1.MigrationCategory.PROMPTS,
    ],
    supportedImportCategories: [
        types_1.MigrationCategory.MCP_CONNECTIONS,
        types_1.MigrationCategory.MEMORIES,
        types_1.MigrationCategory.SETTINGS,
        types_1.MigrationCategory.PROMPTS,
    ],
    generateExportPrompt(options) {
        const categories = options.categories.map((c) => {
            const labels = {
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
        const prompt = `你好！我是 Kimi 的长期用户，正在整理我的配置以便迁移到其他 AI 平台。

Kimi 的核心特色包括：Kimi+ 记忆系统、自定义技能/插件、自动化工作流和知识库。请帮我完整梳理一下当前的配置：

\`\`\`json
{
  "skills": [
    {
      "name": "技能名称",
      "description": "技能的功能描述",
      "type": "plugin 或 tool",
      "config": {
        "content": "技能的配置内容或提示词",
        "tools": ["该技能使用的工具列表"]
      }
    }
  ],
  "prompts": [
    {
      "name": "提示词/人设名称",
      "content": "你的人设描述和回复规则（用自然语言概括）",
      "type": "system",
      "tags": ["相关标签"]
    }
  ],
  "mcp_servers": [
    {
      "name": "MCP服务器名称",
      "transport_type": "stdio 或 sse 或 streamable-http",
      "tools": ["该 MCP 提供的可用工具列表"],
      "description": "该 MCP 的功能描述"
    }
  ],
  "settings": {
    "model": "当前使用的默认模型（如 moonshot-v1-8k、moonshot-v1-32k 等）",
    "temperature": 0.7,
    "language": "你的语言偏好设置",
    "persona_description": "你的全局人设描述（用自然语言概括）",
    "custom_settings": {}
  },
  "memories": [
    {
      "content": "Kimi+ 记忆内容（关于我的偏好、习惯、重要信息等）",
      "type": "fact 或 preference 或 instruction",
      "tags": ["相关标签"]
    }
  ],
  "automations": [
    {
      "name": "自动化工作流名称",
      "description": "工作流描述",
      "trigger": "触发条件",
      "actions": ["执行的动作列表"]
    }
  ],
  "knowledge_bases": [
    {
      "name": "知识库名称",
      "description": "知识库描述",
      "file_count": 0,
      "topics": ["覆盖的主题"]
    }
  ]
}
\`\`\`

Kimi 特有说明：
- Kimi+ 记忆是你的特色功能，请详细列出所有存储的记忆
- 自定义技能/插件是 Kimi 的核心能力，请列出所有已安装的技能
- 自动化工作流很实用，请列出所有配置的自动化
- 知识库功能支持上传文件，请列出所有知识库
- 敏感信息（API Key、密码、认证Token等）不需要输出`;
        return {
            prompt,
            instructions: '1. 复制上方提示词\\n2. 打开 Kimi 对话界面（kimi.moonshot.cn）\\n3. 在任意对话中粘贴提示词并发送\\n4. 复制 AI 返回的 JSON 结果\\n\\n💡 提示：如果某些信息 AI 无法直接获取，可以手动从 Kimi 的设置页面补充',
            note: 'Kimi 的配置分散在多个位置：技能在技能市场页面，记忆在 Kimi+ 页面，知识库在文件上传页面。建议分别从不同来源获取完整配置。',
        };
    },
    parseExportResult(raw) {
        const errors = [];
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
        const prompts = [];
        const mcpConnections = [];
        const memories = [];
        let settings;
        // 解析提示词
        const rawPrompts = json.prompts;
        if (rawPrompts && Array.isArray(rawPrompts)) {
            rawPrompts.forEach((p, i) => {
                const content = String(p.content || '');
                const sensitivity = (0, utils_1.detectSensitivity)({ content });
                prompts.push({
                    id: `prompt_${i}`,
                    name: String(p.name || `提示词 ${i + 1}`),
                    content,
                    type: (0, utils_1.mapPromptType)(String(p.type || 'system')),
                    sensitivityLevel: sensitivity,
                    originalFieldNames: { name: '提示词名称', content: '提示词内容', type: '提示词类型' },
                });
                if (sensitivity !== types_1.SensitivityLevel.SAFE) {
                    sensitiveItems.push({
                        category: types_1.MigrationCategory.PROMPTS,
                        field: `prompts[${i}].content`,
                        level: sensitivity,
                        originalValue: content,
                        maskedValue: (0, utils_1.maskSensitiveData)(content),
                    });
                }
            });
        }
        // 解析 MCP 服务器
        const rawMcp = json.mcp_servers;
        if (rawMcp && Array.isArray(rawMcp)) {
            rawMcp.forEach((m, i) => {
                const configObj = {};
                if (m.command)
                    configObj.command = m.command;
                if (m.args)
                    configObj.args = m.args;
                if (m.env)
                    configObj.env = m.env;
                const mcp = {
                    id: `mcp_${i}`,
                    name: String(m.name || `MCP服务器 ${i + 1}`),
                    serverUrl: m.url ? String(m.url) : undefined,
                    transportType: (0, utils_1.mapTransportType)(String(m.transport_type || 'stdio')),
                    tools: Array.isArray(m.tools) ? m.tools.map(String) : [],
                    config: configObj,
                    enabled: true,
                    sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                    originalFieldNames: { name: '服务器名称', command: '启动命令', args: '参数', env: '环境变量', url: 'URL', transport_type: '传输方式', tools: '工具列表' },
                };
                if (m.env && Object.keys(m.env).length > 0) {
                    const envStr = JSON.stringify(m.env || {});
                    sensitiveItems.push({
                        category: types_1.MigrationCategory.MCP_CONNECTIONS,
                        field: `mcp_servers[${i}].env`,
                        level: types_1.SensitivityLevel.MUST_REMOVE,
                        originalValue: envStr,
                        maskedValue: (0, utils_1.maskSensitiveData)(envStr),
                    });
                    warnings.push({
                        category: types_1.MigrationCategory.MCP_CONNECTIONS,
                        field: `mcp_servers[${i}].env`,
                        message: `MCP服务器"${mcp.name}"的环境变量中可能包含 API Key 等敏感信息`,
                        sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                    });
                }
                mcpConnections.push(mcp);
            });
        }
        // 解析记忆
        const rawMemories = json.memories;
        if (rawMemories && Array.isArray(rawMemories)) {
            rawMemories.forEach((m, i) => {
                const content = String(m.content || '');
                const sensitivity = (0, utils_1.detectMemorySensitivity)(content);
                memories.push({
                    id: `memory_${i}`,
                    content,
                    type: (0, utils_1.mapMemoryType)(String(m.type || 'fact')),
                    tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
                    sensitivityLevel: sensitivity,
                    originalFieldNames: { content: '记忆内容', type: '类型', tags: '标签' },
                });
                if (sensitivity !== types_1.SensitivityLevel.SAFE) {
                    sensitiveItems.push({
                        category: types_1.MigrationCategory.MEMORIES,
                        field: `memories[${i}].content`,
                        level: sensitivity,
                        originalValue: content,
                        maskedValue: (0, utils_1.maskSensitiveData)(content),
                    });
                    if (sensitivity === types_1.SensitivityLevel.MUST_REMOVE) {
                        warnings.push({
                            category: types_1.MigrationCategory.MEMORIES,
                            field: `memories[${i}].content`,
                            message: '记忆内容中包含敏感信息',
                            sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE,
                        });
                    }
                }
            });
        }
        // 解析设置 - 兼容新版 persona_description 和旧版 system_prompt
        const rawSettings = json.settings;
        if (rawSettings) {
            const sensitivity = (0, utils_1.detectSensitivity)(rawSettings);
            settings = {
                model: rawSettings.model ? String(rawSettings.model) : undefined,
                temperature: typeof rawSettings.temperature === 'number' ? rawSettings.temperature : undefined,
                language: rawSettings.language ? String(rawSettings.language) : undefined,
                systemPrompt: undefined,
                personaDescription: rawSettings.persona_description ? String(rawSettings.persona_description) : undefined,
                customSettings: rawSettings.custom_settings || {},
                sensitivityLevel: sensitivity,
                originalFieldNames: { model: '模型', temperature: '温度', language: '语言', persona_description: '人设描述', custom_settings: '自定义设置' },
            };
            if (sensitivity !== types_1.SensitivityLevel.SAFE) {
                sensitiveItems.push({
                    category: types_1.MigrationCategory.SETTINGS,
                    field: 'settings',
                    level: sensitivity,
                    originalValue: JSON.stringify(rawSettings),
                    maskedValue: (0, utils_1.maskSensitiveData)(JSON.stringify(rawSettings)),
                });
            }
        }
        const totalItems = prompts.length + mcpConnections.length + memories.length + (settings ? 1 : 0);
        const schema = {
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
    generateImportPrompt(schema, options) {
        const importWarnings = [];
        const configs = schema.configs;
        const parts = [];
        const sourcePlatformName = schema.sourcePlatform ? schema.sourcePlatform.toUpperCase() : '源平台';
        parts.push(`你好！我刚刚从 ${sourcePlatformName} 导出了我的智能体配置，现在想迁移到 Kimi 中。`);
        parts.push('Kimi 以技能/插件和 Kimi+ 记忆为核心特色，请按照以下映射规则帮我配置：\\n');
        // 技能（来自其他平台）
        if (configs.skills && configs.skills.length > 0 && options.categories.includes(types_1.MigrationCategory.SKILLS)) {
            parts.push('## 📦 技能/插件（映射转换）');
            parts.push(`${sourcePlatformName} 的"技能/插件"将直接映射到 Kimi 的"自定义技能"。\\n`);
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
                parts.push(`### 🆕 创建技能：${s.name}`);
                parts.push(`**描述**：${s.description || '无描述'}`);
                const content = typeof s.config === 'object' && s.config.content ? String(s.config.content) : '';
                if (content)
                    parts.push(`**技能配置/提示词**：${content}`);
                parts.push('');
            });
        }
        // 人设描述（来自新版导出）
        if (configs.settings?.personaDescription && options.categories.includes(types_1.MigrationCategory.SETTINGS)) {
            parts.push('## 🎭 人设/角色设定');
            parts.push('请按照以下人设描述设置你的角色（对应 Kimi 的角色设定）：');
            parts.push(configs.settings.personaDescription);
            parts.push('');
        }
        // 提示词
        if (configs.prompts && configs.prompts.length > 0 && options.categories.includes(types_1.MigrationCategory.PROMPTS)) {
            parts.push('## 📝 提示词/系统指令（映射转换）');
            parts.push(`${sourcePlatformName} 的"提示词"将转换为 Kimi 的"角色设定"或"自定义指令"。\\n`);
            configs.prompts.forEach((p) => {
                if (p.sensitivityLevel === types_1.SensitivityLevel.MUST_REMOVE)
                    return;
                const typeLabel = p.type === 'system' ? '系统提示词' : (p.type === 'character' ? '人设设定' : '模板');
                parts.push(`### ${typeLabel}：${p.name}`);
                parts.push(p.content);
                parts.push('');
            });
        }
        // MCP 连接
        if (configs.mcpConnections && configs.mcpConnections.length > 0 && options.categories.includes(types_1.MigrationCategory.MCP_CONNECTIONS)) {
            parts.push('## MCP 服务器配置');
            parts.push('请将以下配置添加到 Kimi 的 MCP 配置中：\\n');
            parts.push('```json');
            parts.push('{');
            parts.push('  "mcpServers": {');
            configs.mcpConnections.forEach((m, i) => {
                importWarnings.push({
                    category: types_1.MigrationCategory.MCP_CONNECTIONS,
                    field: m.name,
                    originalValue: '[已脱敏]',
                    reason: 'MCP 服务器配置可能包含 API Key，需手动填写认证信息',
                    alternative: '请手动配置环境变量中的认证信息',
                });
                const serverConfig = {};
                if (m.config?.command)
                    serverConfig.command = m.config.command;
                if (m.config?.args)
                    serverConfig.args = m.config.args;
                if (m.config?.env)
                    serverConfig.env = '请手动填写环境变量';
                if (m.serverUrl)
                    serverConfig.url = m.serverUrl;
                parts.push(`    "${m.name}": ${JSON.stringify(serverConfig)}${i < configs.mcpConnections.length - 1 ? ',' : ''}`);
            });
            parts.push('  }');
            parts.push('}');
            parts.push('```');
            parts.push('⚠️ 注意：需要手动配置认证信息');
            parts.push('\\n配置文件位置和具体配置方式请参考 Kimi 官方文档。\\n');
        }
        // 记忆
        if (configs.memories && configs.memories.length > 0 && options.categories.includes(types_1.MigrationCategory.MEMORIES)) {
            parts.push('## Kimi+ 记忆/知识');
            configs.memories.forEach((m) => {
                if (m.sensitivityLevel !== types_1.SensitivityLevel.MUST_REMOVE) {
                    parts.push(`- [${m.type}] ${m.content}`);
                }
            });
            parts.push('');
        }
        // 设置
        if (configs.settings && options.categories.includes(types_1.MigrationCategory.SETTINGS)) {
            parts.push('## 设置');
            const s = configs.settings;
            if (s.model)
                parts.push(`- 默认模型：${s.model}`);
            if (s.temperature !== undefined)
                parts.push(`- 温度：${s.temperature}`);
            if (s.language)
                parts.push(`- 语言：${s.language}`);
            parts.push('');
        }
        if (importWarnings.length > 0) {
            parts.push('⚠️ 以下内容需要手动配置：');
            importWarnings.forEach((w) => {
                parts.push(`- ${w.field}：${w.reason}${w.alternative ? ` → ${w.alternative}` : ''}`);
            });
        }
        return {
            prompt: parts.join('\\n'),
            instructions: '1. 复制上方导入提示词\\n2. 打开 Kimi（kimi.moonshot.cn）\\n3. 按照提示完成配置\\n4. MCP 配置需要参考 Kimi 官方文档进行配置',
            warnings: importWarnings.length > 0 ? importWarnings : undefined,
        };
    },
    getFieldMapping() {
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
                env: { unifiedField: 'config.env', displayName: '环境变量', type: 'object', required: false, sensitivityLevel: types_1.SensitivityLevel.MUST_REMOVE },
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
                persona_description: { unifiedField: 'personaDescription', displayName: '人设描述', type: 'string', required: false },
                custom_settings: { unifiedField: 'customSettings', displayName: '自定义设置', type: 'object', required: false },
            },
        };
    },
};
