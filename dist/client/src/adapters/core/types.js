"use strict";
// 虾管家 适配器核心类型定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitivityLevel = exports.CATEGORY_LABELS = exports.MigrationCategory = void 0;
// ===== 迁移类别 =====
var MigrationCategory;
(function (MigrationCategory) {
    MigrationCategory["SKILLS"] = "skills";
    MigrationCategory["AUTOMATIONS"] = "automations";
    MigrationCategory["MCP_CONNECTIONS"] = "mcp_connections";
    MigrationCategory["MEMORIES"] = "memories";
    MigrationCategory["SETTINGS"] = "settings";
    MigrationCategory["PROMPTS"] = "prompts";
    MigrationCategory["KNOWLEDGE_BASES"] = "knowledge_bases";
})(MigrationCategory || (exports.MigrationCategory = MigrationCategory = {}));
exports.CATEGORY_LABELS = {
    [MigrationCategory.SKILLS]: '技能/插件',
    [MigrationCategory.AUTOMATIONS]: '自动化任务',
    [MigrationCategory.MCP_CONNECTIONS]: 'MCP 连接',
    [MigrationCategory.MEMORIES]: '用户记忆',
    [MigrationCategory.SETTINGS]: '系统设置',
    [MigrationCategory.PROMPTS]: '提示词/角色设定',
    [MigrationCategory.KNOWLEDGE_BASES]: '知识库',
};
// ===== 敏感级别 =====
var SensitivityLevel;
(function (SensitivityLevel) {
    SensitivityLevel["SAFE"] = "safe";
    SensitivityLevel["REVIEW_SUGGESTED"] = "review_suggested";
    SensitivityLevel["MUST_REMOVE"] = "must_remove";
})(SensitivityLevel || (exports.SensitivityLevel = SensitivityLevel = {}));
