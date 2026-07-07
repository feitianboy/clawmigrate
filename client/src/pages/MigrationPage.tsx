import { apiFetch } from '../utils/apiFetch';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMigrationStore } from '../stores/migrationStore';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import {
  MigrationCategory,
  CATEGORY_LABELS,
  SensitivityLevel,
  PlatformAdapter,
} from '../adapters/core/types';
import {
  AgentInfo,
  ConnectionStatus,
  ConnectorType,
} from '../connectors/types';
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
  Sparkles,
  Link2,
  LogIn,
  LogOut,
  Bot,
  Loader2,
  Shield,
  ExternalLink,
  Plug,
} from 'lucide-react';
import { UsageGuard } from '../components/UsageGuard';
import { UpgradeModal } from '../components/UpgradeModal';
import { getSampleExportJson } from '../data/sampleExports';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
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
  connectCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-4)',
  },
  connectCardConnected: {
    borderColor: 'var(--color-success)',
    background: 'rgba(34, 197, 94, 0.05)',
  },
  connectHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-3)',
  },
  connectPlatform: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  connectPlatformIcon: {
    fontSize: '2rem',
  },
  connectPlatformName: {
    fontWeight: 600,
    fontSize: '1rem',
  },
  connectStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '0.8125rem',
  },
  connectStatusConnected: {
    color: 'var(--color-success)',
  },
  connectStatusDisconnected: {
    color: 'var(--color-text-muted)',
  },
  agentList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-4)',
  },
  agentCard: {
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  agentCardSelected: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-light)',
  },
  agentCardHeader: {
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
  agentDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-2)',
    lineHeight: 1.4,
  },
  agentMeta: {
    display: 'flex',
    gap: 'var(--space-3)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  modeToggle: {
    display: 'flex',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-4)',
    padding: 'var(--space-2)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-md)',
  },
  modeBtn: {
    flex: 1,
    padding: 'var(--space-2) var(--space-3)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  modeBtnActive: {
    background: 'var(--color-primary)',
    color: 'white',
  },
  loadingOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-8)',
    gap: 'var(--space-3)',
  },
  loadingText: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
  },
};

const AUTO_STEPS = [
  { id: 'select-source', label: '选择源平台' },
  { id: 'connect-source', label: '连接源平台' },
  { id: 'select-agent', label: '选择Agent' },
  { id: 'select-categories', label: '选择内容' },
  { id: 'select-target', label: '选择目标' },
  { id: 'connect-target', label: '连接目标平台' },
  { id: 'migrating', label: '迁移中' },
  { id: 'complete', label: '完成' },
];

const MANUAL_STEPS = [
  { id: 'select-source', label: '选择源平台' },
  { id: 'export', label: '导出配置' },
  { id: 'parse', label: '解析数据' },
  { id: 'preview', label: '预览确认' },
  { id: 'select-target', label: '选择目标' },
  { id: 'import', label: '导入配置' },
  { id: 'complete', label: '完成' },
];

