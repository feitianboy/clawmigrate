import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import { PlatformAdapter, MigrationCategory, CATEGORY_LABELS, UnifiedSchema } from '../adapters/core/types';
import { connectorRegistry, SkillBasedConnector } from '../connectors/registry';
import { ConnectorType, ConnectionResult, AgentInfo } from '../connectors/types';
import {
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
  AlertTriangle,
  Info,
  RefreshCw,
  Loader2,
  Cpu,
  Globe,
  Download,
  Upload,
  Bot,
  Lock,
} from 'lucide-react';
import { getSampleExportJson } from '../data/sampleExports';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: 'var(--space-8) var(--space-4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-10)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 'var(--space-2)',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-warning))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: 'var(--color-text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  flowCard: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    marginBottom: 'var(--space-8)',
  },
  flowStep: {
    padding: 'var(--space-5)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    transition: 'all 0.2s',
  },
  flowStepActive: {
    background: 'rgba(59, 130, 246, 0.05)',
    borderLeft: '4px solid var(--color-primary)',
  },
  flowStepCompleted: {
    background: 'rgba(34, 197, 94, 0.05)',
    borderLeft: '4px solid var(--color-success)',
  },
  flowIcon: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowIconActive: {
    background: 'var(--color-primary)',
    color: 'white',
  },
  flowIconCompleted: {
    background: 'var(--color-success)',
    color: 'white',
  },
  flowIconDefault: {
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-muted)',
  },
  flowContent: {
    flex: 1,
  },
  flowTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    marginBottom: '2px',
  },
  flowDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  flowArrow: {
    color: 'var(--color-text-muted)',
  },
  modeCard: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  modeTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-4)',
  },
  modeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--space-4)',
  },
  modeOption: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modeOptionSelected: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-light)',
  },
  modeIcon: {
    fontSize: '2rem',
    marginBottom: 'var(--space-3)',
  },
  modeName: {
    fontWeight: 600,
    fontSize: '1rem',
    marginBottom: 'var(--space-2)',
  },
  modeDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  modeTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-3)',
  },
  modeTag: {
    padding: '4px 12px',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
  },
  modeTagSupported: {
    background: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    color: 'var(--color-success)',
  },
  platformSelector: {
    padding: 'var(--space-6)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    marginBottom: 'var(--space-6)',
  },
  selectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-3)',
  },
  platformCard: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  platformCardSelected: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-light)',
  },
  platformCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  platformIcon: {
    fontSize: '2rem',
    marginBottom: 'var(--space-2)',
  },
  platformName: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  platformDesc: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    marginTop: '4px',
  },
  arrowContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    color: 'var(--color-primary)',
  },
  promptBox: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    marginBottom: 'var(--space-6)',
  },
  promptHeader: {
    padding: 'var(--space-5) var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '1rem',
    fontWeight: 600,
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  copyBtnCopied: {
    background: 'var(--color-success)',
  },
  promptContent: {
    padding: 'var(--space-6)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '500px',
    overflowY: 'auto',
    color: 'var(--color-text)',
    background: 'var(--color-bg)',
  },
  instructions: {
    padding: 'var(--space-5)',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-6)',
  },
  instructionsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-3)',
  },
  instructionsList: {
    margin: 0,
    paddingLeft: 'var(--space-5)',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    lineHeight: 1.8,
  },
  warningBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-6)',
  },
  warningContent: {
    fontSize: '0.875rem',
    color: '#fbbf24',
    lineHeight: 1.6,
  },
  actionBtn: {
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-4) var(--space-6)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  divider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: 'var(--space-6) 0',
  },
  skillCard: {
    background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(251,191,36,0.1))',
    border: '1px solid rgba(249,115,22,0.3)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  skillTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#f97316',
    marginBottom: 'var(--space-3)',
  },
  skillContent: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  apiCard: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  apiTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-3)',
  },
  apiContent: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
  agentList: {
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: 'var(--space-6)',
  },
  agentCard: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    marginBottom: 'var(--space-3)',
    transition: 'all 0.2s',
  },
  agentCardSelected: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-light)',
  },
  agentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-2)',
  },
  agentIcon: {
    fontSize: '1.5rem',
  },
  agentName: {
    fontWeight: 600,
    fontSize: '0.9375rem',
  },
  agentMeta: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    gap: 'var(--space-4)',
  },
  authSection: {
    padding: 'var(--space-6)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    marginBottom: 'var(--space-6)',
    textAlign: 'center',
  },
  authBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-4) var(--space-8)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

