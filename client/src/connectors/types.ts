// 平台连接器核心类型定义

export enum ConnectorType {
  SKILL = 'skill',
  API = 'api',
  BROWSER = 'browser',
  OAUTH = 'oauth',
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  type: 'project' | 'skill' | 'agent' | 'assistant';
  icon?: string;
  lastModified?: string;
  configCount?: number;
}

export interface ConnectOptions {
  platformId: string;
  type: ConnectorType;
  scopes?: string[];
  redirectUri?: string;
}

export interface ConnectionResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  userName?: string;
  error?: string;
}

export interface FetchAgentsOptions {
  platformId: string;
  accessToken: string;
}

export interface FetchConfigOptions {
  platformId: string;
  accessToken: string;
  agentId: string;
  categories: string[];
}

export interface WriteConfigOptions {
  platformId: string;
  accessToken: string;
  agentId?: string;
  agentName?: string;
  configData: any;
  categories: string[];
  mode: 'create' | 'update' | 'merge';
}

export interface WriteConfigResult {
  success: boolean;
  agentId?: string;
  agentUrl?: string;
  itemsWritten?: number;
  errors?: string[];
  warnings?: string[];
}

export interface PlatformConnector {
  id: string;
  name: string;
  icon: string;
  description: string;
  supportedTypes: ConnectorType[];
  supportedCategories: string[];
  supportsRead: boolean;
  supportsWrite: boolean;

  connect(options: ConnectOptions): Promise<ConnectionResult>;
  disconnect(platformId: string, accessToken: string): Promise<boolean>;
  validateConnection(platformId: string, accessToken: string): Promise<boolean>;

  fetchAgents(options: FetchAgentsOptions): Promise<AgentInfo[]>;
  fetchConfig(options: FetchConfigOptions): Promise<any>;
  writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult>;

  getAuthUrl?(options: ConnectOptions): string;
  handleCallback?(code: string, state: string): Promise<ConnectionResult>;
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  instructions: string;
  apiEndpoint: string;
  capabilities: string[];
}

export interface MigrationSession {
  id: string;
  createdAt: string;
  sourcePlatform: string;
  targetPlatform: string;
  sourceAgent?: AgentInfo;
  targetAgent?: AgentInfo;
  categories: string[];
  status: 'pending' | 'reading' | 'converting' | 'writing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}
