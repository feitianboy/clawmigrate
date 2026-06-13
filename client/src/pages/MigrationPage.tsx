import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMigrationStore } from '../stores/migrationStore';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import {
  MigrationCategory,
  CATEGORY_LABELS,
  SensitivityLevel,
  PlatformAdapter,
  ParseResult,
} from '../adapters/core/types';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  Zap,
} from 'lucide-react';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: 'var(--space-8)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: 'var(--space-2)',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '1rem',
  },
  stepsIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-8)',
    padding: 'var(--space-4)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    overflowX: 'auto',
  },
  stepDot: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  stepDotActive: {
    background: 'var(--color-primary)',
    color: 'white',
  },
  stepDotCompleted: {
    color: 'var(--color-success)',
  },
  stepConnector: {
    width: '20px',
    height: '2px',
    background: 'var(--color-border)',
    flexShrink: 0,
  },
  card: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-6)',
  },
  cardHeader: {
    padding: 'var(--space-5) var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-1)',
  },
  cardDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
  },
  cardBody: {
    padding: 'var(--space-6)',
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
  },
  platformCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  platformCardSelected: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-light)',
  },
  platformIcon: {
    fontSize: '2.5rem',
    marginBottom: 'var(--space-3)',
  },
  platformName: {
    fontWeight: 600,
    marginBottom: 'var(--space-1)',
  },
  platformDesc: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
  },
  promptBox: {
    position: 'relative',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-5)',
  },
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
  },
  promptLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
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
    marginBottom: 'var(--space-5)',
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
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.875rem',
    resize: 'vertical',
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
    marginBottom: 'var(--space-5)',
  },
  warningIcon: {
    color: 'var(--color-warning)',
    flexShrink: 0,
  },
  warningContent: {
    fontSize: '0.875rem',
    color: '#fbbf24',
    lineHeight: 1.6,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-5)',
  },
  errorContent: {
    fontSize: '0.875rem',
    color: 'var(--color-danger)',
    lineHeight: 1.6,
  },
  previewSection: {
    marginBottom: 'var(--space-6)',
  },
  previewSectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 'var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  previewBadge: {
    padding: '2px 8px',
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  previewItem: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-3)',
  },
  previewItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-2)',
  },
  previewItemName: {
    fontWeight: 500,
    fontSize: '0.9375rem',
  },
  previewItemDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-2)',
  },
  previewItemMeta: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  sensitiveTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'var(--space-6)',
    paddingTop: 'var(--space-6)',
    borderTop: '1px solid var(--color-border)',
  },
  actionGroup: {
    display: 'flex',
    gap: 'var(--space-3)',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  completeSection: {
    textAlign: 'center',
    padding: 'var(--space-12) var(--space-6)',
  },
  completeIcon: {
    width: '80px',
    height: '80px',
    background: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto var(--space-6)',
    color: 'var(--color-success)',
  },
  completeTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: 'var(--space-3)',
  },
  completeDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '1.0625rem',
    marginBottom: 'var(--space-8)',
    maxWidth: '500px',
    margin: '0 auto var(--space-8)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-8)',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  statItem: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-1)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-10)',
    color: 'var(--color-text-secondary)',
  },
  noteBox: {
    padding: 'var(--space-3) var(--space-4)',
    background: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--space-3)',
  },
};

const stepLabels = [
  { key: 'select-source', label: '选择源平台' },
  { key: 'export', label: '导出配置' },
  { key: 'parse', label: '解析数据' },
  { key: 'preview', label: '预览确认' },
  { key: 'select-target', label: '选择目标平台' },
  { key: 'import', label: '导入配置' },
];

