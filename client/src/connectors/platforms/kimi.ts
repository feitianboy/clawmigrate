import { SkillBasedConnector } from '../registry';
import { ConnectorType, SkillConfig } from '../types';

const kimiSkillConfig: SkillConfig = {
  id: 'clawmigrate-kimi',
  name: 'ClawMigrate 迁移助手',
  description: '一键将 Kimi 技能、记忆、MCP 配置迁移到其他 AI 平台',
  version: '1.0.0',
  instructions: `你是 ClawMigrate 迁移助手，可以帮助用户将 Kimi 的配置迁移到其他 AI 平台。

使用方法：
1. 用户说"导出配置"或"迁移配置"时，调用导出功能
2. 整理用户的技能、Kimi+ 记忆、MCP、设置等配置
3. 调用 ClawMigrate API 进行格式转换
4. 返回目标平台的导入指令

支持的目标平台：Claude、OpenClaw、EasyClaw、MaxClaw 等`,
  apiEndpoint: '/api/migrate/convert',
  capabilities: ['export', 'convert', 'import'],
};

export const kimiConnector = new SkillBasedConnector(
  {
    id: 'kimi',
    name: 'Kimi',
    icon: '🟠',
    description: '月之暗面 Moonshot AI 出品，支持超长上下文和 Kimi+ 记忆',
    supportedExportCategories: ['mcp_connections', 'memories', 'settings', 'prompts', 'skills', 'automations', 'knowledge_bases'],
  },
  kimiSkillConfig
);

kimiConnector.supportedTypes = [ConnectorType.SKILL, ConnectorType.OAUTH];
