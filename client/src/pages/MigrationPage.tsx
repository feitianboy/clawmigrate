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
  Crown,
} from 'lucide-react';
import { UsageGuard, incrementGuestMigrationCount, getGuestMigrationCount } from '../components/UsageGuard';
import { ItemLimitToast } from '../components/ItemLimitToast';
import { UpgradeModal } from '../components/UpgradeModal';

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
  // 完成页样式
  completeSection: {
    textAlign: 'center',
    padding: 'var(--space-8) 0',
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
    marginBottom: 'var(--space-4)',
  },
  completeDesc: {
    fontSize: '1rem',
    color: 'var(--color-text-secondary)',
    maxWidth: '500px',
    margin: '0 auto var(--space-8)',
    lineHeight: 1.6,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-4)',
    maxWidth: '500px',
    margin: '0 auto var(--space-8)',
  },
  statItem: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-primary)',
    marginBottom: 'var(--space-1)',
  },
  statLabel: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  // Pro升级卡片样式
  proUpgradeCard: {
    maxWidth: '400px',
    margin: '0 auto var(--space-6)',
    padding: 'var(--space-6)',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: 'var(--radius-xl)',
    textAlign: 'center',
  },
  proUpgradeIcon: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto var(--space-4)',
    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
  },
  proUpgradeTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
  },
  proUpgradeDesc: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-5)',
  },
  proUpgradeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

const STEPS = [
  { id: 'select-source', label: '选择源平台' },
  { id: 'export', label: '导出配置' },
  { id: 'parse', label: '解析数据' },
  { id: 'preview', label: '预览确认' },
  { id: 'select-target', label: '选择目标' },
  { id: 'import', label: '导入配置' },
  { id: 'complete', label: '完成' },
];

// 免费版配置项限制
const FREE_TIER_ITEM_LIMIT = 10;

