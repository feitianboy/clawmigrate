import {
  UnifiedSchema,
  PlatformAdapter,
  MigrationCategory,
  SkillConfig,
  AutomationConfig,
  MCPConfig,
  MemoryConfig,
  SettingsConfig,
  PromptConfig,
  KnowledgeBaseConfig,
  FieldMappingTable,
} from './types';

export interface CrossPlatformMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
  defaultValue?: unknown;
  condition?: (schema: UnifiedSchema) => boolean;
}

export interface CategoryMapping {
  [category: string]: CrossPlatformMapping[];
}

const COMMON_MAPPINGS: Record<string, Record<string, CrossPlatformMapping[]>> = {
  prompts: {
    persona_description: [
      { sourceField: 'personaDescription', targetField: 'persona_description', transform: (v) => String(v || '') },
      { sourceField: 'content', targetField: 'system_prompt', transform: (v) => String(v || '') },
    ],
    system_prompt: [
      { sourceField: 'content', targetField: 'system_prompt', transform: (v) => String(v || '') },
      { sourceField: 'personaDescription', targetField: 'persona_description', transform: (v) => String(v || '') },
    ],
  },
  settings: {
    model: [
      { sourceField: 'model', targetField: 'model', transform: (v) => String(v || '') },
    ],
    temperature: [
      { sourceField: 'temperature', targetField: 'temperature', transform: (v) => typeof v === 'number' ? v : 0.7 },
    ],
    language: [
      { sourceField: 'language', targetField: 'language', transform: (v) => String(v || '') },
    ],
    persona_description: [
      { sourceField: 'personaDescription', targetField: 'persona_description', transform: (v) => String(v || '') },
    ],
  },
  memories: {
    content: [
      { sourceField: 'content', targetField: 'content', transform: (v) => String(v || '') },
    ],
    type: [
      { sourceField: 'type', targetField: 'type', transform: (v) => String(v || 'fact') },
    ],
  },
};

export function mapField(sourceValue: unknown, mappings: CrossPlatformMapping[], context?: UnifiedSchema): unknown {
  for (const mapping of mappings) {
    if (mapping.condition && context && !mapping.condition(context)) {
      continue;
    }
    if (sourceValue !== undefined && sourceValue !== null) {
      return mapping.transform ? mapping.transform(sourceValue) : sourceValue;
    }
    if (mapping.defaultValue !== undefined) {
      return mapping.defaultValue;
    }
  }
  return sourceValue;
}

export function transformPrompts(sourcePrompts: PromptConfig[], targetAdapter: PlatformAdapter): PromptConfig[] {
  const targetMapping = targetAdapter.getFieldMapping().prompts || {};
  const sourceFields = Object.keys(targetMapping);

  return sourcePrompts.map((prompt, index) => {
    const newPrompt: PromptConfig = {
      id: `prompt_${index}`,
      name: prompt.name,
      content: prompt.content,
      type: prompt.type,
      sensitivityLevel: prompt.sensitivityLevel,
      originalFieldNames: {},
    };

    for (const sourceField of sourceFields) {
      const mapping = targetMapping[sourceField];
      if (mapping) {
        let value: unknown = prompt[mapping.unifiedField as keyof PromptConfig];
        if (value === undefined) {
          if (sourceField === 'persona_description' || sourceField === 'system_prompt') {
            value = prompt.content;
          }
        }
        if (value !== undefined) {
          if (mapping.unifiedField === 'content') {
            newPrompt.content = String(value);
          }
          if (mapping.unifiedField === 'name') {
            newPrompt.name = String(value);
          }
          if (mapping.unifiedField === 'type') {
            newPrompt.type = value as 'system' | 'character' | 'template';
          }
        }
      }
    }

    return newPrompt;
  });
}