type MigrationMode = 'skill' | 'api' | 'manual';
type MigrationStep = 'select-mode' | 'select-platforms' | 'connect-source' | 'select-agent' | 'export' | 'import' | 'complete';

const MigrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<MigrationStep>('select-mode');
  const [migrationMode, setMigrationMode] = useState<MigrationMode>('skill');
  const [sourcePlatform, setSourcePlatform] = useState<PlatformAdapter | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<PlatformAdapter | null>(null);
  const [sourceConnection, setSourceConnection] = useState<ConnectionResult | null>(null);
  const [targetConnection, setTargetConnection] = useState<ConnectionResult | null>(null);
  const [sourceAgents, setSourceAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const [importCopied, setImportCopied] = useState(false);
  const [importPrompt, setImportPrompt] = useState('');
  const [importInstructions, setImportInstructions] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState('');
  const [parsedSchema, setParsedSchema] = useState<UnifiedSchema | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<MigrationCategory[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const allAdapters = registry.getAll();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (currentStep === 'select-platforms') {
      setSelectedCategories(Object.values(MigrationCategory));
    }
  }, [currentStep]);

  const handleCopyExport = () => {
    const prompt = generateExportPrompt();
    navigator.clipboard.writeText(prompt);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const handleCopyImport = () => {
    navigator.clipboard.writeText(importPrompt);
    setImportCopied(true);
    setTimeout(() => setImportCopied(false), 2000);
  };

  const generateExportPrompt = (): string => {
    if (!sourcePlatform || !targetPlatform) return '';

    const targetName = targetPlatform.name;

    return `你好！请帮我把我的配置迁移到 ${targetName}。

请整理以下内容，用 JSON 格式返回：
1. 所有技能/插件（名称、描述、功能配置）
2. 所有记忆/知识库内容
3. MCP 服务器配置（名称、URL、工具列表）
4. 系统设置（模型、温度、语言偏好、系统提示词）
5. 自动化任务/工作流

要求：
- 只返回纯 JSON，不要其他文字
- API Key、密码等敏感信息用 *** 替换
- 确保 JSON 格式正确，可直接解析

返回格式示例：
{
  "version": "1.0.0",
  "agent_name": "你的Agent名称",
  "settings": {
    "model": "模型名称",
    "temperature": 0.7,
    "language": "中文"
  },
  "skills": [...],
  "memories": [...],
  "mcp_connections": [...],
  "projects": [...]
}`;
  };

  const generateSkillExportPrompt = (): string => {
    if (!sourcePlatform || !targetPlatform) return '';

    return `你好！我使用 ClawMigrate 工具进行配置迁移。请帮我完成以下操作：

## 任务：从当前平台迁移到 ${targetPlatform.name}

### 步骤 1：整理配置
请收集以下配置信息：
- 技能/插件列表（名称、描述、配置参数）
- 记忆/知识库内容
- MCP 服务器连接配置
- 系统设置（模型、温度、系统提示词等）
- 自动化任务/工作流

### 步骤 2：调用迁移 API
将整理好的配置用 JSON 格式发送到以下 API：
\`\`\`
POST https://clawmigrate.com/api/migrate/convert
Content-Type: application/json

{
  "sourcePlatform": "${sourcePlatform.id}",
  "targetPlatform": "${targetPlatform.id}",
  "rawData": { ...你的配置JSON... }
}
\`\`\`

### 步骤 3：执行迁移
收到 API 返回的导入提示词后，帮我总结迁移结果，并告诉我下一步操作。

注意：API Key、密码等敏感信息用 *** 替换！`;
  };

  const handleConnectSource = async () => {
    if (!sourcePlatform) return;

    setIsConnecting(true);

    try {
      const connector = connectorRegistry.get(sourcePlatform.id);
      if (!connector) {
        const skillConfig = {
          id: sourcePlatform.id,
          name: `${sourcePlatform.name} Migration`,
          description: `Migration skill for ${sourcePlatform.name}`,
          version: '1.0.0',
          instructions: 'Help users migrate their AI config',
          apiEndpoint: `https://clawmigrate.com/api/migrate/convert`,
          capabilities: ['export', 'import'],
        };
        const skillConnector = new SkillBasedConnector(sourcePlatform, skillConfig);
        connectorRegistry.register(skillConnector);
        const result = await skillConnector.connect({
          platformId: sourcePlatform.id,
          type: ConnectorType.SKILL,
        });
        setSourceConnection(result);

        if (result.success) {
          const agents = await skillConnector.fetchAgents({
            platformId: sourcePlatform.id,
            accessToken: result.accessToken!,
          });
          setSourceAgents(agents);
          setCurrentStep('select-agent');
        }
      } else {
        const result = await connector.connect({
          platformId: sourcePlatform.id,
          type: ConnectorType.SKILL,
        });
        setSourceConnection(result);

        if (result.success) {
          const agents = await connector.fetchAgents({
            platformId: sourcePlatform.id,
            accessToken: result.accessToken!,
          });
          setSourceAgents(agents);
          setCurrentStep('select-agent');
        }
      }
    } catch (error) {
      console.error('Connect error:', error);
      setParseError('连接失败，请重试');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectTarget = async () => {
    if (!targetPlatform) return;

    setIsConnecting(true);

    try {
      const connector = connectorRegistry.get(targetPlatform.id);
      if (!connector) {
        const skillConfig = {
          id: targetPlatform.id,
          name: `${targetPlatform.name} Migration`,
          description: `Migration skill for ${targetPlatform.name}`,
          version: '1.0.0',
          instructions: 'Help users migrate their AI config',
          apiEndpoint: `https://clawmigrate.com/api/migrate/convert`,
          capabilities: ['export', 'import'],
        };
        const skillConnector = new SkillBasedConnector(targetPlatform, skillConfig);
        connectorRegistry.register(skillConnector);
        const result = await skillConnector.connect({
          platformId: targetPlatform.id,
          type: ConnectorType.SKILL,
        });
        setTargetConnection(result);
      } else {
        const result = await connector.connect({
          platformId: targetPlatform.id,
          type: ConnectorType.SKILL,
        });
        setTargetConnection(result);
      }
    } catch (error) {
      console.error('Connect error:', error);
      setParseError('连接失败，请重试');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFetchAndConvert = async () => {
    if (!sourcePlatform || !selectedAgent || !sourceConnection?.accessToken) return;

    setParseLoading(true);

    try {
      const connector = connectorRegistry.get(sourcePlatform.id);
      if (!connector) {
        throw new Error('Connector not found');
      }

      const config = await connector.fetchConfig({
        platformId: sourcePlatform.id,
        accessToken: sourceConnection.accessToken,
        agentId: selectedAgent.id,
        categories: selectedCategories,
      });

      if (!config) {
        throw new Error('Failed to fetch config');
      }

      const parseResult = registry.parse(sourcePlatform.id, JSON.stringify(config));

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Parse failed');
      }

      const schema = parseResult.data!;
      setParsedSchema(schema);

      const importResult = targetPlatform!.generateImportPrompt(schema, {
        categories: selectedCategories,
      });

      setImportPrompt(importResult.prompt);
      setImportInstructions(importResult.instructions);

      if (targetConnection?.success) {
        const writeResult = await connector.writeConfig({
          platformId: targetPlatform!.id,
          accessToken: targetConnection.accessToken,
          agentName: selectedAgent.name,
          configData: schema,
          categories: selectedCategories,
          mode: 'create',
        });
        if (writeResult.success) {
          setCurrentStep('complete');
          return;
        }
      }

      setCurrentStep('import');
    } catch (error) {
      console.error('Fetch and convert error:', error);
      setParseError(error instanceof Error ? error.message : '操作失败');
    } finally {
      setParseLoading(false);
    }
  };

  const handleParse = async () => {
    if (!jsonData.trim()) {
      setParseError('请粘贴 JSON 数据');
      return;
    }

    setParseLoading(true);
    setParseError(null);

    try {
      const result = registry.parse(sourcePlatform!.id, jsonData);

      if (!result.success) {
        setParseError(result.error || '解析失败');
        return;
      }

      const schema = result.data;
      if (!schema) {
        setParseError('解析结果为空');
        return;
      }

      setParsedSchema(schema);

      const importResult = targetPlatform!.generateImportPrompt(schema, {
        categories: selectedCategories,
      });

      setImportPrompt(importResult.prompt);
      setImportInstructions(importResult.instructions);

      if (migrationMode === 'api') {
        const apiResult = await fetch('/api/migrate/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePlatform: sourcePlatform!.id,
            targetPlatform: targetPlatform!.id,
            rawData: jsonData,
            categories: selectedCategories,
          }),
        });
        const apiData = await apiResult.json();
        if (apiData.ok) {
          setImportPrompt(apiData.data.importPrompt || importResult.prompt);
        }
      }

      setCurrentStep('import');
    } catch (err: any) {
      setParseError(err.message || '解析失败，请检查 JSON 格式');
    } finally {
      setParseLoading(false);
    }
  };

  const handleLoadSampleData = () => {
    if (sourcePlatform) {
      const sample = getSampleExportJson(sourcePlatform.id);
      setJsonData(sample);
    }
  };

  const goNext = () => {
    if (currentStep === 'select-mode') {
      setCurrentStep('select-platforms');
    } else if (currentStep === 'select-platforms' && sourcePlatform && targetPlatform) {
      if (migrationMode === 'skill') {
        setCurrentStep('connect-source');
      } else {
        setCurrentStep('export');
      }
    }
  };

  const goBack = () => {
    if (currentStep === 'select-platforms') {
      setCurrentStep('select-mode');
    } else if (currentStep === 'connect-source') {
      setCurrentStep('select-platforms');
    } else if (currentStep === 'select-agent') {
      setCurrentStep('connect-source');
    } else if (currentStep === 'export') {
      setCurrentStep('select-platforms');
    } else if (currentStep === 'import') {
      setCurrentStep('export');
    }
  };

  const getStepStatus = (step: MigrationStep) => {
    const order = ['select-mode', 'select-platforms', 'connect-source', 'select-agent', 'export', 'import', 'complete'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'default';
  };

  const renderFlowIndicator = () => {
    const steps: { id: MigrationStep; title: string; desc: string; icon: React.ReactNode }[] = [
      { id: 'select-mode', title: '选择方式', desc: 'Skill/API/手动', icon: <Cpu size={18} /> },
      { id: 'select-platforms', title: '选择平台', desc: '源和目标', icon: <Globe size={18} /> },
      { id: migrationMode === 'skill' ? 'connect-source' : 'export', title: migrationMode === 'skill' ? '连接授权' : '导出配置', desc: migrationMode === 'skill' ? '授权源平台' : '获取JSON', icon: migrationMode === 'skill' ? <Lock size={18} /> : <Download size={18} /> },
      { id: migrationMode === 'skill' ? 'select-agent' : 'import', title: migrationMode === 'skill' ? '选择Agent' : '导入配置', desc: migrationMode === 'skill' ? '选择要迁移的内容' : '注入目标', icon: migrationMode === 'skill' ? <Bot size={18} /> : <Upload size={18} /> },
      { id: 'complete', title: '完成', desc: '迁移完成', icon: <Check size={18} /> },
    ];

    return (
      <div style={styles.flowCard}>
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} style={{
              ...styles.flowStep,
              ...(status === 'active' ? styles.flowStepActive : {}),
              ...(status === 'completed' ? styles.flowStepCompleted : {}),
            }}>
              <div style={{
                ...styles.flowIcon,
                ...(status === 'active' ? styles.flowIconActive : {}),
                ...(status === 'completed' ? styles.flowIconCompleted : {}),
                ...(status === 'default' ? styles.flowIconDefault : {}),
              }}>
                {status === 'completed' ? <Check size={18} /> : status === 'active' ? <Loader2 size={18} className="animate-spin" /> : step.icon}
              </div>
              <div style={styles.flowContent}>
                <div style={styles.flowTitle}>{step.title}</div>
                <div style={styles.flowDesc}>{step.desc}</div>
              </div>
              {step.id !== 'complete' && (
                <ChevronRight size={16} style={styles.flowArrow} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSelectMode = () => {
    return (
      <div style={styles.modeCard}>
        <div style={styles.modeTitle}>
          <Sparkles size={20} />
          选择迁移方式
        </div>
        <div style={styles.modeGrid}>
          <div
            style={{ ...styles.modeOption, ...(migrationMode === 'skill' ? styles.modeOptionSelected : {}) }}
            onClick={() => setMigrationMode('skill')}
          >
            <div style={styles.modeIcon}>🤖</div>
            <div style={styles.modeName}>Skill 智能迁移</div>
            <div style={styles.modeDesc}>
              在 AI 平台安装迁移 Skill，让 AI 自动帮你整理配置并调用转换 API。支持网页版和桌面客户端。
            </div>
            <div style={styles.modeTags}>
              <span style={styles.modeTagSupported}>智能</span>
              <span style={styles.modeTagSupported}>网页版</span>
              <span style={styles.modeTagSupported}>客户端</span>
            </div>
          </div>

          <div
            style={{ ...styles.modeOption, ...(migrationMode === 'api' ? styles.modeOptionSelected : {}) }}
            onClick={() => setMigrationMode('api')}
          >
            <div style={styles.modeIcon}>🔌</div>
            <div style={styles.modeName}>API 快速迁移</div>
            <div style={styles.modeDesc}>
              通过 API 直接转换配置格式。复制源平台的 JSON 数据，系统自动解析并生成目标平台的导入提示词。
            </div>
            <div style={styles.modeTags}>
              <span style={styles.modeTagSupported}>快速</span>
              <span style={styles.modeTag}>网页版</span>
              <span style={styles.modeTag}>客户端</span>
            </div>
          </div>

          <div
            style={{ ...styles.modeOption, ...(migrationMode === 'manual' ? styles.modeOptionSelected : {}) }}
            onClick={() => setMigrationMode('manual')}
          >
            <div style={styles.modeIcon}>📋</div>
            <div style={styles.modeName}>手动复制粘贴</div>
            <div style={styles.modeDesc}>
              传统方式，手动复制导出提示词，获取 JSON 数据后再复制导入提示词到目标平台。
            </div>
            <div style={styles.modeTags}>
              <span style={styles.modeTag}>兼容所有平台</span>
              <span style={styles.modeTag}>无需授权</span>
            </div>
          </div>
        </div>

        <button
          style={{ ...styles.actionBtn, marginTop: 'var(--space-6)' }}
          onClick={goNext}
        >
          <Zap size={20} />
          开始迁移
        </button>
      </div>
    );
  };

  const renderSelectPlatforms = () => {
    return (
      <>
        <div style={styles.platformSelector}>
          <div style={styles.selectorHeader}>
            <span>📤</span>
            选择源平台（从哪里迁出）
          </div>
          <div style={styles.platformGrid}>
            {allAdapters.map((adapter) => (
              <div
                key={adapter.id}
                style={{
                  ...styles.platformCard,
                  ...(sourcePlatform?.id === adapter.id ? styles.platformCardSelected : {}),
                }}
                onClick={() => setSourcePlatform(adapter)}
              >
                <div style={styles.platformIcon}>{adapter.icon}</div>
                <div style={styles.platformName}>{adapter.name}</div>
                <div style={styles.platformDesc}>{adapter.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.arrowContainer}>
          <ArrowRight size={32} />
        </div>

        <div style={styles.platformSelector}>
          <div style={styles.selectorHeader}>
            <span>📥</span>
            选择目标平台（迁到哪里）
          </div>
          <div style={styles.platformGrid}>
            {allAdapters.map((adapter) => (
              <div
                key={adapter.id}
                style={{
                  ...styles.platformCard,
                  ...(targetPlatform?.id === adapter.id ? styles.platformCardSelected : {}),
                  ...(sourcePlatform?.id === adapter.id ? styles.platformCardDisabled : {}),
                }}
                onClick={() => sourcePlatform?.id !== adapter.id && setTargetPlatform(adapter)}
              >
                <div style={styles.platformIcon}>{adapter.icon}</div>
                <div style={styles.platformName}>{adapter.name}</div>
                <div style={styles.platformDesc}>{adapter.description}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          style={{
            ...styles.actionBtn,
            ...(!sourcePlatform || !targetPlatform ? styles.actionBtnDisabled : {}),
          }}
          onClick={goNext}
          disabled={!sourcePlatform || !targetPlatform}
        >
          <Zap size={20} />
          {migrationMode === 'skill' ? '连接源平台' : '开始导出'}
        </button>
      </>
    );
  };

  const renderConnectSource = () => {
    return (
      <>
        <div style={styles.authSection}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            连接 {sourcePlatform?.name}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            我们将通过 Skill 方式连接你的 {sourcePlatform?.name} 账户，无需输入密码。<br />
            你可以随时断开连接，我们不会存储你的敏感信息。
          </div>
          <button
            style={{ ...styles.authBtn, ...(isConnecting ? styles.actionBtnDisabled : {}) }}
            onClick={handleConnectSource}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                连接中...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                通过 Skill 连接
              </>
            )}
          </button>
        </div>

        <button
          style={{
            ...styles.actionBtn,
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          onClick={goBack}
        >
          返回选择
        </button>
      </>
    );
  };

  const renderSelectAgent = () => {
    return (
      <>
        <div style={styles.platformSelector}>
          <div style={styles.selectorHeader}>
            <span>🤖</span>
            选择要迁移的 Agent/项目
          </div>
          <div style={styles.agentList}>
            {sourceAgents.map((agent) => (
              <div
                key={agent.id}
                style={{
                  ...styles.agentCard,
                  ...(selectedAgent?.id === agent.id ? styles.agentCardSelected : {}),
                }}
                onClick={() => setSelectedAgent(agent)}
              >
                <div style={styles.agentHeader}>
                  <div style={styles.agentIcon}>{agent.icon}</div>
                  <div style={styles.agentName}>{agent.name}</div>
                </div>
                <div style={styles.agentMeta}>
                  <span>{agent.description || '无描述'}</span>
                  {agent.lastModified && <span>更新于 {new Date(agent.lastModified).toLocaleDateString()}</span>}
                  {agent.configCount && <span>{agent.configCount} 个配置项</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.platformSelector}>
          <div style={styles.selectorHeader}>
            <span>📋</span>
            选择要迁移的内容
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {Object.values(MigrationCategory).map((category) => (
              <label key={category} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                background: selectedCategories.includes(category) ? 'var(--color-primary-light)' : 'var(--color-bg)',
                border: `2px solid ${selectedCategories.includes(category) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories([...selectedCategories, category]);
                    } else {
                      setSelectedCategories(selectedCategories.filter((c) => c !== category));
                    }
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{CATEGORY_LABELS[category]}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          style={{
            ...styles.actionBtn,
            ...(!selectedAgent ? styles.actionBtnDisabled : {}),
          }}
          onClick={() => {
            if (migrationMode === 'skill' && targetPlatform) {
              handleConnectTarget();
            }
            handleFetchAndConvert();
          }}
          disabled={!selectedAgent || isConnecting}
        >
          {isConnecting ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              连接目标平台中...
            </>
          ) : (
            <>
              <Zap size={20} />
              开始迁移
            </>
          )}
        </button>
      </>
    );
  };

  const renderExport = () => {
    if (migrationMode === 'skill') {
      return (
        <>
          <div style={styles.skillCard}>
            <div style={styles.skillTitle}>
              <Bot size={18} />
              Skill 智能迁移模式
            </div>
            <div style={styles.skillContent}>
              在 {sourcePlatform?.name} 中安装 ClawMigrate Skill，然后复制下方提示词发送给 AI，AI 会自动帮你完成配置整理和格式转换。
            </div>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <div style={styles.promptTitle}>
                <span>📋</span>
                Skill 迁移提示词（点击复制）
              </div>
              <button
                style={{ ...styles.copyBtn, ...(exportCopied ? styles.copyBtnCopied : {}) }}
                onClick={handleCopyExport}
              >
                {exportCopied ? <Check size={16} /> : <Copy size={16} />}
                {exportCopied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={styles.promptContent}>
              {generateSkillExportPrompt()}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>
            <Info size={16} />
            操作步骤
          </div>
          <ol style={styles.instructionsList}>
            <li>复制下方提示词</li>
            <li>打开 {sourcePlatform?.name}</li>
            <li>新建对话，粘贴提示词并发送</li>
            <li>等待 AI 返回 JSON 数据，复制全部内容</li>
          </ol>
        </div>

        {migrationMode === 'api' && (
          <div style={styles.apiCard}>
            <div style={styles.apiTitle}>
              <Zap size={18} />
              API 快速迁移模式
            </div>
            <div style={styles.apiContent}>
              粘贴 JSON 数据后，系统会自动调用迁移 API 进行格式转换，无需手动处理。
            </div>
          </div>
        )}

        <div style={styles.promptBox}>
          <div style={styles.promptHeader}>
            <div style={styles.promptTitle}>
              <span>📋</span>
              迁移提示词（点击复制）
            </div>
            <button
              style={{ ...styles.copyBtn, ...(exportCopied ? styles.copyBtnCopied : {}) }}
              onClick={handleCopyExport}
            >
              {exportCopied ? <Check size={16} /> : <Copy size={16} />}
              {exportCopied ? '已复制' : '复制'}
            </button>
          </div>
          <div style={styles.promptContent}>
            {generateExportPrompt()}
          </div>
        </div>

        <div style={styles.warningBox}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <div style={styles.warningContent}>
            <strong>隐私保护：</strong>API Key、密码等敏感信息请用 *** 替换，不会被迁移。
          </div>
        </div>

        <div style={styles.divider} />

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            将获取的 JSON 数据粘贴到下方：
          </div>
          <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleLoadSampleData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} />
              加载示例数据
            </button>
          </div>
          <textarea
            style={{
              ...styles.promptContent,
              minHeight: '200px',
              textAlign: 'left',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              resize: 'vertical',
            }}
            placeholder="在此粘贴从源平台获取的 JSON 数据..."
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
          />
        </div>

        {parseError && (
          <div style={styles.warningBox}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-danger)', lineHeight: 1.6 }}>
              {parseError}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <button
            style={{
              ...styles.actionBtn,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onClick={goBack}
          >
            返回选择
          </button>
          <button
            style={{
              ...styles.actionBtn,
              ...(!jsonData.trim() || parseLoading ? styles.actionBtnDisabled : {}),
            }}
            onClick={handleParse}
            disabled={!jsonData.trim() || parseLoading}
          >
            {parseLoading ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                解析中...
              </>
            ) : (
              <>
                {migrationMode === 'api' ? 'API 转换并生成提示词' : '解析并生成导入提示词'}
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </>
    );
  };

  const renderImport = () => {
    return (
      <>
        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>
            <Info size={16} />
            最后一步
          </div>
          <ol style={styles.instructionsList}>
            <li>复制下方导入提示词</li>
            <li>打开 {targetPlatform?.name}</li>
            <li>新建对话，粘贴提示词并发送</li>
            <li>AI 会自动帮你创建所有配置</li>
          </ol>
        </div>

        {parsedSchema && (
          <div style={styles.platformSelector}>
            <div style={styles.selectorHeader}>
              <span>📊</span>
              迁移预览
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <p><strong>总配置项：</strong>{parsedSchema.metadata.totalItems} 个</p>
              {parsedSchema.metadata.sensitiveItems.length > 0 && (
                <p><strong>已脱敏项：</strong>{parsedSchema.metadata.sensitiveItems.length} 个</p>
              )}
              {parsedSchema.metadata.unsupportedItems.length > 0 && (
                <p><strong>不支持项：</strong>{parsedSchema.metadata.unsupportedItems.length} 个</p>
              )}
            </div>
          </div>
        )}

        <div style={styles.warningBox}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <div style={styles.warningContent}>
            <strong>注意：</strong>MCP 连接、API Key 等敏感配置需要你在目标平台手动输入。
          </div>
        </div>

        <div style={styles.promptBox}>
          <div style={styles.promptHeader}>
            <div style={styles.promptTitle}>
              <span>📋</span>
              导入提示词（点击复制）
            </div>
            <button
              style={{ ...styles.copyBtn, ...(importCopied ? styles.copyBtnCopied : {}) }}
              onClick={handleCopyImport}
            >
              {importCopied ? <Check size={16} /> : <Copy size={16} />}
              {importCopied ? '已复制' : '复制'}
            </button>
          </div>
          <div style={styles.promptContent}>
            {importPrompt}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <button
            style={{
              ...styles.actionBtn,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onClick={goBack}
          >
            返回重解析
          </button>
          <button
            style={styles.actionBtn}
            onClick={() => setCurrentStep('complete')}
          >
            迁移完成
            <Check size={20} />
          </button>
        </div>
      </>
    );
  };

  const renderComplete = () => {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
        <div style={{ width: '100px', height: '100px', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
          <Check size={56} style={{ color: 'var(--color-success)' }} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>迁移完成！</h2>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto var(--space-8)', lineHeight: 1.6 }}>
          恭喜！你已经成功完成了从 {sourcePlatform?.name} 到 {targetPlatform?.name} 的配置迁移。
          请在目标平台确认所有配置是否正确，敏感信息需要手动补充。
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <button
            style={styles.actionBtn}
            onClick={() => {
              setSourcePlatform(null);
              setTargetPlatform(null);
              setJsonData('');
              setImportPrompt('');
              setCurrentStep('select-mode');
            }}
          >
            <Zap size={20} />
            开始新迁移
          </button>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>请先登录后再进行迁移操作</p>
        <button style={styles.actionBtn} onClick={() => navigate('/login')}>前往登录</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI 配置迁移</h1>
        <p style={styles.subtitle}>多种方式迁移你的 AI 配置，支持网页版和桌面客户端</p>
      </div>

      {renderFlowIndicator()}

      <div style={{ marginTop: 'var(--space-8)' }}>
        {currentStep === 'select-mode' && renderSelectMode()}
        {currentStep === 'select-platforms' && renderSelectPlatforms()}
        {currentStep === 'connect-source' && renderConnectSource()}
        {currentStep === 'select-agent' && renderSelectAgent()}
        {currentStep === 'export' && renderExport()}
        {currentStep === 'import' && renderImport()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  );
};

export default MigrationPage;