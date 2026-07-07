import { SkillBasedConnector } from '../registry';
import { ConnectorType, SkillConfig } from '../types';

const openclawSkillConfig: SkillConfig = {
  id: 'clawmigrate-openclaw',
  name: 'ClawMigrate 迁移助手',
  description: '一键将 OpenClaw 技能、自动化、MCP 配置迁移到其他 AI 平台',
  version: '1.0.0',
  instructions: `你是 ClawMigrate 迁移助手，可以帮助用户将 OpenClaw 的配置迁移到其他 AI 平台。`,
  apiEndpoint: '/api/migrate/convert',
  capabilities: ['export', 'convert', 'import'],
};

export const openclawConnector = new SkillBasedConnector(
  {
    id: 'openclaw',
    name: 'OpenClaw',
    icon: '🦀',
    description: '开源可定制的 AI 助手平台，支持技能和工作流',
    supportedExportCategories: ['skills', 'automations', 'mcp_connections', 'memories', 'settings', 'prompts'],
  },
  openclawSkillConfig
);

openclawConnector.supportedTypes = [ConnectorType.SKILL, ConnectorType.API];