export function transformSettings(sourceSettings: SettingsConfig | undefined, targetAdapter: PlatformAdapter): SettingsConfig | undefined {
  if (!sourceSettings) return undefined;

  const targetMapping = targetAdapter.getFieldMapping().settings || {};
  const newSettings: SettingsConfig = {
    customSettings: {},
    sensitivityLevel: sourceSettings.sensitivityLevel,
    originalFieldNames: {},
  };

  for (const [sourceField, mapping] of Object.entries(targetMapping)) {
    const unifiedField = mapping.unifiedField;
    let value: unknown = sourceSettings[unifiedField as keyof SettingsConfig];

    if (value === undefined) {
      if (sourceField === 'persona_description' && sourceSettings.systemPrompt) {
        value = sourceSettings.systemPrompt;
      }
      if (sourceField === 'system_prompt' && sourceSettings.personaDescription) {
        value = sourceSettings.personaDescription;
      }
    }

    if (value !== undefined) {
      if (unifiedField === 'model') newSettings.model = String(value);
      if (unifiedField === 'temperature') newSettings.temperature = typeof value === 'number' ? value : undefined;
      if (unifiedField === 'language') newSettings.language = String(value);
      if (unifiedField === 'systemPrompt') newSettings.systemPrompt = String(value);
      if (unifiedField === 'personaDescription') newSettings.personaDescription = String(value);
      if (unifiedField.startsWith('customSettings.')) {
        const key = unifiedField.split('.')[1];
        newSettings.customSettings[key] = value;
      }
    }
  }

  return newSettings;
}

export function transformMemories(sourceMemories: MemoryConfig[], targetAdapter: PlatformAdapter): MemoryConfig[] {
  const targetMapping = targetAdapter.getFieldMapping().memories || {};

  return sourceMemories.map((memory, index) => {
    const newMemory: MemoryConfig = {
      id: `memory_${index}`,
      content: memory.content,
      type: memory.type,
      sensitivityLevel: memory.sensitivityLevel,
      originalFieldNames: {},
    };

    for (const [sourceField, mapping] of Object.entries(targetMapping)) {
      const unifiedField = mapping.unifiedField;
      let value: unknown = memory[unifiedField as keyof MemoryConfig];

      if (value !== undefined) {
        if (unifiedField === 'content') newMemory.content = String(value);
        if (unifiedField === 'type') newMemory.type = value as 'fact' | 'preference' | 'instruction' | 'context';
        if (unifiedField === 'tags') newMemory.tags = Array.isArray(value) ? value.map(String) : [];
      }
    }

    return newMemory;
  });
}

export function transformMCPConnections(sourceMCP: MCPConfig[], targetAdapter: PlatformAdapter): MCPConfig[] {
  const targetMapping = targetAdapter.getFieldMapping().mcp_connections || {};

  return sourceMCP.map((mcp, index) => {
    const newMCP: MCPConfig = {
      id: `mcp_${index}`,
      name: mcp.name,
      config: {},
      sensitivityLevel: mcp.sensitivityLevel,
      originalFieldNames: {},
    };

    for (const [sourceField, mapping] of Object.entries(targetMapping)) {
      const unifiedField = mapping.unifiedField;
      let value: unknown = mcp[unifiedField as keyof MCPConfig];

      if (value === undefined && unifiedField.startsWith('config.')) {
        const key = unifiedField.split('.')[1];
        value = mcp.config[key];
      }

      if (value !== undefined) {
        if (unifiedField === 'name') newMCP.name = String(value);
        if (unifiedField === 'serverUrl') newMCP.serverUrl = String(value);
        if (unifiedField === 'transportType') newMCP.transportType = value as 'stdio' | 'sse' | 'streamable-http';
        if (unifiedField === 'tools') newMCP.tools = Array.isArray(value) ? value.map(String) : [];
        if (unifiedField.startsWith('config.')) {
          const key = unifiedField.split('.')[1];
          newMCP.config[key] = value;
        }
      }
    }

    return newMCP;
  });
}

