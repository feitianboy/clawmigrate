"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const cors_1 = require("../../lib/cors");
const PLATFORMS = {
    claude: { name: 'Claude', format: 'claude', supportsProjects: true, supportsMCP: true, supportsMemory: true },
    kimi: { name: 'Kimi', format: 'kimi', supportsProjects: false, supportsMCP: true, supportsMemory: true },
    openclaw: { name: 'OpenClaw', format: 'openclaw', supportsProjects: true, supportsMCP: true, supportsMemory: true },
    coze: { name: 'Coze', format: 'coze', supportsProjects: true, supportsMCP: false, supportsMemory: true },
    doubao: { name: '豆包', format: 'doubao', supportsProjects: true, supportsMCP: true, supportsMemory: true },
    deepseek: { name: 'DeepSeek', format: 'deepseek', supportsProjects: false, supportsMCP: true, supportsMemory: true },
    tongyi: { name: '通义千问', format: 'tongyi', supportsProjects: true, supportsMCP: true, supportsMemory: true },
    wenxin: { name: '文心一言', format: 'wenxin', supportsProjects: true, supportsMCP: false, supportsMemory: true },
    qwen: { name: 'Qwen', format: 'qwen', supportsProjects: true, supportsMCP: true, supportsMemory: true },
    xunfei: { name: '讯飞星火', format: 'xunfei', supportsProjects: true, supportsMCP: false, supportsMemory: true },
    gemini: { name: 'Gemini', format: 'gemini', supportsProjects: true, supportsMCP: true, supportsMemory: true },
};
async function handler(req, res) {
    (0, cors_1.setCorsHeaders)(req, res);
    if ((0, cors_1.handlePreflight)(req, res))
        return;
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    try {
        const { sourcePlatform, targetPlatform, rawData } = req.body || {};
        if (!sourcePlatform || !targetPlatform || !rawData) {
            return res.status(400).json({ ok: false, error: 'sourcePlatform, targetPlatform, and rawData are required' });
        }
        const source = PLATFORMS[sourcePlatform];
        const target = PLATFORMS[targetPlatform];
        if (!source) {
            return res.status(400).json({ ok: false, error: `Source platform "${sourcePlatform}" not supported` });
        }
        if (!target) {
            return res.status(400).json({ ok: false, error: `Target platform "${targetPlatform}" not supported` });
        }
        // 解析输入数据（支持 JSON 字符串或对象）
        let parsed;
        try {
            parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        }
        catch {
            return res.status(400).json({ ok: false, error: 'Invalid JSON data. Please paste valid JSON.' });
        }
        // 统一化：提取各配置项
        const normalized = normalizeData(parsed, sourcePlatform);
        // 转换为目标平台格式
        const converted = convertToTarget(normalized, targetPlatform, target);
        // 统计
        const stats = calculateStats(normalized, converted);
        return res.json({
            ok: true,
            data: {
                sourcePlatform,
                targetPlatform,
                sourceName: source.name,
                targetName: target.name,
                converted,
                stats,
            },
        });
    }
    catch (error) {
        console.error('Migration API error:', error);
        return res.status(500).json({
            ok: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
function normalizeData(data, sourcePlatform) {
    return {
        agentName: data.agent_name || data.name || data.project_name || '迁移的助手',
        settings: {
            model: data.settings?.model || data.model || undefined,
            temperature: data.settings?.temperature ?? data.temperature ?? undefined,
            language: data.settings?.language || data.language || undefined,
            systemPrompt: data.settings?.system_prompt || data.settings?.systemPrompt || data.system_prompt || data.systemPrompt || undefined,
            ...data.settings,
        },
        skills: normalizeArray(data.skills || data.plugins || data.tools || data.actions, (item) => ({
            name: item.name || item.title || '未命名技能',
            description: item.description || item.desc || undefined,
            config: item.config || item.parameters || item.params || undefined,
            enabled: item.enabled ?? item.is_active ?? true,
        })),
        memories: normalizeArray(data.memories || data.knowledge || data.memory || [], (item) => ({
            content: item.content || item.text || item.value || String(item),
            type: item.type || 'fact',
            tags: item.tags || [],
        })),
        mcpConnections: normalizeArray(data.mcp_connections || data.mcpConnections || data.mcp_servers || data.mcpServers || [], (item) => ({
            name: item.name || item.server_name || '未命名 MCP',
            serverUrl: item.server_url || item.serverUrl || item.url || undefined,
            transportType: item.transport_type || item.transportType || item.type || 'sse',
            tools: item.tools || item.tool_list || [],
            config: item.config || item.options || undefined,
        })),
        projects: normalizeArray(data.projects || data.workflows || data.automations || [], (item) => ({
            name: item.name || item.title || '未命名项目',
            description: item.description || item.desc || undefined,
            content: item.content || item.prompt || item.definition || undefined,
        })),
    };
}
function normalizeArray(arr, mapper) {
    if (!arr)
        return [];
    if (!Array.isArray(arr))
        arr = [arr];
    return arr.map(mapper);
}
function convertToTarget(data, targetPlatform, targetInfo) {
    switch (targetInfo.format) {
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
            return toGenericFormat(data, targetInfo.name);
    }
}
function toClaudeFormat(data) {
    return {
        format: 'claude',
        label: 'Claude Project 配置',
        description: '在 Claude 中创建新 Project，将以下内容填入对应位置',
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
            '在 MCP 连接中添加服务器配置',
            '手动填写 API Key 和敏感信息',
        ],
    };
}
function toKimiFormat(data) {
    return {
        format: 'kimi',
        label: 'Kimi 助手配置',
        description: '在 Kimi 中创建新助手，将以下内容填入对应位置',
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
        })),
        memories: data.memories.map(m => m.content),
        skills: data.skills.map(s => ({
            name: s.name,
            description: s.description || '',
        })),
        manualSteps: [
            '在 Kimi 中新建助手',
            '将 System Prompt 粘贴到助手设置中',
            '在 MCP 工具中添加服务器配置',
            '手动填写 API Key 和敏感信息',
        ],
    };
}
function toGeminiFormat(data) {
    return {
        format: 'gemini',
        label: 'Gemini Gem 配置',
        description: '在 Gemini 中创建新 Gem，将以下内容填入对应位置',
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
function toCozeFormat(data) {
    return {
        format: 'coze',
        label: 'Coze Bot 配置',
        description: '在 Coze 中创建新 Bot，将以下内容填入对应位置',
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
function toDeepSeekFormat(data) {
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
function toGenericFormat(data, targetName) {
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
function calculateStats(normalized, converted) {
    const total = normalized.skills.length + normalized.memories.length + normalized.mcpConnections.length + normalized.projects.length + (Object.keys(normalized.settings).length > 0 ? 1 : 0);
    const sensitive = [
        ...normalized.mcpConnections.filter(c => c.serverUrl?.includes('***')),
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
