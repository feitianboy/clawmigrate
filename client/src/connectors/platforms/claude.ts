import { SkillBasedConnector } from '../registry';
import { ConnectorType, SkillConfig } from '../types';

const claudeSkillConfig: SkillConfig = {
  id: 'clawmigrate-claude',
  name: 'ClawMigrate 迁移助手',
  description: '一键将 Claude Projects、记忆、MCP 配置迁移到其他 AI 平台',
  version: '1.0.0',
  instructions: `你是 ClawMigrate 迁移助手，可以帮助用户将 Claude 的配置迁移到其他 AI 平台。

使用方法：
1. 用户说"导出配置"或"迁移配置"时，调用导出功能
2. 整理用户的 Projects、MCP、记忆、设置等配置
3. 调用 ClawMigrate API 进行格式转换
4. 返回目标平台的导入指令

支持的目标平台：Kimi、OpenClaw、EasyClaw、MaxClaw 等`,
  apiEndpoint: '/api/migrate/convert',
  capabilities: ['export', 'convert', 'import'],
};

export const claudeConnector = new SkillBasedConnector(
  {
    id: 'claude',
    name: 'Claude',
    icon: '🟣',
    description: 'Anthropic 出品的 AI 助手，支持 Projects、MCP、Memories',
    supportedExportCategories: ['mcp_connections', 'memories', 'settings', 'prompts', 'knowledge_bases'],
  },
  claudeSkillConfig
);

claudeConnector.supportedTypes = [ConnectorType.SKILL, ConnectorType.OAUTH];