export function transformSkills(sourceSkills: SkillConfig[], targetAdapter: PlatformAdapter): SkillConfig[] {
  const targetMapping = targetAdapter.getFieldMapping().skills || {};

  return sourceSkills.map((skill, index) => {
    const newSkill: SkillConfig = {
      id: `skill_${index}`,
      name: skill.name,
      type: skill.type,
      config: {},
      sensitivityLevel: skill.sensitivityLevel,
      originalFieldNames: {},
    };

    for (const [sourceField, mapping] of Object.entries(targetMapping)) {
      const unifiedField = mapping.unifiedField;
      let value: unknown = skill[unifiedField as keyof SkillConfig];

      if (value === undefined && unifiedField.startsWith('config.')) {
        const key = unifiedField.split('.')[1];
        value = skill.config[key];
      }

      if (value !== undefined) {
        if (unifiedField === 'name') newSkill.name = String(value);
        if (unifiedField === 'description') newSkill.description = String(value);
        if (unifiedField === 'type') newSkill.type = value as 'plugin' | 'skill' | 'tool' | 'action';
        if (unifiedField.startsWith('config.')) {
          const key = unifiedField.split('.')[1];
          newSkill.config[key] = value;
        }
      }
    }

    return newSkill;
  });
}

export function transformSchema(sourceSchema: UnifiedSchema, targetAdapter: PlatformAdapter): UnifiedSchema {
  return {
    version: sourceSchema.version,
    sourcePlatform: sourceSchema.sourcePlatform,
    exportTime: sourceSchema.exportTime,
    configs: {
      skills: sourceSchema.configs.skills ? transformSkills(sourceSchema.configs.skills, targetAdapter) : undefined,
      automations: sourceSchema.configs.automations,
      mcpConnections: sourceSchema.configs.mcpConnections ? transformMCPConnections(sourceSchema.configs.mcpConnections, targetAdapter) : undefined,
      memories: sourceSchema.configs.memories ? transformMemories(sourceSchema.configs.memories, targetAdapter) : undefined,
      settings: transformSettings(sourceSchema.configs.settings, targetAdapter),
      prompts: sourceSchema.configs.prompts ? transformPrompts(sourceSchema.configs.prompts, targetAdapter) : undefined,
      knowledgeBases: sourceSchema.configs.knowledgeBases,
    },
    metadata: sourceSchema.metadata,
  };
}

export function getPlatformFeatureMatrix(): Record<string, {
  name: string;
  hasProjects: boolean;
  hasSkills: boolean;
  hasMCP: boolean;
  hasMemories: boolean;
  hasAutomations: boolean;
  hasKnowledgeBase: boolean;
  description: string;
}> {
  return {
    claude: {
      name: 'Claude',
      hasProjects: true,
      hasSkills: false,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: false,
      hasKnowledgeBase: true,
      description: 'Anthropic 出品的 AI 助手，以 Projects 为核心组织工作空间',
    },
    kimi: {
      name: 'Kimi',
      hasProjects: false,
      hasSkills: true,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: 'Moonshot 推出的智能助手，支持 Kimi+ 记忆和自定义工具',
    },
    openclaw: {
      name: 'OpenClaw',
      hasProjects: false,
      hasSkills: true,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: false,
      description: '开源智能助手平台，高度可定制',
    },
    qclaw: {
      name: 'QClaw',
      hasProjects: true,
      hasSkills: true,
      hasMCP: true,
      hasMemories: false,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '企业级智能助手，注重安全合规',
    },
    workbuddy: {
      name: 'WorkBuddy',
      hasProjects: true,
      hasSkills: true,
      hasMCP: false,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '办公场景专用智能助手',
    },
    maxclaw: {
      name: 'MaxClaw',
      hasProjects: false,
      hasSkills: true,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '全能型智能助手，支持多种插件',
    },
    duclaw: {
      name: 'DuClaw',
      hasProjects: true,
      hasSkills: true,
      hasMCP: false,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: false,
      description: '面向开发者的智能助手',
    },
    autoclaw: {
      name: 'AutoClaw',
      hasProjects: false,
      hasSkills: true,
      hasMCP: true,
      hasMemories: false,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '自动化工作流专用助手',
    },
    arkclaw: {
      name: 'ArkClaw',
      hasProjects: true,
      hasSkills: true,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '企业级智能助手平台',
    },
    claw360: {
      name: 'Claw360',
      hasProjects: true,
      hasSkills: true,
      hasMCP: true,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: true,
      description: '全方位智能助手解决方案',
    },
    easyclaw: {
      name: 'EasyClaw',
      hasProjects: false,
      hasSkills: true,
      hasMCP: false,
      hasMemories: true,
      hasAutomations: true,
      hasKnowledgeBase: false,
      description: '轻量级智能助手，易于上手',
    },
  };
}