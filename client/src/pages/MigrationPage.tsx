import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import { PlatformAdapter, MigrationCategory, CATEGORY_LABELS, UnifiedSchema, ParseResult } from '../adapters/core/types';
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'var(--space-8) var(--space-4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-8)',
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
  stepCard: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    marginBottom: 'var(--space-6)',
  },
  stepHeader: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  stepNumberDone: {
    background: 'var(--color-success)',
  },
  stepNumberActive: {
    background: 'var(--color-primary)',
  },
  stepNumberPending: {
    background: 'var(--color-bg)',
    color: 'var(--color-text-muted)',
    border: '2px solid var(--color-border)',
  },
  stepTitle: {
    fontWeight: 600,
    fontSize: '0.9375rem',
  },
  stepContent: {
    padding: 'var(--space-5)',
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
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 'var(--space-4)',
  },
  promptHeader: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
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
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  copyBtnCopied: {
    background: 'var(--color-success)',
  },
  promptContent: {
    padding: 'var(--space-4)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '400px',
    overflowY: 'auto',
    color: 'var(--color-text)',
  },
  instructions: {
    padding: 'var(--space-4)',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  },
  instructionsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-2)',
  },
  instructionsText: {
    fontSize: '0.8125rem',
    color: 'var(--color-text)',
    lineHeight: 1.6,
  },
  warningBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  },
  warningContent: {
    fontSize: '0.8125rem',
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
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: 'var(--space-4)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  previewCard: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-4)',
  },
  previewTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-3)',
  },
  previewItems: {
    fontSize: '0.8125rem',
    color: 'var(--color-text)',
    lineHeight: 1.8,
  },
  completeIcon: {
    width: '80px',
    height: '80px',
    background: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto var(--space-4)',
  },
};

type MigrationStep = 1 | 2 | 3;

const MigrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<MigrationStep>(1);
  const [sourcePlatform, setSourcePlatform] = useState<PlatformAdapter | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<PlatformAdapter | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const [importCopied, setImportCopied] = useState(false);
  const [importPrompt, setImportPrompt] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [parsedSchema, setParsedSchema] = useState<UnifiedSchema | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<MigrationCategory[]>([]);

  const allAdapters = registry.getAll();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (currentStep === 1) {
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

    return `帮我把配置迁移到 ${targetPlatform.name}。

请用 JSON 返回以下内容：
- skills: 技能/插件列表（名称、描述、配置）
- memories: 记忆/知识库
- mcp_connections: MCP 服务器配置（名称、URL）
- settings: 系统设置（模型、温度、系统提示词）
- projects: 项目/工作流

要求：
- API Key、密码用 *** 替换
- 只返回纯 JSON，不要其他文字

示例格式：
{
  "version": "1.0.0",
  "agent_name": "助手名称",
  "settings": {...},
  "skills": [...],
  "memories": [...],
  "mcp_connections": [...],
  "projects": [...]
}`;
  };

  const handleConvert = async () => {
    if (!jsonData.trim()) {
      setError('请粘贴 JSON 数据');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
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

      if (!apiData.ok) {
        throw new Error(apiData.error || '转换失败');
      }

      setImportPrompt(apiData.data.importPrompt || '');
      setParsedSchema(apiData.data.schema || null);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || '转换失败');
    } finally {
      setIsConverting(false);
    }
  };

  const handleLoadSample = () => {
    if (sourcePlatform) {
      setJsonData(getSampleExportJson(sourcePlatform.id));
    }
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'done';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const renderStep1 = () => {
    return (
      <>
        <div style={styles.stepContent}>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>从哪里迁出</div>
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
            <ArrowRight size={24} />
          </div>

          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>迁到哪里</div>
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
        </div>

        <button
          style={{
            ...styles.actionBtn,
            ...(!sourcePlatform || !targetPlatform ? styles.actionBtnDisabled : {}),
            margin: 'var(--space-5)',
          }}
          onClick={() => setCurrentStep(2)}
          disabled={!sourcePlatform || !targetPlatform}
        >
          <Zap size={20} />
          下一步
        </button>
      </>
    );
  };

  const renderStep2 = () => {
    return (
      <>
        <div style={styles.stepContent}>
          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              操作指引
            </div>
            <div style={styles.instructionsText}>
              1. 复制下方提示词<br />
              2. 打开 <strong>{sourcePlatform?.name}</strong>，新建对话粘贴发送<br />
              3. 等待 AI 返回 JSON 数据，复制全部内容<br />
              4. 粘贴到下方文本框，点击转换
            </div>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <div style={styles.promptTitle}>导出提示词</div>
              <button
                style={{ ...styles.copyBtn, ...(exportCopied ? styles.copyBtnCopied : {}) }}
                onClick={handleCopyExport}
              >
                {exportCopied ? <Check size={14} /> : <Copy size={14} />}
                {exportCopied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={styles.promptContent}>
              {generateExportPrompt()}
            </div>
          </div>

          <div style={styles.warningBox}>
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <div style={styles.warningContent}>
              <strong>隐私保护：</strong>API Key、密码等敏感信息请用 *** 替换
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>粘贴 JSON 数据</div>
              <button
                onClick={handleLoadSample}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={12} />
                加载示例
              </button>
            </div>
            <textarea
              style={styles.textarea}
              placeholder="在此粘贴从源平台获取的 JSON 数据..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
            />
          </div>

          {error && (
            <div style={styles.warningBox}>
              <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', lineHeight: 1.6 }}>
                {error}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
          <button
            style={{
              ...styles.actionBtn,
              flex: 1,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onClick={() => setCurrentStep(1)}
          >
            返回
          </button>
          <button
            style={{
              ...styles.actionBtn,
              flex: 1,
              ...(!jsonData.trim() || isConverting ? styles.actionBtnDisabled : {}),
            }}
            onClick={handleConvert}
            disabled={!jsonData.trim() || isConverting}
          >
            {isConverting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                转换中...
              </>
            ) : (
              <>
                转换并生成导入提示词
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </>
    );
  };

  const renderStep3 = () => {
    return (
      <>
        <div style={styles.stepContent}>
          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              最后一步
            </div>
            <div style={styles.instructionsText}>
              1. 复制下方导入提示词<br />
              2. 打开 <strong>{targetPlatform?.name}</strong>，新建对话粘贴发送<br />
              3. AI 会自动帮你创建所有配置
            </div>
          </div>

          {parsedSchema && (
            <div style={styles.previewCard}>
              <div style={styles.previewTitle}>迁移预览</div>
              <div style={styles.previewItems}>
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
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <div style={styles.warningContent}>
              <strong>注意：</strong>MCP 连接、API Key 等敏感配置需要手动输入
            </div>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <div style={styles.promptTitle}>导入提示词</div>
              <button
                style={{ ...styles.copyBtn, ...(importCopied ? styles.copyBtnCopied : {}) }}
                onClick={handleCopyImport}
              >
                {importCopied ? <Check size={14} /> : <Copy size={14} />}
                {importCopied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={styles.promptContent}>
              {importPrompt}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
          <button
            style={{
              ...styles.actionBtn,
              flex: 1,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            onClick={() => setCurrentStep(2)}
          >
            返回
          </button>
          <button
            style={{ ...styles.actionBtn, flex: 1 }}
            onClick={() => {
              setSourcePlatform(null);
              setTargetPlatform(null);
              setJsonData('');
              setImportPrompt('');
              setParsedSchema(null);
              setCurrentStep(1);
            }}
          >
            <Check size={18} />
            完成
          </button>
        </div>
      </>
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
        <p style={styles.subtitle}>复制粘贴两次，完成跨平台迁移</p>
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={{
            ...styles.stepNumber,
            ...(getStepStatus(1) === 'done' ? styles.stepNumberDone : {}),
            ...(getStepStatus(1) === 'active' ? styles.stepNumberActive : {}),
            ...(getStepStatus(1) === 'pending' ? styles.stepNumberPending : {}),
          }}>1</div>
          <div style={styles.stepTitle}>选择平台</div>
        </div>
        {currentStep === 1 && renderStep1()}
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={{
            ...styles.stepNumber,
            ...(getStepStatus(2) === 'done' ? styles.stepNumberDone : {}),
            ...(getStepStatus(2) === 'active' ? styles.stepNumberActive : {}),
            ...(getStepStatus(2) === 'pending' ? styles.stepNumberPending : {}),
          }}>2</div>
          <div style={styles.stepTitle}>导出配置</div>
        </div>
        {currentStep === 2 && renderStep2()}
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={{
            ...styles.stepNumber,
            ...(getStepStatus(3) === 'done' ? styles.stepNumberDone : {}),
            ...(getStepStatus(3) === 'active' ? styles.stepNumberActive : {}),
            ...(getStepStatus(3) === 'pending' ? styles.stepNumberPending : {}),
          }}>3</div>
          <div style={styles.stepTitle}>导入配置</div>
        </div>
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default MigrationPage;