type MigrationMode = 'auto' | 'manual';

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
    toggleCategory,
    saveDraft,
    loadDraft,
    clearDraft,
  } = useMigrationStore();

  const { isAuthenticated, isPro } = useAuthStore();

  const [migrationMode, setMigrationMode] = useState<MigrationMode>('manual');
  const [sourceConnection, setSourceConnection] = useState<{
    status: ConnectionStatus;
    accessToken?: string;
    userName?: string;
  }>({ status: ConnectionStatus.DISCONNECTED });
  const [targetConnection, setTargetConnection] = useState<{
    status: ConnectionStatus;
    accessToken?: string;
    userName?: string;
  }>({ status: ConnectionStatus.DISCONNECTED });
  const [sourceAgents, setSourceAgents] = useState<AgentInfo[]>([]);
  const [selectedSourceAgent, setSelectedSourceAgent] = useState<AgentInfo | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [migrationId, setMigrationId] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [importCopied, setImportCopied] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [oneClickCopied, setOneClickCopied] = useState(false);

  const migrationRecordedRef = useRef(false);

  const STEPS = migrationMode === 'auto' ? AUTO_STEPS : MANUAL_STEPS;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    reset();
    setStep('select-source');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('clawmigrate-draft');
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            if (draft.currentStep && draft.currentStep !== 'select-source' && draft.currentStep !== 'complete') {
              setShowDraftPrompt(true);
            }
          } catch {}
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentStep !== 'select-source' && currentStep !== 'complete' && sourcePlatform) {
      saveDraft();
    }
  }, [currentStep, sourcePlatform, targetPlatform, parsedSchema]);

  const getCurrentSteps = () => {
    return migrationMode === 'auto' ? AUTO_STEPS : MANUAL_STEPS;
  };

  const goNext = () => {
    const steps = getCurrentSteps();
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].id;
      
      if (currentStep === 'select-target' && nextStep === 'import' && targetPlatform && parsedSchema) {
        try {
          const importResult = targetPlatform.generateImportPrompt(parsedSchema, {
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
    const steps = getCurrentSteps();
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1].id);
    }
  };

  const handleStartNew = () => {
    reset();
    setStep('select-source');
    setSourceConnection({ status: ConnectionStatus.DISCONNECTED });
    setTargetConnection({ status: ConnectionStatus.DISCONNECTED });
    setSourceAgents([]);
    setSelectedSourceAgent(null);
    setMigrationResult(null);
    setMigrationProgress(0);
  };

  const handleConnectSource = async () => {
    if (!sourcePlatform) return;
    
    setSourceConnection({ status: ConnectionStatus.CONNECTING });
    
    try {
      const response = await apiFetch('/api/connectors/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: sourcePlatform.id,
          type: ConnectorType.SKILL,
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setSourceConnection({
          status: ConnectionStatus.CONNECTED,
          accessToken: result.data.accessToken,
          userName: result.data.userName,
        });
        
        setAgentsLoading(true);
        try {
          const agentsResponse = await apiFetch(`/api/connectors/agents?platformId=${sourcePlatform.id}&accessToken=${result.data.accessToken}`);
          const agentsResult = await agentsResponse.json();
          if (agentsResult.ok) {
            setSourceAgents(agentsResult.data.agents || []);
          }
        } catch (err) {
          console.error('获取Agent列表失败:', err);
        } finally {
          setAgentsLoading(false);
        }
      } else {
        setSourceConnection({ status: ConnectionStatus.ERROR });
      }
    } catch (err) {
      console.error('连接失败:', err);
      setSourceConnection({ status: ConnectionStatus.ERROR });
    }
  };

  const handleConnectTarget = async () => {
    if (!targetPlatform) return;
    
    setTargetConnection({ status: ConnectionStatus.CONNECTING });
    
    try {
      const response = await apiFetch('/api/connectors/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: targetPlatform.id,
          type: ConnectorType.SKILL,
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setTargetConnection({
          status: ConnectionStatus.CONNECTED,
          accessToken: result.data.accessToken,
          userName: result.data.userName,
        });
      } else {
        setTargetConnection({ status: ConnectionStatus.ERROR });
      }
    } catch (err) {
      console.error('连接失败:', err);
      setTargetConnection({ status: ConnectionStatus.ERROR });
    }
  };

  const handleStartMigration = async () => {
    if (!sourcePlatform || !targetPlatform || !selectedSourceAgent) return;
    
    setMigrating(true);
    setMigrationProgress(10);
    
    try {
      const fetchConfigResponse = await apiFetch('/api/connectors/fetch-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: sourcePlatform.id,
          accessToken: sourceConnection.accessToken,
          agentId: selectedSourceAgent.id,
          categories: selectedCategories,
        }),
      });
      
      const fetchConfigResult = await fetchConfigResponse.json();
      setMigrationProgress(40);
      
      if (!fetchConfigResult.ok) throw new Error('获取配置失败');
      
      const rawData = fetchConfigResult.data.config;
      const parseResult = await registry.parse(sourcePlatform.id, JSON.stringify(rawData));
      setMigrationProgress(60);
      
      if (!parseResult.success) throw new Error(parseResult.error || '解析失败');
      
      useMigrationStore.setState({
        parsedSchema: parseResult.schema as any,
        parseResult: { warnings: parseResult.warnings || [], errors: [] } as any,
      });
      
      const targetAdapter = registry.get(targetPlatform.id);
      if (targetAdapter && parseResult.schema) {
        const importResult = targetAdapter.generateImportPrompt(parseResult.schema as any, {
          categories: selectedCategories,
        });
        setImportPrompt(importResult.prompt, importResult.instructions);
      }
      
      setMigrationProgress(80);
      
      const writeConfigResponse = await apiFetch('/api/connectors/write-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: targetPlatform.id,
          accessToken: targetConnection.accessToken,
          configData: parseResult.schema,
          categories: selectedCategories,
          mode: 'create',
          agentName: `${selectedSourceAgent.name} (已迁移)`,
        }),
      });
      
      const writeConfigResult = await writeConfigResponse.json();
      setMigrationProgress(100);
      
      if (writeConfigResult.ok) {
        setMigrationResult(writeConfigResult.data);
      }
      
      setTimeout(() => {
        goNext();
      }, 500);
      
    } catch (err: any) {
      console.error('迁移失败:', err);
      setMigrationResult({ error: err.message });
    } finally {
      setMigrating(false);
    }
  };

  const handleLoadSampleData = () => {
    if (sourcePlatform) {
      const sample = getSampleExportJson(sourcePlatform.id);
      setJsonData(sample);
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
      const result = await registry.parse(sourcePlatform!.id, jsonData);
      
      if (!result.success) {
        setParseError(result.error || '解析失败');
        return;
      }

      if (result.schema?.configs) {
        const configs = result.schema.configs as any;
        for (const category of Object.keys(configs)) {
          const items = configs[category];
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              if (item.sensitivityLevel === 'critical') {
                if (item.content) item.content = '***';
                if (item.value) item.value = '***';
                if (item.token) item.token = '***';
                if (item.apiKey) item.apiKey = '***';
                if (item.password) item.password = '***';
              }
            });
          }
        }
      }

      useMigrationStore.setState({
        parsedSchema: result.schema as any,
        parseResult: result as any,
      });

      goNext();
    } catch (err: any) {
      setParseError(err.message || '解析失败，请检查 JSON 格式');
    } finally {
      setParseLoading(false);
    }
  };

  const handleCompleteMigration = async () => {
    setCompleting(true);
    try {
      if (migrationId && isAuthenticated) {
        await apiFetch(`/api/migrations/${migrationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
      }
    } catch (err) {
      console.error('Failed to update migration status:', err);
    } finally {
      setCompleting(false);
      goNext();
    }
  };

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
      [SensitivityLevel.REVIEW_SUGGESTED]: '敏感',
      [SensitivityLevel.MUST_REMOVE]: '高危',
    };
    return labels[level] || '未知';
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>请先登录后再进行迁移操作</p>
        <button onClick={() => navigate('/login')} style={styles.btnPrimary}>前往登录</button>
      </div>
    );
  }

  const renderStepIndicator = () => {
    const steps = getCurrentSteps();
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div style={styles.stepsIndicator}>
        {steps.map((step, index) => {
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

  const renderSelectSource = () => {
    const sourceAdapters = registry.getSupportedSourcePlatforms();

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择迁移方式</h2>
          <p style={styles.cardDesc}>选择你偏好的迁移方式</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.modeToggle}>
            <button
              style={{
                ...styles.modeBtn,
                ...(migrationMode === 'auto' ? styles.modeBtnActive : {}),
              }}
              onClick={() => setMigrationMode('auto')}
            >
              <Zap size={14} style={{ marginRight: '6px' }} />
              一键自动迁移
            </button>
            <button
              style={{
                ...styles.modeBtn,
                ...(migrationMode === 'manual' ? styles.modeBtnActive : {}),
              }}
              onClick={() => setMigrationMode('manual')}
            >
              手动复制粘贴
            </button>
          </div>

          {migrationMode === 'auto' && (
            <div style={{ padding: 'var(--space-4)', background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(251,191,36,0.1))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>⚡ 一键自动迁移（推荐）</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                授权连接源平台和目标平台，自动读取配置并注入，全程无需复制粘贴！
              </p>
            </div>
          )}

          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>选择源平台</h3>
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

  const renderConnectSource = () => {
    const isConnected = sourceConnection.status === ConnectionStatus.CONNECTED;

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>连接源平台</h2>
          <p style={styles.cardDesc}>连接 {sourcePlatform?.name} 以读取配置</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{
            ...styles.connectCard,
            ...(isConnected ? styles.connectCardConnected : {}),
          }}>
            <div style={styles.connectHeader}>
              <div style={styles.connectPlatform}>
                <span style={styles.connectPlatformIcon}>{sourcePlatform?.icon}</span>
                <div>
                  <div style={styles.connectPlatformName}>{sourcePlatform?.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    通过 Skill 方式连接
                  </div>
                </div>
              </div>
              <div style={{
                ...styles.connectStatus,
                ...(isConnected ? styles.connectStatusConnected : styles.connectStatusDisconnected),
              }}>
                {sourceConnection.status === ConnectionStatus.CONNECTING ? (
                  <><Loader2 size={14} className="animate-spin" /> 连接中...</>
                ) : isConnected ? (
                  <><CheckCircle size={14} /> 已连接</>
                ) : sourceConnection.status === ConnectionStatus.ERROR ? (
                  <><AlertTriangle size={14} /> 连接失败</>
                ) : (
                  <><Plug size={14} /> 未连接</>
                )}
              </div>
            </div>
            
            {isConnected && sourceConnection.userName && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                已连接用户：{sourceConnection.userName}
              </div>
            )}

            {!isConnected && (
              <button
                onClick={handleConnectSource}
                disabled={sourceConnection.status === ConnectionStatus.CONNECTING}
                style={{
                  ...styles.btnPrimary,
                  marginTop: 'var(--space-3)',
                  opacity: sourceConnection.status === ConnectionStatus.CONNECTING ? 0.7 : 1,
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {sourceConnection.status === ConnectionStatus.CONNECTING ? (
                  <><Loader2 size={16} className="animate-spin" /> 连接中...</>
                ) : (
                  <><Link2 size={16} /> 连接 {sourcePlatform?.name}</>
                )}
              </button>
            )}
          </div>

          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <Info size={16} />
              连接说明
            </div>
            <ol style={styles.instructionsList}>
              <li>点击"连接"按钮，我们会生成一个专属 Skill</li>
              <li>在 {sourcePlatform?.name} 中安装 ClawMigrate 迁移助手 Skill</li>
              <li>安装完成后，系统将自动读取你的配置列表</li>
              <li>选择要迁移的 Agent 即可开始迁移</li>
            </ol>
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: isConnected ? 1 : 0.5,
                cursor: isConnected ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={!isConnected}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectAgent = () => {
    if (agentsLoading) {
      return (
        <div style={styles.card}>
          <div style={styles.cardBody}>
            <div style={styles.loadingOverlay}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <div style={styles.loadingText}>正在读取 {sourcePlatform?.name} 的 Agent 列表...</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择要迁移的 Agent</h2>
          <p style={styles.cardDesc}>从 {sourcePlatform?.name} 中选择要迁移的配置</p>
        </div>
        <div style={styles.cardBody}>
          {sourceAgents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
              <Bot size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.5 }} />
              <p>暂未找到 Agent</p>
            </div>
          ) : (
            <div style={styles.agentList}>
              {sourceAgents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    ...styles.agentCard,
                    ...(selectedSourceAgent?.id === agent.id ? styles.agentCardSelected : {}),
                  }}
                  onClick={() => setSelectedSourceAgent(agent)}
                >
                  <div style={styles.agentCardHeader}>
                    <span style={styles.agentIcon}>{agent.icon || '🤖'}</span>
                    <span style={styles.agentName}>{agent.name}</span>
                  </div>
                  {agent.description && (
                    <div style={styles.agentDesc}>{agent.description}</div>
                  )}
                  <div style={styles.agentMeta}>
                    <span>类型: {agent.type}</span>
                    <span>{agent.configCount} 项配置</span>
                  </div>
                </div>
              ))}
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
                opacity: selectedSourceAgent ? 1 : 0.5,
                cursor: selectedSourceAgent ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={!selectedSourceAgent}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectCategoriesAuto = () => {
    const allCategories = Object.values(MigrationCategory);
    
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>选择迁移内容</h2>
          <p style={styles.cardDesc}>选择要从 "{selectedSourceAgent?.name}" 迁移的配置类别</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {allCategories.map((category) => {
              const isSelected = selectedCategories.includes(category);
              const isSupported = sourcePlatform?.supportedExportCategories.includes(category);
              
              if (!isSupported) return null;
              
              return (
                <label key={category} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg)',
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', fontSize: '0.875rem',
                  minWidth: '180px',
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(category)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '1.25rem' }}>{getCategoryIcon(category)}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{CATEGORY_LABELS[category]}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={styles.warningBox}>
            <Shield size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <div style={styles.warningContent}>
              <strong>隐私保护：</strong>API Key、密码等敏感信息不会被迁移，需要在目标平台手动配置。
            </div>
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: selectedCategories.length > 0 ? 1 : 0.5,
                cursor: selectedCategories.length > 0 ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={selectedCategories.length === 0}
            >
              下一步
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

  const renderConnectTarget = () => {
    const isConnected = targetConnection.status === ConnectionStatus.CONNECTED;

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>连接目标平台</h2>
          <p style={styles.cardDesc}>连接 {targetPlatform?.name} 以注入配置</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{
            ...styles.connectCard,
            ...(isConnected ? styles.connectCardConnected : {}),
          }}>
            <div style={styles.connectHeader}>
              <div style={styles.connectPlatform}>
                <span style={styles.connectPlatformIcon}>{targetPlatform?.icon}</span>
                <div>
                  <div style={styles.connectPlatformName}>{targetPlatform?.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    通过 Skill 方式连接
                  </div>
                </div>
              </div>
              <div style={{
                ...styles.connectStatus,
                ...(isConnected ? styles.connectStatusConnected : styles.connectStatusDisconnected),
              }}>
                {targetConnection.status === ConnectionStatus.CONNECTING ? (
                  <><Loader2 size={14} className="animate-spin" /> 连接中...</>
                ) : isConnected ? (
                  <><CheckCircle size={14} /> 已连接</>
                ) : targetConnection.status === ConnectionStatus.ERROR ? (
                  <><AlertTriangle size={14} /> 连接失败</>
                ) : (
                  <><Plug size={14} /> 未连接</>
                )}
              </div>
            </div>
            
            {isConnected && targetConnection.userName && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                已连接用户：{targetConnection.userName}
              </div>
            )}

            {!isConnected && (
              <button
                onClick={handleConnectTarget}
                disabled={targetConnection.status === ConnectionStatus.CONNECTING}
                style={{
                  ...styles.btnPrimary,
                  marginTop: 'var(--space-3)',
                  opacity: targetConnection.status === ConnectionStatus.CONNECTING ? 0.7 : 1,
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {targetConnection.status === ConnectionStatus.CONNECTING ? (
                  <><Loader2 size={16} className="animate-spin" /> 连接中...</>
                ) : (
                  <><Link2 size={16} /> 连接 {targetPlatform?.name}</>
                )}
              </button>
            )}
          </div>

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              上一步
            </button>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: isConnected ? 1 : 0.5,
                cursor: isConnected ? 'pointer' : 'not-allowed',
              }}
              onClick={goNext}
              disabled={!isConnected}
            >
              开始迁移
              <Zap size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMigrating = () => {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>正在迁移...</h2>
          <p style={styles.cardDesc}>正在将配置从 {sourcePlatform?.name} 迁移到 {targetPlatform?.name}</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.loadingOverlay}>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg style={{ width: '80px', height: '80px', transform: 'rotate(-90deg)' }}>
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${migrationProgress * 2.26} 226`}
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}>
                {Math.round(migrationProgress)}%
              </div>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 'var(--space-4)' }}>
              {migrationProgress < 30 ? '正在读取源平台配置...' :
               migrationProgress < 60 ? '正在转换配置格式...' :
               migrationProgress < 90 ? '正在注入目标平台...' :
               '迁移完成！'}
            </div>
            <div style={styles.loadingText}>
              从 {selectedSourceAgent?.name} 迁移 {selectedCategories.length} 类配置
            </div>
          </div>

          {migrationResult?.error && (
            <div style={styles.errorBox}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
              <div style={styles.errorContent}>
                迁移失败：{migrationResult.error}
              </div>
            </div>
          )}

          {!migrating && !migrationResult?.error && (
            <div style={{ textAlign: 'center' }}>
              <button
                style={{ ...styles.btnPrimary, marginTop: 'var(--space-4)' }}
                onClick={goNext}
              >
                查看结果
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExport = () => {
    const exportResult = sourcePlatform?.generateExportPrompt?.({ categories: selectedCategories });
    const exportPromptText = exportResult?.prompt || '生成导出提示词失败';
    const exportInstructions = exportResult?.instructions;

    const handleCopy = () => {
      navigator.clipboard.writeText(exportPromptText);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    };

    const oneClickPrompt = targetPlatform ? `你好！我想把我的 ${sourcePlatform?.name} 配置迁移到 ${targetPlatform?.name}。

请帮我整理以下内容并调用 ClawMigrate API 进行转换：
- 所有 Projects/技能/插件（包括名称、描述、人设、系统提示词）
- MCP 服务器配置（名称、工具列表）
- 记忆内容
- 设置（模型、温度、语言偏好）

整理成JSON格式后，发送POST请求到：
https://clawmigrate.com/api/migrate/convert

请求体格式：
{
  "sourcePlatform": "${sourcePlatform?.id}",
  "targetPlatform": "${targetPlatform?.id}",
  "rawData": { ... 你整理的配置 ... }
}

然后返回API生成的 ${targetPlatform?.name} 导入提示词，让我可以直接复制使用。` : null;

    const handleCopyOneClick = () => {
      if (oneClickPrompt) {
        navigator.clipboard.writeText(oneClickPrompt);
        setOneClickCopied(true);
        setTimeout(() => setOneClickCopied(false), 2000);
      }
    };

    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>导出配置</h2>
          <p style={styles.cardDesc}>按照以下步骤从 {sourcePlatform?.name} 导出配置</p>
        </div>
        <div style={styles.cardBody}>
          {targetPlatform && oneClickPrompt && (
            <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(251,191,36,0.1))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>⚡ 一键迁移（推荐）</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                直接发给 {sourcePlatform?.name}，AI会自动整理配置并调用API转换，一步到位！
              </p>
              <div style={{ position: 'relative' }}>
                <pre style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto' }}>
                  {oneClickPrompt}
                </pre>
                <button
                  onClick={handleCopyOneClick}
                  style={{ position: 'absolute', top: '8px', right: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: oneClickCopied ? 'var(--color-success)' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  {oneClickCopied ? <Check size={12} /> : <Copy size={12} />}
                  {oneClickCopied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>或使用传统方式：</span>
            </div>
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
          </div>

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
          <h2 style={styles.cardTitle}>解析数据</h2>
          <p style={styles.cardDesc}>将获取的 JSON 数据粘贴到下方</p>
        </div>
        <div style={styles.cardBody}>
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

          <div style={styles.actions}>
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

  const renderPreview = () => {
    if (!parsedSchema) return null;

    const configs = parsedSchema.configs || {};
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
                  {parseResult.warnings.map((w: any, i: number) => (
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

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ ...styles.previewSectionTitle, color: 'var(--color-text-secondary)' }}>
              选择要迁移的配置类别
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              {categories.map(([category, item]) => {
                const isSelected = selectedCategories.includes(category as MigrationCategory);
                return (
                  <label key={category} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-4)',
                    background: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', fontSize: '0.875rem',
                  }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(category as MigrationCategory)}
                      style={{ cursor: 'pointer' }}
                    />
                    {getCategoryIcon(category as MigrationCategory)} {item.label} ({item.data.length})
                  </label>
                );
              })}
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

          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={goBack}>
              <ChevronLeft size={18} />
              返回
            </button>
            <button style={{ ...styles.btnPrimary, opacity: completing ? 0.7 : 1, cursor: completing ? 'wait' : 'pointer' }} onClick={handleCompleteMigration} disabled={completing}>
              {completing ? '保存中...' : '完成迁移'}
              <CheckCircle size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    const userIsPro = isPro();
    const isAutoMode = migrationMode === 'auto';

    return (
      <div style={styles.completeSection}>
        <div style={styles.completeIcon}>
          <CheckCircle size={40} />
        </div>
        <h2 style={styles.completeTitle}>迁移完成！</h2>
        <p style={styles.completeDesc}>
          恭喜！你已经成功完成了从 {sourcePlatform?.name} 到 {targetPlatform?.name} 的配置迁移。
          {isAutoMode ? '配置已自动注入到目标平台。' : '请在目标平台确认所有配置是否正确。'}
        </p>

        {isAutoMode && migrationResult && (
          <div style={{ maxWidth: '500px', margin: '0 auto var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>迁移详情</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <div>源 Agent：{selectedSourceAgent?.name}</div>
              <div>配置项数：{migrationResult.itemsWritten || 0}</div>
              {migrationResult.agentUrl && (
                <div>
                  目标链接：
                  <a href={migrationResult.agentUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                    查看 {ExternalLink}
                  </a>
                </div>
              )}
            </div>
            {migrationResult.warnings && migrationResult.warnings.length > 0 && (
              <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', marginBottom: 'var(--space-2)' }}>
                  ⚠️ 注意事项：
                </div>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {migrationResult.warnings.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parsedSchema?.metadata?.totalItems || 0}</div>
            <div style={styles.statLabel}>配置项</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{parseResult?.warnings?.length || 0}</div>
            <div style={styles.statLabel}>敏感项已脱敏</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>100%</div>
            <div style={styles.statLabel}>完成度</div>
          </div>
        </div>

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

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="complete-upgrade"
        />
      </div>
    );
  };

  const renderContent = () => {
    return (
      <>
        {showDraftPrompt && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', zIndex: 1000,
            boxShadow: 'var(--shadow-xl)', maxWidth: '400px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>📋</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>发现未完成的迁移</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-5)' }}>
              是否恢复上次的迁移进度？
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button style={styles.btnSecondary} onClick={() => { clearDraft(); setShowDraftPrompt(false); }}>
                重新开始
              </button>
              <button style={styles.btnPrimary} onClick={() => { loadDraft(); setShowDraftPrompt(false); }}>
                恢复进度
              </button>
            </div>
          </div>
        )}
        {(() => {
          if (migrationMode === 'auto') {
            switch (currentStep) {
              case 'select-source':
                return renderSelectSource();
              case 'connect-source':
                return renderConnectSource();
              case 'select-agent':
                return renderSelectAgent();
              case 'select-categories':
                return renderSelectCategoriesAuto();
              case 'select-target':
                return renderSelectTarget();
              case 'connect-target':
                return renderConnectTarget();
              case 'migrating':
                if (!migrating && migrationProgress === 0) {
                  handleStartMigration();
                }
                return renderMigrating();
              case 'complete':
                return renderComplete();
              default:
                return null;
            }
          } else {
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
          }
        })()}
      </>
    );
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
