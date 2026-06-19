// 虾管家 适配器核心类型定义

// ===== 迁移类别 =====
export enum MigrationCategory {
  SKILLS = 'skills',
  AUTOMATIONS = 'automations',
  MCP_CONNECTIONS = 'mcp_connections',
  MEMORIES = 'memories',
  SETTINGS = 'settings',
  PROMPTS = 'prompts',
  KNOWLEDGE_BASES = 'knowledge_bases',
}

export const CATEGORY_LABELS: Record<MigrationCategory, string> = {
  [MigrationCategory.SKILLS]: '技能/插件',
  [MigrationCategory.AUTOMATIONS]: '自动化任务',
  [MigrationCategory.MCP_CONNECTIONS]: 'MCP 连接',
  [MigrationCategory.MEMORIES]: '用户记忆',
  [MigrationCategory.SETTINGS]: '系统设置',
  [MigrationCategory.PROMPTS]: '提示词/角色设定',
  [MigrationCategory.KNOWLEDGE_BASES]: '知识库',
};

// ===== 敏感级别 =====
export enum SensitivityLevel {
  SAFE = 'safe',
  REVIEW_SUGGESTED = 'review_suggested',
  MUST_REMOVE = 'must_remove',
}

// ===== 导出相关 =====
export interface ExportOptions {
  categories: MigrationCategory[];
  language?: string;
}

export interface ExportPromptResult {
  prompt: string;
  instructions: string;
  note?: string;
  followUpQuestions?: string[];
}

export interface ParseError {
  category: MigrationCategory;
  field?: string;
  message: string;
  rawValue?: string;
  suggestion?: string;
}

export interface ParseWarning {
  category: MigrationCategory;
  field: string;
  message: string;
  sensitivityLevel?: SensitivityLevel;
}

export interface ParseResult {
  success: boolean;
  data?: UnifiedSchema;
  errors: ParseError[];
  warnings: ParseWarning[];
  partialData?: Partial<UnifiedSchema>;
}

// ===== 导入相关 =====
export type ConflictResolution = 'overwrite' | 'skip' | 'rename';

export interface ImportOptions {
  categories: MigrationCategory[];
  conflictResolution?: ConflictResolution;
  language?: string;
}

export interface ImportWarning {
  category: MigrationCategory;
  field: string;
  originalValue: string;
  reason: string;
  alternative?: string;
}

export interface ImportPromptResult {
  prompt: string;
  instructions: string;
  warnings?: ImportWarning[];
}

// ===== 统一中间 Schema =====
export interface UnifiedSchema {
  version: string;
  sourcePlatform: string;
  exportTime: string;
  configs: {
    skills?: SkillConfig[];
    automations?: AutomationConfig[];
    mcpConnections?: MCPConfig[];
    memories?: MemoryConfig[];
    settings?: SettingsConfig;
    prompts?: PromptConfig[];
    knowledgeBases?: KnowledgeBaseConfig[];
  };
  metadata: {
    totalItems: number;
    sensitiveItems: SensitiveItem[];
    unsupportedItems: UnsupportedItem[];
  };
}

// ===== 各类别配置类型 =====
export interface SkillConfig {
  id: string;
  name: string;
  description?: string;
  type: 'plugin' | 'skill' | 'tool' | 'action';
  config: Record<string, unknown>;
  enabled?: boolean;
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface AutomationConfig {
  id: string;
  name: string;
  description?: string;
  type: 'schedule' | 'trigger' | 'workflow';
  trigger?: string;
  actions: string[];
  schedule?: string;
  enabled?: boolean;
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface MCPConfig {
  id: string;
  name: string;
  serverUrl?: string;
  transportType?: 'stdio' | 'sse' | 'streamable-http';
  tools?: string[];
  config: Record<string, unknown>;
  enabled?: boolean;
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface MemoryConfig {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'instruction' | 'context';
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface SettingsConfig {
  language?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customSettings: Record<string, unknown>;
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface PromptConfig {
  id: string;
  name: string;
  content: string;
  type: 'system' | 'character' | 'template';
  tags?: string[];
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

export interface KnowledgeBaseConfig {
  id: string;
  name: string;
  description?: string;
  fileCount?: number;
  totalSize?: string;
  sourceType?: 'upload' | 'url' | 'api';
  sensitivityLevel: SensitivityLevel;
  originalFieldNames: Record<string, string>;
}

// ===== 元数据 =====
export interface SensitiveItem {
  category: MigrationCategory;
  field: string;
  level: SensitivityLevel;
  originalValue: string;
  maskedValue: string;
}

export interface UnsupportedItem {
  category: MigrationCategory;
  field: string;
  value: string;
  reason: string;
  alternative?: string;
}

// ===== 字段映射表 =====
export interface FieldMappingTable {
  [category: string]: {
    [platformField: string]: {
      unifiedField: string;
      displayName: string;
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required: boolean;
      description?: string;
      sensitivityLevel?: SensitivityLevel;
    };
  };
}

// ===== 平台适配器接口 =====
export interface PlatformAdapter {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  website: string;
  supportedExportCategories: MigrationCategory[];
  supportedImportCategories: MigrationCategory[];
  generateExportPrompt(options: ExportOptions): ExportPromptResult;
  parseExportResult(raw: string): ParseResult;
  generateImportPrompt(schema: UnifiedSchema, options: ImportOptions): ImportPromptResult;
  getFieldMapping(): FieldMappingTable;
}

// ===== 迁移草稿 =====
export interface MigrationDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourcePlatform: string;
  targetPlatform?: string;
  parsedSchema?: UnifiedSchema;
  selectedCategories?: MigrationCategory[];
  conflictResolutions?: Record<string, ConflictResolution>;
  currentStep: 'select-source' | 'export' | 'parse' | 'preview' | 'select-target' | 'import';
}
