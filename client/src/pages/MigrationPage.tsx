import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import { PlatformAdapter } from '../adapters/core/types';
import {
  Copy,
  Check,
  ArrowRight,
  Zap,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
  stepNumberDone: { background: 'var(--color-success)' },
  stepNumberPending: { background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '2px solid var(--color-border)' },
  stepTitle: { fontWeight: 600, fontSize: '0.9375rem' },
  stepContent: { padding: 'var(--space-5)' },
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
  platformCardSelected: { borderColor: 'var(--color-primary)', background: 'var(--color-primary-light)' },
  platformIcon: { fontSize: '2rem', marginBottom: 'var(--space-2)' },
  platformName: { fontWeight: 600, fontSize: '0.875rem' },
  platformDesc: { fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' },
  arrowContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', color: 'var(--color-primary)' },
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
  actionBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
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
  warningContent: { fontSize: '0.8125rem', color: '#fbbf24', lineHeight: 1.6 },
  infoBox: {
    padding: 'var(--space-4)',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  },
  infoContent: { fontSize: '0.8125rem', color: 'var(--color-primary)', lineHeight: 1.6 },
  resultSection: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 'var(--space-4)',
  },
  resultHeader: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTitle: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' },
  resultBody: {
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
  },
  copyBtnCopied: { background: 'var(--color-success)' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)',
  },
  statCard: {
    padding: 'var(--space-3)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
  statValue: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--color-text-secondary)' },
  manualStepList: {
    margin: 0,
    paddingLeft: 'var(--space-5)',
    fontSize: '0.8125rem',
    color: 'var(--color-text)',
    lineHeight: 1.8,
  },
  collapsibleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
  },
};

type MigrationStep = 1 | 2 | 3;

interface ConvertedResult {
  format: string;
  label: string;
  description: string;
  config: any;
  mcpServers?: any[];
  memories?: any[];
  skills?: any[];
  projects?: any[];
  manualSteps: string[];
}

interface StatsResult {
  totalItems: number;
  skills: number;
  memories: number;
  mcpConnections: number;
  projects: number;
  hasSettings: boolean;
  sensitiveItems: number;
  convertedFormat: string;
}

const MigrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<MigrationStep>(1);
  const [sourcePlatform, setSourcePlatform] = useState<PlatformAdapter | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<PlatformAdapter | null>(null);
  const [jsonData, setJsonData] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converted, setConverted] = useState<ConvertedResult | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ config: true });

  const allAdapters = registry.getAll();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleConvert = async () => {
    if (!jsonData.trim()) { setError('请粘贴配置数据'); return; }

    setIsConverting(true);
    setError(null);

    try {
      const res = await fetch('/api/migrate/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePlatform: sourcePlatform!.id,
          targetPlatform: targetPlatform!.id,
          rawData: jsonData,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '转换失败');

      setConverted(data.data.converted);
      setStats(data.data.stats);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || '转换失败');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = (section: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'done';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const renderStep1 = () => (
    <div style={styles.stepContent}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>从哪里迁出</div>
        <div style={styles.platformGrid}>
          {allAdapters.map(a => (
            <div key={a.id} style={{ ...styles.platformCard, ...(sourcePlatform?.id === a.id ? styles.platformCardSelected : {}) }} onClick={() => setSourcePlatform(a)}>
              <div style={styles.platformIcon}>{a.icon}</div>
              <div style={styles.platformName}>{a.name}</div>
              <div style={styles.platformDesc}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.arrowContainer}><ArrowRight size={24} /></div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>迁到哪里</div>
        <div style={styles.platformGrid}>
          {allAdapters.map(a => (
            <div key={a.id} style={{ ...styles.platformCard, ...(targetPlatform?.id === a.id ? styles.platformCardSelected : {}), ...(sourcePlatform?.id === a.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} onClick={() => sourcePlatform?.id !== a.id && setTargetPlatform(a)}>
              <div style={styles.platformIcon}>{a.icon}</div>
              <div style={styles.platformName}>{a.name}</div>
              <div style={styles.platformDesc}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>
      <button style={{ ...styles.actionBtn, ...(!sourcePlatform || !targetPlatform ? styles.actionBtnDisabled : {}), marginTop: 'var(--space-5)' }} onClick={() => setCurrentStep(2)} disabled={!sourcePlatform || !targetPlatform}>
        <Zap size={20} /> 下一步
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContent}>
      <div style={styles.infoBox}>
        <div style={styles.infoContent}>
          在 <strong>{sourcePlatform?.name}</strong> 中复制你的配置数据（JSON 格式），粘贴到下方。你可以从设置页面、导出功能或直接问 AI 获取配置。
        </div>
      </div>

      <div style={styles.warningBox}>
        <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        <div style={styles.warningContent}>API Key、密码等敏感信息请用 <code>***</code> 替换</div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>粘贴配置数据</div>
        <button onClick={() => sourcePlatform && setJsonData(getSampleExportJson(sourcePlatform.id))} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', cursor: 'pointer' }}>
          加载示例
        </button>
      </div>
      <textarea style={styles.textarea} placeholder='在此粘贴配置数据（JSON 格式）...' value={jsonData} onChange={e => setJsonData(e.target.value)} />

      {error && (
        <div style={styles.warningBox}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', lineHeight: 1.6 }}>{error}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <button style={{ ...styles.actionBtn, flex: 1, background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => setCurrentStep(1)}>返回</button>
        <button style={{ ...styles.actionBtn, flex: 1, ...(!jsonData.trim() || isConverting ? styles.actionBtnDisabled : {}) }} onClick={handleConvert} disabled={!jsonData.trim() || isConverting}>
          {isConverting ? <><RefreshCw size={18} className="animate-spin" /> 转换中...</> : <>转换配置 <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );

  const renderCollapsibleSection = (key: string, title: string, content: string, defaultOpen = false) => {
    const isOpen = expandedSections[key] ?? defaultOpen;
    return (
      <div style={styles.resultSection} key={key}>
        <div style={styles.collapsibleHeader} onClick={() => toggleSection(key)}>
          <span style={styles.resultTitle}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button style={{ ...styles.copyBtn, ...(copiedSection === key ? styles.copyBtnCopied : {}) }} onClick={e => { e.stopPropagation(); handleCopy(key, content); }}>
              {copiedSection === key ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
            </button>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
        {isOpen && <div style={styles.resultBody}>{content}</div>}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!converted || !stats) return null;

    return (
      <div style={styles.stepContent}>
        <div style={styles.infoBox}>
          <div style={styles.infoContent}>
            <strong>{converted.label}</strong> — {converted.description}
          </div>
        </div>

        {/* 统计 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.totalItems}</div><div style={styles.statLabel}>总配置项</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.skills}</div><div style={styles.statLabel}>技能</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.memories}</div><div style={styles.statLabel}>记忆</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.mcpConnections}</div><div style={styles.statLabel}>MCP</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.projects}</div><div style={styles.statLabel}>项目</div></div>
        </div>

        {/* 核心配置 */}
        {renderCollapsibleSection('config', '核心配置（名称/提示词/设置）', JSON.stringify(converted.config, null, 2), true)}

        {/* MCP 服务器 */}
        {converted.mcpServers && converted.mcpServers.length > 0 && renderCollapsibleSection('mcp', `MCP 服务器（${converted.mcpServers.length} 个）`, JSON.stringify(converted.mcpServers, null, 2))}

        {/* 记忆 */}
        {converted.memories && converted.memories.length > 0 && renderCollapsibleSection('memories', `记忆/知识库（${converted.memories.length} 条）`, JSON.stringify(converted.memories, null, 2))}

        {/* 技能 */}
        {converted.skills && converted.skills.length > 0 && renderCollapsibleSection('skills', `技能/插件（${converted.skills.length} 个）`, JSON.stringify(converted.skills, null, 2))}

        {/* 项目 */}
        {converted.projects && converted.projects.length > 0 && renderCollapsibleSection('projects', `项目/工作流（${converted.projects.length} 个）`, JSON.stringify(converted.projects, null, 2))}

        {/* 手动操作步骤 */}
        <div style={styles.resultSection}>
          <div style={{ ...styles.resultHeader, borderBottom: 'none' }}>
            <span style={styles.resultTitle}>需要在 {targetPlatform?.name} 中手动完成的步骤</span>
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            <ol style={styles.manualStepList}>
              {converted.manualSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        </div>

        {stats.sensitiveItems > 0 && (
          <div style={styles.warningBox}>
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <div style={styles.warningContent}>检测到 {stats.sensitiveItems} 个敏感信息已被脱敏，需要在目标平台手动补充</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <button style={{ ...styles.actionBtn, flex: 1, background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => setCurrentStep(2)}>返回修改</button>
          <button style={{ ...styles.actionBtn, flex: 1 }} onClick={() => { setSourcePlatform(null); setTargetPlatform(null); setJsonData(''); setConverted(null); setStats(null); setCurrentStep(1); }}>
            <Check size={18} /> 完成，开始新迁移
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

  const stepNumStyle = (step: number) => ({
    ...styles.stepNumber,
    ...(getStepStatus(step) === 'done' ? styles.stepNumberDone : {}),
    ...(getStepStatus(step) === 'pending' ? styles.stepNumberPending : {}),
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI 配置迁移</h1>
        <p style={styles.subtitle}>粘贴配置，一键转换格式</p>
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={stepNumStyle(1)}>1</div>
          <div style={styles.stepTitle}>选择平台</div>
        </div>
        {currentStep === 1 && renderStep1()}
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={stepNumStyle(2)}>2</div>
          <div style={styles.stepTitle}>粘贴并转换</div>
        </div>
        {currentStep === 2 && renderStep2()}
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={stepNumStyle(3)}>3</div>
          <div style={styles.stepTitle}>转换结果</div>
        </div>
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default MigrationPage;