const MigrationPage: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    currentStep,
    setStep,
    sourcePlatform,
    setSourcePlatform,
    parsedSchema,
    parseResult,
    targetPlatform,
    setTargetPlatform,
    selectedCategories,
    importPrompt,
    importInstructions,
    setImportPrompt,
    reset,
  } = useMigrationStore();

  const { isAuthenticated, isPro } = useAuthStore();

  // 页面挂载时强制重置步骤，防止 zustand persist 恢复旧状态导致步骤错位
  useEffect(() => {
    reset();
    setStep('select-source');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 额外的状态（从render函数中提升到顶层，修复Rules of Hooks违规）
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showItemLimitToast, setShowItemLimitToast] = useState(false);
  const [itemLimitToastData, setItemLimitToastData] = useState({ current: 0, limit: FREE_TIER_ITEM_LIMIT });
  // 入口权限检查状态
  const [accessDenied, setAccessDenied] = useState(false);
  const [denyReason, setDenyReason] = useState<'guest-limit' | 'free-limit' | null>(null);
  // 导出步骤状态
  const [migrationRecorded, setMigrationRecorded] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  // 解析步骤状态
  const [jsonData, setJsonData] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  // 导入步骤状态
  const [importCopied, setImportCopied] = useState(false);

  // 迁移完成时记录到后端
  useEffect(() => {
    if (currentStep === 'complete' && sourcePlatform && targetPlatform && parsedSchema && !migrationRecorded) {
      setMigrationRecorded(true);
      if (isAuthenticated) {
        // 已登录用户记录到后端
        fetch('/api/migrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sourcePlatform: sourcePlatform.id,
            targetPlatform: targetPlatform.id,
            itemsCount: parsedSchema.metadata?.totalItems || 0,
            categories: selectedCategories,
            status: 'completed',
          }),
        }).catch(err => console.error('记录迁移失败:', err));
      } else {
        // 未登录用户在真正完成迁移时递增计数
        incrementGuestMigrationCount();
      }
    }
  }, [currentStep, sourcePlatform, targetPlatform, parsedSchema, migrationRecorded, isAuthenticated, selectedCategories]);

  // Bug 4: 入口权限检查 - 在页面挂载时检查用户是否有权限访问迁移页面
  useEffect(() => {
    const checkAccess = async () => {
      // 未登录用户检查本地次数
      if (!isAuthenticated) {
        const guestCount = getGuestMigrationCount();
        if (guestCount >= 2) {
          setAccessDenied(true);
          setDenyReason('guest-limit');
          return;
        }
      }
      // 已登录的非Pro用户调用API检查
      if (isAuthenticated && !isPro()) {
        try {
          const response = await fetch('/api/membership/check', {
            method: 'POST',
            credentials: 'include',
          });
          const result = await response.json();
          if (!result.ok || !result.data.allowed) {
            setAccessDenied(true);
            setDenyReason('free-limit');
          }
        } catch (err) {
          console.error('检查迁移权限失败:', err);
          // 网络错误时允许继续
        }
      }
    };
    checkAccess();
  }, [isAuthenticated, isPro]);

  // 步骤指示器
  const renderStepIndicator = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);

    return (
      <div style={styles.stepsIndicator} className="step-indicator">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div style={{
                  ...styles.stepConnector,
                  ...(isCompleted ? { background: 'var(--color-success)' } : {}),
                }} />
              )}
              <div
                style={{
                  ...styles.stepDot,
                  ...(isActive ? styles.stepDotActive : {}),
                  ...(isCompleted ? styles.stepDotCompleted : {}),
                }}
              >
                {isCompleted ? <Check size={14} /> : index + 1}
                <span style={{ marginLeft: '4px' }}>{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // 辅助函数
  const getCategoryIcon = (category: MigrationCategory): string => {
    const icons: Record<MigrationCategory, string> = {
      [MigrationCategory.SKILLS]: '🎯',
      [MigrationCategory.AUTOMATIONS]: '⚡',
      [MigrationCategory.MCP_CONNECTIONS]: '🔗',
      [MigrationCategory.MEMORIES]: '🧠',
      [MigrationCategory.SETTINGS]: '⚙️',
      [MigrationCategory.PROMPTS]: '📝',
      [MigrationCategory.KNOWLEDGE_BASES]: '📚',
    };
    return icons[category] || '📦';
  };

  const getSensitivityLabel = (level: SensitivityLevel): string => {
    const labels: Record<SensitivityLevel, string> = {
      [SensitivityLevel.SAFE]: '安全',
      [SensitivityLevel.SENSITIVE]: '敏感',
      [SensitivityLevel.CRITICAL]: '高危',
    };
    return labels[level] || '未知';
  };

  // 导航函数
  const goNext = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1].id;
      
      // select-target → import 时生成导入提示词
      if (currentStep === 'select-target' && nextStep === 'import' && targetPlatform && parsedSchema) {
        try {
          // Bug 5: 对非Pro用户，生成导入提示词时只包含前10项配置
          let schemaToUse = parsedSchema;
          if (!isPro()) {
            const configs = parsedSchema.configs || {};
            const allItems: any[] = [];
            const categoryMap = {
              [MigrationCategory.SKILLS]: configs.skills || [],
              [MigrationCategory.AUTOMATIONS]: configs.automations || [],
              [MigrationCategory.MCP_CONNECTIONS]: configs.mcpConnections || [],
              [MigrationCategory.MEMORIES]: configs.memories || [],
              [MigrationCategory.SETTINGS]: configs.settings ? [configs.settings] : [],
              [MigrationCategory.PROMPTS]: configs.prompts || [],
              [MigrationCategory.KNOWLEDGE_BASES]: configs.knowledgeBases || [],
            };
            
            Object.entries(categoryMap).forEach(([category, items]) => {
              if (items && items.length > 0) {
                items.forEach((config: any) => {
                  allItems.push({ ...config, _category: category });
                });
              }
            });
            
            // 只取前10项
            const limitedItems = allItems.slice(0, FREE_TIER_ITEM_LIMIT);
            
            // 重新构建schema
            const limitedConfigs: any = {};
            limitedItems.forEach((item) => {
              const cat = item._category;
              delete item._category;
              if (!limitedConfigs[cat]) {
                limitedConfigs[cat] = [];
              }
              limitedConfigs[cat].push(item);
            });
            
            // 处理settings（应该是单个对象而不是数组）
            if (limitedConfigs[MigrationCategory.SETTINGS]?.length === 1) {
              limitedConfigs[MigrationCategory.SETTINGS] = limitedConfigs[MigrationCategory.SETTINGS][0];
            } else if (limitedConfigs[MigrationCategory.SETTINGS]?.length > 1) {
              limitedConfigs[MigrationCategory.SETTINGS] = limitedConfigs[MigrationCategory.SETTINGS][0];
            }
            
            schemaToUse = {
              ...parsedSchema,
              configs: limitedConfigs,
              metadata: {
                ...parsedSchema.metadata,
                totalItems: limitedItems.length,
              },
            };
          }
          
          const importResult = targetPlatform.generateImportPrompt(schemaToUse, {
            categories: selectedCategories,
          });
          setImportPrompt(importResult.prompt, importResult.instructions);
        } catch (err) {
          console.error('生成导入提示词失败:', err);
          setImportPrompt('生成导入提示词失败，请重试', '1. 返回上一步重新选择');
        }
      }
      
      setStep(nextStep);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleStartNew = () => {
    reset();
    setStep('select-source');
  };

  // 选择源平台
  const renderSelectSource = () => {
    const sourceAdapters = registry.getSupportedSourcePlatforms();

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择源平台</h2>
          <p style={styles.cardDesc}>选择你当前使用的 AI 助手平台</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.platformGrid} className="platform-grid">
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

          <div style={styles.actions} className="actions-bar">
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

  // 导出步骤
  const renderExport = () => {
    const exportResult = sourcePlatform?.generateExportPrompt?.({ categories: selectedCategories });
    const exportPromptText = exportResult?.prompt || '生成导出提示词失败';
    const exportInstructions = exportResult?.instructions;

    const handleCopy = () => {
      navigator.clipboard.writeText(exportPromptText);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    };

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>导出配置</h2>
          <p style={styles.cardDesc}>按照以下步骤从 {sourcePlatform?.name} 导出配置</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              操作步骤
            </div>
            <ol style={styles.instructionsList}>
              <li>复制下方提示词</li>
              <li>打开 {sourcePlatform?.name}，新建一个对话</li>
              <li>将提示词粘贴到对话中发送</li>
              <li>等待 AI 返回 JSON 数据，复制全部内容</li>
            </ol>
          </div>

          <div style={styles.promptBox}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>📋 导出提示词（点击复制）</span>
              <button
                style={{
                  ...styles.copyBtn,
                  ...(exportCopied ? styles.copyBtnCopied : {}),
                }}
                onClick={handleCopy}
              >
                {exportCopied ? <Check size={14} /> : <Copy size={14} />}
                {exportCopied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={styles.promptContent}>
              {exportPromptText}
            </div>
          </div>

          <div style={styles.actions} className="actions-bar">
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

  // 解析步骤
  const renderParse = () => {
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

        // 存储解析结果
        useMigrationStore.setState({ 
          parsedSchema: result.schema,
          parseResult: result 
        });

        // 检查配置项数量是否超过限制
        const totalItems = result.schema.metadata?.totalItems || 0;
        if (totalItems > FREE_TIER_ITEM_LIMIT) {
          setItemLimitToastData({ current: totalItems, limit: FREE_TIER_ITEM_LIMIT });
          setShowItemLimitToast(true);
        }

        goNext();
      } catch (err: any) {
        setParseError(err.message || '解析失败，请检查 JSON 格式');
      } finally {
        setParseLoading(false);
      }
    };

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>解析数据</h2>
          <p style={styles.cardDesc}>将获取的 JSON 数据粘贴到下方</p>
        </div>
        <div style={styles.cardBody}>
          <textarea
            style={styles.textarea}
            placeholder="在此粘贴 JSON 数据..."
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
          />

          {parseError && (
            <div style={styles.errorBox}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={styles.errorContent}>{parseError}</div>
            </div>
          )}

          <div style={styles.actions} className="actions-bar">
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: parseLoading ? 0.7 : 1,
                cursor: parseLoading ? 'wait' : 'pointer',
              }}
              onClick={handleParse}
              disabled={parseLoading}
            >
              {parseLoading ? (
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

  // 预览步骤
  const renderPreview = () => {
    if (!parsedSchema) return null;

    const configs = parsedSchema.configs || {};
    const userIsPro = isPro();
    
    // Bug 5: 对非Pro用户，限制配置项显示数量
    // 收集所有配置项并添加索引
    const allItems: { category: MigrationCategory; label: string; data: any; index: number }[] = [];
    const categoryMap = {
      [MigrationCategory.SKILLS]: { data: configs.skills, label: CATEGORY_LABELS[MigrationCategory.SKILLS] },
      [MigrationCategory.AUTOMATIONS]: { data: configs.automations, label: CATEGORY_LABELS[MigrationCategory.AUTOMATIONS] },
      [MigrationCategory.MCP_CONNECTIONS]: { data: configs.mcpConnections, label: CATEGORY_LABELS[MigrationCategory.MCP_CONNECTIONS] },
      [MigrationCategory.MEMORIES]: { data: configs.memories, label: CATEGORY_LABELS[MigrationCategory.MEMORIES] },
      [MigrationCategory.SETTINGS]: { data: configs.settings ? [configs.settings] : [], label: CATEGORY_LABELS[MigrationCategory.SETTINGS] },
      [MigrationCategory.PROMPTS]: { data: configs.prompts, label: CATEGORY_LABELS[MigrationCategory.PROMPTS] },
      [MigrationCategory.KNOWLEDGE_BASES]: { data: configs.knowledgeBases, label: CATEGORY_LABELS[MigrationCategory.KNOWLEDGE_BASES] },
    };
    
    let globalIndex = 0;
    Object.entries(categoryMap).forEach(([category, item]) => {
      if (item.data && item.data.length > 0) {
        item.data.forEach((config: any) => {
          allItems.push({
            category: category as MigrationCategory,
            label: item.label,
            data: config,
            index: globalIndex++,
          });
        });
      }
    });
    
    const totalItems = allItems.length;
    const displayItems = !userIsPro && totalItems > FREE_TIER_ITEM_LIMIT
      ? allItems.slice(0, FREE_TIER_ITEM_LIMIT)
      : allItems;
    const hiddenItemsCount = totalItems - FREE_TIER_ITEM_LIMIT;
    
    // 按分类分组显示
    const displayedCategories = displayItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { label: item.label, items: [] };
      }
      acc[item.category].items.push(item.data);
      return acc;
    }, {} as Record<MigrationCategory, { label: string; items: any[] }>);

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
            {/* Bug 5: 非Pro用户配置项超限提示 */}
            {!userIsPro && hiddenItemsCount > 0 && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                textAlign: 'center',
              }}>
                <span style={{ color: '#fbbf24', fontSize: '0.875rem' }}>
                  还有 {hiddenItemsCount} 项配置，<button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 'inherit',
                      padding: 0,
                    }}
                  >升级 Pro</button> 查看全部
                </span>
              </div>
            )}
          </div>

          {Object.entries(displayedCategories).map(([category, item]) => (
            <div key={category} style={styles.previewSection}>
              <h3 style={styles.previewSectionTitle}>
                {getCategoryIcon(category as MigrationCategory)} {item.label}
                <span style={styles.previewBadge}>{item.items.length} 项</span>
              </h3>
              {item.items.map((config: any, index: number) => (
                <div key={index} style={styles.previewItem}>
                  <div style={styles.previewItemHeader} className="preview-item-header">
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

          <div style={styles.actions} className="actions-bar">
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

  // 选择目标平台
  const renderSelectTarget = () => {
    const targetAdapters = registry.getSupportedTargetPlatforms();

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择目标平台</h2>
          <p style={styles.cardDesc}>选择要迁移到的目标平台</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.platformGrid} className="platform-grid">
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

          <div style={styles.actions} className="actions-bar">
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
              onClick={goNext}
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

  // 导入步骤
  const renderImport = () => {
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

          <div style={styles.actions} className="actions-bar">
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

  // 完成步骤
  const renderComplete = () => {
    if (!parsedSchema) return null;
    const userIsPro = isPro();

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

        <div style={styles.statsGrid} className="complete-stats">
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parsedSchema.metadata.totalItems}</div>
            <div style={styles.statLabel}>配置项</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parsedSchema.metadata.sensitiveItems?.length || 0}</div>
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

        {/* 免费用户Pro升级引导卡片 - 新增 */}
        {isAuthenticated && !userIsPro && (
          <div style={styles.proUpgradeCard}>
            <div style={styles.proUpgradeIcon}>
              <Crown size={28} color="white" />
            </div>
            <h3 style={styles.proUpgradeTitle}>
              <Zap size={18} color="var(--color-warning)" />
              升级 Pro 版本
            </h3>
            <p style={styles.proUpgradeDesc}>
              解锁无限次迁移、迁移历史永久保存等高级功能
            </p>
            <button
              style={styles.proUpgradeBtn}
              onClick={() => setShowUpgradeModal(true)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              立即升级 Pro
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

        {/* 升级弹窗 */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="complete-upgrade"
        />
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

      {/* Bug 4: 入口权限被拒绝时显示引导卡片 */}
      {accessDenied && (
        <div style={{
          padding: 'var(--space-8)',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>
            {denyReason === 'guest-limit' ? '🦐' : '💎'}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {denyReason === 'guest-limit' ? '游客迁移次数已用完' : '本月迁移次数已用完'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
            {denyReason === 'guest-limit' 
              ? '您已用完2次游客迁移次数。注册账号后可享受每月3次免费迁移，升级Pro更可解锁无限次迁移。'
              : '您的免费迁移次数已用完。升级Pro版本可解锁无限次迁移，还有更多高级功能。'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            {denyReason === 'guest-limit' && (
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
                注册账号
                <ArrowRight size={18} />
              </button>
            )}
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-6)',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setShowUpgradeModal(true)}
            >
              <Crown size={18} />
              升级 Pro 解锁
            </button>
          </div>
        </div>
      )}

      {!accessDenied && (
        <>
          {currentStep !== 'complete' && renderStepIndicator()}
          {renderContent()}
        </>
      )}

      {/* 配置项超限提示条 */}
      {showItemLimitToast && (
        <ItemLimitToast
          current={itemLimitToastData.current}
          limit={itemLimitToastData.limit}
          onUpgrade={() => setShowUpgradeModal(true)}
          autoHideDuration={5000}
        />
      )}

      {/* 升级弹窗 */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="complete-upgrade"
      />
    </div>
  );
};

export default MigrationPage;