export const MigrationPage: React.FC = () => {
  const {
    currentStep,
    setStep,
    goBack,
    goNext,
    sourcePlatform,
    targetPlatform,
    setSourcePlatform,
    setTargetPlatform,
    parsedSchema,
    parseResult,
    rawExportData,
    setRawExportData,
    setParsedData,
    setImportPrompt,
    reset,
    saveDraft,
  } = useMigrationStore();

  const [copied, setCopied] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // 自动保存草稿
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep !== 'complete' && currentStep !== 'select-source') {
        saveDraft();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentStep, saveDraft]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleParse = useCallback(async () => {
    if (!rawExportData.trim()) {
      setParseError('请粘贴从平台获取的 JSON 数据');
      return;
    }

    if (!sourcePlatform) {
      setParseError('请先选择源平台');
      return;
    }

    setIsParsing(true);
    setParseError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result: ParseResult = sourcePlatform.parseExportResult(rawExportData);
      setParsedData(result.data || null, result);
      
      if (result.success) {
        goNext();
      } else {
        setParseError(result.errors[0]?.message || '解析失败，请检查数据格式');
      }
    } catch (err) {
      setParseError('解析过程中发生错误，请重试');
    } finally {
      setIsParsing(false);
    }
  }, [rawExportData, sourcePlatform, setParsedData, goNext]);

  const handleSelectTarget = useCallback(() => {
    if (!targetPlatform || !parsedSchema) return;

    const result = targetPlatform.generateImportPrompt(parsedSchema, {
      categories: Object.values(MigrationCategory),
    });
    setImportPrompt(result.prompt, result.instructions);
    goNext();
  }, [targetPlatform, parsedSchema, setImportPrompt, goNext]);

  const handleStartNew = () => {
    reset();
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      [MigrationCategory.SKILLS]: '🔌',
      [MigrationCategory.AUTOMATIONS]: '⚡',
      [MigrationCategory.MCP_CONNECTIONS]: '🔗',
      [MigrationCategory.MEMORIES]: '🧠',
      [MigrationCategory.SETTINGS]: '⚙️',
      [MigrationCategory.PROMPTS]: '💬',
      [MigrationCategory.KNOWLEDGE_BASES]: '📚',
    };
    return icons[category] || '📄';
  };

  const getSensitivityLabel = (level: SensitivityLevel) => {
    const labels: Record<SensitivityLevel, string> = {
      [SensitivityLevel.SAFE]: '',
      [SensitivityLevel.REVIEW_SUGGESTED]: '需审核',
      [SensitivityLevel.MUST_REMOVE]: '已脱敏',
    };
    return labels[level];
  };

  const renderStepIndicator = () => (
    <div style={styles.stepsIndicator}>
      {stepLabels.map((step, index) => {
        const stepKey = step.key as typeof currentStep;
        const isActive = currentStep === stepKey;
        const stepIndex = stepLabels.findIndex((s) => s.key === currentStep);
        const isCompleted = index < stepIndex;

        return (
          <React.Fragment key={step.key}>
            {index > 0 && <div style={styles.stepConnector} />}
            <div
              style={{
                ...styles.stepDot,
                ...(isActive ? styles.stepDotActive : {}),
                ...(isCompleted ? styles.stepDotCompleted : {}),
              }}
            >
              {isCompleted ? <Check size={14} /> : index + 1}
              <span>{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderSelectSource = () => {
    const sourceAdapters = registry.getSupportedSourcePlatforms();

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择源平台</h2>
          <p style={styles.cardDesc}>选择你当前使用的 AI 助手平台</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.platformGrid}>
            {sourceAdapters.map((adapter) => (
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

          <div style={styles.actions}>
            <div />
            <button
              style={{
                ...styles.btnPrimary,
                opacity: sourcePlatform ? 1 : 0.5,
                cursor: sourcePlatform ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={!sourcePlatform}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExport = () => {
    if (!sourcePlatform) return null;
    const exportResult = sourcePlatform.generateExportPrompt({
      categories: Object.values(MigrationCategory),
    });

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>导出配置</h2>
          <p style={styles.cardDesc}>按照以下步骤获取你的配置数据</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.warningBox}>
            <AlertTriangle size={18} style={styles.warningIcon} />
            <div style={styles.warningContent}>
              <strong>提示：</strong>导出的数据中可能包含 API Key 等敏感信息，系统会在解析时自动进行脱敏处理。
            </div>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>📋 导出提示词（点击复制）</span>
              <button
                style={{
                  ...styles.copyBtn,
                  ...(copied ? styles.copyBtnCopied : {}),
                }}
                onClick={() => handleCopy(exportResult.prompt)}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={styles.promptContent}>
              {exportResult.prompt}
            </div>
          </div>

          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              操作步骤
            </div>
            <ol style={styles.instructionsList}>
              {exportResult.instructions.split('\n').map((line, i) => (
                <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>

          {exportResult.note && (
            <div style={styles.noteBox}>
              💡 {exportResult.note}
            </div>
          )}

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button style={styles.btnPrimary} onClick={goNext}>
              我已获取数据，继续
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderParse = () => {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>粘贴数据</h2>
          <p style={styles.cardDesc}>将你从平台获取的 JSON 数据粘贴到下方</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.warningBox}>
            <AlertTriangle size={18} style={styles.warningIcon} />
            <div style={styles.warningContent}>
              请粘贴完整的 JSON 数据，系统会自动提取其中的配置信息。JSON 会被安全处理，敏感信息会自动脱敏。
            </div>
          </div>

          <textarea
            style={styles.textarea}
            placeholder={`请粘贴 JSON 数据，例如：

{
  "bot_name": "我的助手",
  "prompts": [...],
  "skills": [...],
  ...
}`}
            value={rawExportData}
            onChange={(e) => setRawExportData(e.target.value)}
          />

          {parseError && (
            <div style={styles.errorBox}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={styles.errorContent}>
                <strong>解析错误：</strong>{parseError}
              </div>
            </div>
          )}

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: isParsing ? 0.7 : 1,
              }}
              onClick={handleParse}
              disabled={isParsing || !rawExportData.trim()}
            >
              {isParsing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  解析数据
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!parsedSchema) return null;

    const configs = parsedSchema.configs;
    const categories = Object.entries({
      [MigrationCategory.SKILLS]: { data: configs.skills, label: CATEGORY_LABELS[MigrationCategory.SKILLS] },
      [MigrationCategory.AUTOMATIONS]: { data: configs.automations, label: CATEGORY_LABELS[MigrationCategory.AUTOMATIONS] },
      [MigrationCategory.MCP_CONNECTIONS]: { data: configs.mcpConnections, label: CATEGORY_LABELS[MigrationCategory.MCP_CONNECTIONS] },
      [MigrationCategory.MEMORIES]: { data: configs.memories, label: CATEGORY_LABELS[MigrationCategory.MEMORIES] },
      [MigrationCategory.SETTINGS]: { data: configs.settings ? [configs.settings] : [], label: CATEGORY_LABELS[MigrationCategory.SETTINGS] },
      [MigrationCategory.PROMPTS]: { data: configs.prompts, label: CATEGORY_LABELS[MigrationCategory.PROMPTS] },
      [MigrationCategory.KNOWLEDGE_BASES]: { data: configs.knowledgeBases, label: CATEGORY_LABELS[MigrationCategory.KNOWLEDGE_BASES] },
    }).filter(([, item]) => item.data && item.data.length > 0);

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>预览解析结果</h2>
          <p style={styles.cardDesc}>确认以下配置信息是否正确</p>
        </div>
        <div style={styles.cardBody}>
          {parseResult?.warnings && parseResult.warnings.length > 0 && (
            <div style={styles.warningBox}>
              <AlertTriangle size={18} style={styles.warningIcon} />
              <div style={styles.warningContent}>
                <strong>敏感信息提示：</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {parseResult.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ ...styles.previewSectionTitle, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              <span>共 {parsedSchema.metadata.totalItems} 个配置项</span>
              <span style={styles.previewBadge}>来自 {sourcePlatform?.name}</span>
            </div>
          </div>

          {categories.map(([category, item]) => (
            <div key={category} style={styles.previewSection}>
              <h3 style={styles.previewSectionTitle}>
                {getCategoryIcon(category)} {item.label}
                <span style={styles.previewBadge}>{item.data.length} 项</span>
              </h3>
              {item.data.map((config: any, index: number) => (
                <div key={index} style={styles.previewItem}>
                  <div style={styles.previewItemHeader}>
                    <span style={styles.previewItemName}>{config.name || config.id}</span>
                    {config.sensitivityLevel !== SensitivityLevel.SAFE && (
                      <span style={styles.sensitiveTag}>
                        <AlertTriangle size={10} />
                        {getSensitivityLabel(config.sensitivityLevel)}
                      </span>
                    )}
                  </div>
                  {config.description && (
                    <div style={styles.previewItemDesc}>{config.description}</div>
                  )}
                  <div style={styles.previewItemMeta}>
                    类型: {config.type || 'N/A'} · {config.enabled !== false ? '启用' : '禁用'}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              重新解析
            </button>
            <button style={styles.btnPrimary} onClick={goNext}>
              确认，继续选择目标平台
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectTarget = () => {
    const targetAdapters = registry.getSupportedTargetPlatforms();

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择目标平台</h2>
          <p style={styles.cardDesc}>选择要迁移到的目标平台</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.platformGrid}>
            {targetAdapters.map((adapter) => (
              <div
                key={adapter.id}
                style={{
                  ...styles.platformCard,
                  ...(targetPlatform?.id === adapter.id ? styles.platformCardSelected : {}),
                }}
                onClick={() => setTargetPlatform(adapter)}
              >
                <div style={styles.platformIcon}>{adapter.icon}</div>
                <div style={styles.platformName}>{adapter.name}</div>
                <div style={styles.platformDesc}>{adapter.description}</div>
              </div>
            ))}
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: targetPlatform ? 1 : 0.5,
                cursor: targetPlatform ? 'pointer' : 'not-allowed',
              }}
              onClick={handleSelectTarget}
              disabled={!targetPlatform}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderImport = () => {
    const { importPrompt, importInstructions } = useMigrationStore();
    const [importCopied, setImportCopied] = useState(false);

    const handleCopyImport = () => {
      navigator.clipboard.writeText(importPrompt);
      setImportCopied(true);
      setTimeout(() => setImportCopied(false), 2000);
    };

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>导入配置</h2>
          <p style={styles.cardDesc}>按照以下步骤将配置导入到目标平台</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.warningBox}>
            <AlertTriangle size={18} style={styles.warningIcon} />
            <div style={styles.warningContent}>
              <strong>部分内容需手动配置：</strong>
              MCP 连接、API Key 等敏感配置项需要你在目标平台手动输入。
            </div>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>📋 导入提示词（点击复制）</span>
              <button
                style={{
                  ...styles.copyBtn,
                  ...(importCopied ? styles.copyBtnCopied : {}),
                }}
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

          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              操作步骤
            </div>
            <ol style={styles.instructionsList}>
              {importInstructions.split('\n').map((line, i) => (
                <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              返回
            </button>
            <button style={styles.btnPrimary} onClick={goNext}>
              完成迁移
              <CheckCircle size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    if (!parsedSchema) return null;
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    return (
      <div style={styles.completeSection}>
        <div style={styles.completeIcon}>
          <CheckCircle size={40} />
        </div>
        <h2 style={styles.completeTitle}>迁移完成！</h2>
        <p style={styles.completeDesc}>
          恭喜！你已经成功完成了从 {sourcePlatform?.name} 到 {targetPlatform?.name} 的配置迁移。
          请在目标平台确认所有配置是否正确。
        </p>

        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parsedSchema.metadata.totalItems}</div>
            <div style={styles.statLabel}>配置项</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parsedSchema.metadata.sensitiveItems.length}</div>
            <div style={styles.statLabel}>敏感项已脱敏</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>100%</div>
            <div style={styles.statLabel}>完成度</div>
          </div>
        </div>

        {/* 未登录用户引导注册卡片 */}
        {!isAuthenticated && (
          <div style={{
            maxWidth: '400px',
            margin: '0 auto var(--space-8)',
            padding: 'var(--space-6)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-xl)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>📝</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              保存你的迁移记录
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-5)' }}>
              注册账号可以永久保存迁移历史，方便管理和回顾
            </p>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-6)',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/login')}
            >
              注册账号保存记录
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <button style={styles.btnSecondary} onClick={handleStartNew}>
            <Zap size={18} />
            开始新迁移
          </button>
          {isAuthenticated && (
            <button
              style={styles.btnPrimary}
              onClick={() => navigate('/history')}
            >
              查看迁移历史
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'select-source':
        return renderSelectSource();
      case 'export':
        return renderExport();
      case 'parse':
        return renderParse();
      case 'preview':
        return renderPreview();
      case 'select-target':
        return renderSelectTarget();
      case 'import':
        return renderImport();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>配置迁移</h1>
        <p style={styles.subtitle}>按照引导完成跨平台配置迁移</p>
      </div>

      {currentStep !== 'complete' && renderStepIndicator()}
      {renderContent()}
    </div>
  );
};

export default MigrationPage;
