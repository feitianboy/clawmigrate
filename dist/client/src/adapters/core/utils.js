/**
 * 适配器通用工具函数
 */
import { SensitivityLevel } from './types';
/**
 * 预处理用户粘贴的原始输入，提取 JSON 字符串
 */
export function preprocessRawInput(raw) {
    let cleaned = raw.trim();
    // 移除 markdown 代码块包裹
    cleaned = cleaned.replace(/^```(?:json)?\\s*\\n?/i, '').replace(/\\n?```\\s*$/i, '');
    // 移除前缀文字，定位 JSON 起止
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart > 0 || jsonEnd < cleaned.length - 1) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    return cleaned;
}
/**
 * 检测字符串中是否包含敏感信息
 */
export function containsSensitiveData(str) {
    const patterns = [
        /sk-[a-zA-Z0-9]{20,}/i,
        /api[_-]?key/i,
        /password/i,
        /secret/i,
        /token/i,
        /bearer\\s+/i,
        /[a-zA-Z0-9]{32,}/,
    ];
    return patterns.some((p) => p.test(str));
}
/**
 * 对敏感信息进行脱敏替换
 */
export function maskSensitiveData(str) {
    let masked = str;
    masked = masked.replace(/sk-[a-zA-Z0-9]{8,}/g, 'sk-****');
    masked = masked.replace(/\\"api[_-]?key\\"\\s*:\\s*\\"[^\\"]{4,}\面"/gi, '\\"api_key\\":\\"****\\"');
    masked = masked.replace(/\\"password\\"\\s*:\\s*\\"[^\\"]{4,}\面"/gi, '\\"password\\":\\"****\\"');
    masked = masked.replace(/\\"secret\\"\\s*:\\s*\\"[^\\"]{4,}\面"/gi, '\\"secret\\":\\"****\\"');
    masked = masked.replace(/\\"token\\"\\s*:\\s*\\"[^\\"]{4,}\面"/gi, '\\"token\\":\\"****\\"');
    return masked;
}
/**
 * 检测对象的敏感级别
 */
export function detectSensitivity(obj) {
    const str = JSON.stringify(obj);
    if (containsSensitiveData(str))
        return SensitivityLevel.MUST_REMOVE;
    return SensitivityLevel.SAFE;
}
/**
 * 检测记忆内容的敏感级别
 */
export function detectMemorySensitivity(content) {
    const emailPattern = /[\\w.-]+@[\\w.-]+\\.\\w+/;
    const phonePattern = /1[3-9]\\d{9}/;
    if (containsSensitiveData(content))
        return SensitivityLevel.MUST_REMOVE;
    if (emailPattern.test(content) || phonePattern.test(content))
        return SensitivityLevel.REVIEW_SUGGESTED;
    return SensitivityLevel.SAFE;
}
// ===== 类型映射工具函数 =====
export function mapTransportType(type) {
    const map = {
        stdio: 'stdio',
        sse: 'sse',
        'streamable-http': 'streamable-http',
    };
    return map[type] || 'stdio';
}
export function mapMemoryType(type) {
    const map = {
        fact: 'fact',
        preference: 'preference',
        instruction: 'instruction',
        context: 'context',
    };
    return map[type] || 'fact';
}
export function mapPromptType(type) {
    const map = {
        system: 'system',
        character: 'character',
        template: 'template',
    };
    return map[type] || 'system';
}
export function mapSkillType(type) {
    const map = {
        plugin: 'plugin',
        skill: 'skill',
        tool: 'tool',
        action: 'action',
    };
    return map[type] || 'plugin';
}
export function mapAutomationType(type) {
    const map = {
        schedule: 'schedule',
        trigger: 'trigger',
        workflow: 'workflow',
    };
    return map[type] || 'workflow';
}
export function mapSourceType(type) {
    const map = {
        upload: 'upload',
        url: 'url',
        api: 'api',
    };
    return map[type] || 'upload';
}
