import { PlatformConnector, ConnectorType, ConnectionResult, ConnectOptions, FetchAgentsOptions, FetchConfigOptions, WriteConfigOptions, WriteConfigResult, AgentInfo, SkillConfig } from './types';
import { sampleExports } from '../data/sampleExports';

export abstract class BaseConnector implements PlatformConnector {
  abstract id: string;
  abstract name: string;
  abstract icon: string;
  abstract description: string;
  abstract supportedTypes: ConnectorType[];
  abstract supportedCategories: string[];
  abstract supportsRead: boolean;
  abstract supportsWrite: boolean;

  async connect(options: ConnectOptions): Promise<ConnectionResult> {
    return { success: false, error: 'Not implemented' };
  }

  async disconnect(platformId: string, accessToken: string): Promise<boolean> {
    return true;
  }

  async validateConnection(platformId: string, accessToken: string): Promise<boolean> {
    return !!accessToken;
  }

  async fetchAgents(options: FetchAgentsOptions): Promise<AgentInfo[]> {
    return [];
  }

  async fetchConfig(options: FetchConfigOptions): Promise<any> {
    return null;
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    return { success: false, errors: ['Not implemented'] };
  }
}

export class SkillBasedConnector extends BaseConnector {
  id: string;
  name: string;
  icon: string;
  description: string;
  supportedTypes = [ConnectorType.SKILL];
  supportedCategories: string[];
  supportsRead = true;
  supportsWrite = true;
  skillConfig: SkillConfig;

  constructor(platform: any, skillConfig: SkillConfig) {
    super();
    this.id = platform.id;
    this.name = platform.name;
    this.icon = platform.icon || '🤖';
    this.description = platform.description || '';
    this.supportedCategories = platform.supportedExportCategories || [];
    this.skillConfig = skillConfig;
  }

  override async connect(options: ConnectOptions): Promise<ConnectionResult> {
    return {
      success: true,
      accessToken: `skill_${this.id}_${Date.now()}`,
      userId: 'skill_user',
      userName: 'Skill User',
    };
  }

  override async fetchAgents(options: FetchAgentsOptions): Promise<AgentInfo[]> {
    const sampleData = sampleExports[this.id];
    if (!sampleData) return [];

    const agents: AgentInfo[] = [];

    if (sampleData.projects && Array.isArray(sampleData.projects)) {
      sampleData.projects.forEach((p: any, i: number) => {
        agents.push({
          id: `project_${i}`,
          name: p.name || `Project ${i + 1}`,
          description: p.description,
          type: 'project',
          icon: '📁',
          lastModified: new Date(Date.now() - i * 86400000).toISOString(),
          configCount: 1,
        });
      });
    }

    if (sampleData.skills && Array.isArray(sampleData.skills)) {
      sampleData.skills.forEach((s: any, i: number) => {
        agents.push({
          id: `skill_${i}`,
          name: s.name || `Skill ${i + 1}`,
          description: s.description,
          type: 'skill',
          icon: '🎯',
          lastModified: new Date(Date.now() - i * 86400000).toISOString(),
          configCount: 1,
        });
      });
    }

    if (sampleData.agent_name) {
      agents.unshift({
        id: 'main_agent',
        name: sampleData.agent_name as string,
        description: sampleData.agent_description as string,
        type: 'agent',
        icon: '🤖',
        lastModified: new Date().toISOString(),
        configCount: 5,
      });
    }

    if (agents.length === 0) {
      agents.push({
        id: 'default',
        name: `${this.name} 配置`,
        description: '默认配置',
        type: 'agent',
        icon: this.icon,
        lastModified: new Date().toISOString(),
        configCount: 3,
      });
    }

    return agents;
  }

  override async fetchConfig(options: FetchConfigOptions): Promise<any> {
    const sampleData = sampleExports[this.id];
    if (!sampleData) return null;
    return sampleData;
  }

  override async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    return {
      success: true,
      agentId: `new_${Date.now()}`,
      agentUrl: `https://${this.id}.example.com/agent/${Date.now()}`,
      itemsWritten: options.configData?.metadata?.totalItems || 0,
      warnings: [
        '这是模拟的Skill写入方式，实际使用时请在目标平台中粘贴导入提示词',
        '敏感配置（API Key等）需要手动配置',
      ],
    };
  }

  getSkillConfig(): SkillConfig {
    return this.skillConfig;
  }
}

export class ConnectorRegistry {
  private connectors: Map<string, PlatformConnector> = new Map();

  register(connector: PlatformConnector): void {
    if (this.connectors.has(connector.id)) {
      console.warn(`Connector "${connector.id}" is already registered, overwriting.`);
    }
    this.connectors.set(connector.id, connector);
  }

  get(platformId: string): PlatformConnector | undefined {
    return this.connectors.get(platformId);
  }

  getAll(): PlatformConnector[] {
    return Array.from(this.connectors.values());
  }

  getByType(type: ConnectorType): PlatformConnector[] {
    return this.getAll().filter(c => c.supportedTypes.includes(type));
  }

  getReadableConnectors(): PlatformConnector[] {
    return this.getAll().filter(c => c.supportsRead);
  }

  getWritableConnectors(): PlatformConnector[] {
    return this.getAll().filter(c => c.supportsWrite);
  }
}

export const connectorRegistry = new ConnectorRegistry();
