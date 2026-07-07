import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import { PlatformAdapter, MigrationCategory, CATEGORY_LABELS } from '../adapters/core/types';
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
} from 'lucide-react';
import { getSampleExportJson } from '../data/sampleExports';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
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
    maxWidth: '500px',
    margin: '0 auto',
  },
  flowCard: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
  },
  flowStep: {
    padding: 'var(--space-6)',
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
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-lg)',
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
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '4px',
  },
  flowDesc: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  flowArrow: {
    color: 'var(--color-text-muted)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  platformIcon: {
    fontSize: '2.5rem',
    marginBottom: 'var(--space-2)',
  },
  platformName: {
    fontWeight: 600,
    fontSize: '0.9375rem',
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
  quickStart: {
    background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(251,191,36,0.1))',
    border: '1px solid rgba(249,115,22,0.3)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  quickStartTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-3)',
  },
  quickStartContent: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
  },
};

type MigrationStep = 'select-platforms' | 'export' | 'import' | 'complete';

const MigrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<MigrationStep>('select-platforms');
  const [sourcePlatform, setSourcePlatform] = useState<PlatformAdapter | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<PlatformAdapter | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const [importCopied, setImportCopied] = useState(false);
  const [importPrompt, setImportPrompt] = useState('');
  const [importInstructions, setImportInstructions] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState('');
  const [useSkillMode, setUseSkillMode] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const allAdapters = registry.getAll();

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

  const handleParse = async () => {
    if (!jsonData.trim()) {
      setParseError('请粘贴 JSON 数据');
      return;
    }

    setParseLoading(true);
    setParseError(null);

    try {
      const result = await registry.parse(sourcePlatform!.id, jsonData);
      
      if (!result.success) {
        setParseError(result.error || '解析失败');
        return;
      }

      const schema = result.data;
      if (!schema) {
        setParseError('解析结果为空');
        return;
      }

      const importResult = targetPlatform!.generateImportPrompt(schema, {
        categories: Object.values(MigrationCategory),
      });
      
      setImportPrompt(importResult.prompt);
      setImportInstructions(importResult.instructions);
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
    if (currentStep === 'select-platforms' && sourcePlatform && targetPlatform) {
      setCurrentStep('export');
    }
  };

  const goBack = () => {
    if (currentStep === 'export') {
      setCurrentStep('select-platforms');
    } else if (currentStep === 'import') {
      setCurrentStep('export');
    }
  };

  const getStepStatus = (step: MigrationStep) => {
    const order = ['select-platforms', 'export', 'import', 'complete'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'default';
  };

  const renderFlowIndicator = () => {
    const steps = [
      { id: 'select-platforms' as MigrationStep, title: '选择平台', desc: '选择源和目标平台', icon: '🎯' },
      { id: 'export' as MigrationStep, title: '导出配置', desc: '从源平台获取配置', icon: '📤' },
      { id: 'import' as MigrationStep, title: '导入配置', desc: '注入到目标平台', icon: '📥' },
      { id: 'complete' as MigrationStep, title: '完成', desc: '迁移完成', icon: '✅' },
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
                {status === 'completed' ? <Check size={24} /> : status === 'active' ? <Loader2 size={24} className="animate-spin" /> : step.icon}
              </div>
              <div style={styles.flowContent}>
                <div style={styles.flowTitle}>{step.title}</div>
                <div style={styles.flowDesc}>{step.desc}</div>
              </div>
              {step.id !== 'complete' && (
                <ChevronRight size={20} style={styles.flowArrow} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSelectPlatforms = () => {
    return (
      <>
        <div style={styles.quickStart}>
          <div style={styles.quickStartTitle}>
            <Sparkles size={18} />
            一键迁移模式
          </div>
          <div style={styles.quickStartContent}>
            只需复制粘贴两次，AI 自动帮你完成配置转换！支持网页版和桌面客户端（如 QClaw）。
          </div>
        </div>

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
                  ...(sourcePlatform?.id === adapter.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
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
          开始迁移
        </button>
      </>
    );
  };

  const renderExport = () => {
    return (
      <>
        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>
            <Info size={16} />
            操作步骤
          </div>
          <ol style={styles.instructionsList}>
            <li>复制下方提示词</li>
            <li>打开 {sourcePlatform?.name}（网页版或客户端都可以）</li>
            <li>新建对话，粘贴提示词并发送</li>
            <li>等待 AI 返回 JSON 数据，复制全部内容</li>
          </ol>
        </div>

        <div style={styles.promptBox}>
          <div style={styles.promptHeader}>
            <div style={styles.promptTitle}>
              <span>📋</span>
              迁移提示词（点击复制）
            </div>
            <button
              style={{
                ...styles.copyBtn,
                ...(exportCopied ? styles.copyBtnCopied : {}),
              }}
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
                解析并生成导入提示词
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
            <li>打开 {targetPlatform?.name}（网页版或客户端都可以）</li>
            <li>新建对话，粘贴提示词并发送</li>
            <li>AI 会自动帮你创建所有配置</li>
          </ol>
        </div>

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
              style={{
                ...styles.copyBtn,
                ...(importCopied ? styles.copyBtnCopied : {}),
              }}
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
          <CheckCircle size={56} style={{ color: 'var(--color-success)' }} />
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
              setCurrentStep('select-platforms');
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
        <p style={styles.subtitle}>一键迁移你的 AI 配置，支持网页版和桌面客户端</p>
      </div>

      {renderFlowIndicator()}

      <div style={{ marginTop: 'var(--space-8)' }}>
        {currentStep === 'select-platforms' && renderSelectPlatforms()}
        {currentStep === 'export' && renderExport()}
        {currentStep === 'import' && renderImport()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  );
};

export default MigrationPage;