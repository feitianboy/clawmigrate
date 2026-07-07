import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { registry } from '../adapters';
import { PlatformAdapter } from '../adapters/core/types';
import { convertConfig, generateImportPrompt, ConvertedResult, ConvertStats } from '../utils/migrateConvert';
import {
  Copy,
  Check,
  ArrowRight,
  Zap,
  AlertTriangle,
  Info,
  Shield,
  Lock,
  Eye,
  EyeOff,
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
  header: { textAlign: 'center', marginBottom: 'var(--space-8)' },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 'var(--space-2)',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-warning))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: { fontSize: '1.125rem', color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto' },
  securityBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-6)',
  },
  securityText: {
    fontSize: '0.875rem',
    color: 'var(--color-success)',
    fontWeight: 500,
  },
  stepCard: { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-6)' },
  stepHeader: { padding: 'var(--space-5)', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
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
  platformGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' },
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
  promptBox: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 'var(--space-4)',
  },
  promptHeader: { padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  promptTitle: { fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' },
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' },
  statCard: { padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' },
  statValue: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--color-text-secondary)' },
  sensitiveToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4)',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
  },
  toggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
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
  const [error, setError] = useState<string | null>(null);
  const [converted, setConverted] = useState<ConvertedResult | null>(null);
  const [stats, setStats] = useState<ConvertStats | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ config: true });

  const allAdapters = registry.getAll();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const generateExportPrompt = () => {
    if (!sourcePlatform || !targetPlatform) return '';
    return `帮我把配置迁移到 ${targetPlatform.name}。

请用 JSON 返回以下内容：
- skills: 技能/插件列表（名称、描述、配置）
- memories: 记忆/知识库
- mcp_connections: MCP 服务器配置（名称、URL、API Key）
- settings: 系统设置（模型、温度、系统提示词）
- projects: 项目/工作流

要求：
- 完整的 API Key 和密码请保留（本地转换，不上传服务器）
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

  const handleConvert = () => {
    if (!jsonData.trim()) { setError('请粘贴 JSON 数据'); return; }
    setError(null);

    try {
      const result = convertConfig(sourcePlatform!.id, targetPlatform!.id, jsonData);
      setConverted(result.converted);
      setStats(result.stats);

      const prompt = generateImportPrompt(result.converted, targetPlatform!.name);
      setImportPrompt(prompt);

      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || '转换失败');
    }
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(generateExportPrompt());
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const handleCopyImport = () => {
    navigator.clipboard.writeText(importPrompt);
    setImportCopied(true);
    setTimeout(() => setImportCopied(false), 2000);
  };

  const handleCopySection = (section: string, content: string) => {
    navigator.clipboard.writeText(content);
    setImportCopied(true);
    setTimeout(() => setImportCopied(false), 2000);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'done';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  const maskSensitive = (text: string): string => {
    if (showSensitive) return text;
    return text.replace(/(sk-[a-zA-Z0-9]{10,})/g, 'sk-****')
      .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)([a-zA-Z0-9]{10,})/gi, '$1****')
      .replace(/(password["']?\s*[:=]\s*["']?)([^"'\s]+)/gi, '$1****')
      .replace(/(token["']?\s*[:=]\s*["']?)([a-zA-Z0-9]{10,})/gi, '$1****');
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
          <strong>第一步：复制提示词</strong><br />
          复制下方提示词，打开 <strong>{sourcePlatform?.name}</strong> 粘贴发送，获取 JSON 数据。
        </div>
      </div>

      <div style={styles.promptBox}>
        <div style={styles.promptHeader}>
          <span style={styles.promptTitle}>导出提示词</span>
          <button style={{ ...styles.copyBtn, ...(exportCopied ? styles.copyBtnCopied : {}) }} onClick={handleCopyExport}>
            {exportCopied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
          </button>
        </div>
        <div style={styles.promptContent}>{generateExportPrompt()}</div>
      </div>

      <div style={styles.infoBox}>
        <div style={styles.infoContent}>
          <strong>第二步：粘贴数据</strong><br />
          把 AI 返回的 JSON 数据粘贴到下方。数据仅在你本地浏览器转换，不会上传到服务器。
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>粘贴 JSON 数据</div>
        <button onClick={() => sourcePlatform && setJsonData(getSampleExportJson(sourcePlatform.id))} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', cursor: 'pointer' }}>
          加载示例
        </button>
      </div>
      <textarea style={styles.textarea} placeholder='在此粘贴从源平台获取的 JSON 数据...' value={jsonData} onChange={e => setJsonData(e.target.value)} />

      {error && (
        <div style={styles.warningBox}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', lineHeight: 1.6 }}>{error}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <button style={{ ...styles.actionBtn, flex: 1, background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => setCurrentStep(1)}>返回</button>
        <button style={{ ...styles.actionBtn, flex: 1, ...(!jsonData.trim() ? styles.actionBtnDisabled : {}) }} onClick={handleConvert} disabled={!jsonData.trim()}>
          <>本地转换并生成导入提示词 <ArrowRight size={18} /></>
        </button>
      </div>
    </div>
  );

  const renderCollapsibleSection = (key: string, title: string, content: string, defaultOpen = false) => {
    const isOpen = expandedSections[key] ?? defaultOpen;
    const maskedContent = maskSensitive(content);
    return (
      <div style={styles.promptBox} key={key}>
        <div style={styles.sectionHeader} onClick={() => toggleSection(key)}>
          <span style={styles.promptTitle}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button style={{ ...styles.copyBtn, ...(importCopied ? styles.copyBtnCopied : {}) }} onClick={e => { e.stopPropagation(); handleCopySection(key, content); }}>
              {importCopied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
            </button>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
        {isOpen && <div style={styles.promptContent}>{maskedContent}</div>}
      </div>
    );
  };

  const renderStep3 = () => (
    <div style={styles.stepContent}>
      <div style={styles.infoBox}>
        <div style={styles.infoContent}>
          <strong>第三步：复制导入提示词</strong><br />
          打开 <strong>{targetPlatform?.name}</strong>，粘贴发送，AI 会自动帮你创建配置。
        </div>
      </div>

      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.totalItems}</div><div style={styles.statLabel}>总配置项</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.skills}</div><div style={styles.statLabel}>技能</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.memories}</div><div style={styles.statLabel}>记忆</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.mcpConnections}</div><div style={styles.statLabel}>MCP</div></div>
          <div style={styles.statCard}><div style={styles.statValue}>{stats.projects}</div><div style={styles.statLabel}>项目</div></div>
        </div>
      )}

      {stats && stats.sensitiveItems > 0 && (
        <div style={styles.sensitiveToggle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Lock size={18} style={{ color: 'var(--color-warning)' }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>检测到 {stats.sensitiveItems} 个敏感配置</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>包含 API Key 等敏感信息，请确认目标平台可信</div>
            </div>
          </div>
          <button style={{ ...styles.toggleBtn, ...(showSensitive ? styles.toggleBtnActive : {}) }} onClick={() => setShowSensitive(!showSensitive)}>
            {showSensitive ? <><EyeOff size={14} /> 隐藏</> : <><Eye size={14} /> 显示</>}
          </button>
        </div>
      )}

      {/* 完整导入提示词 */}
      <div style={styles.promptBox}>
        <div style={styles.promptHeader}>
          <span style={styles.promptTitle}>完整导入提示词</span>
          <button style={{ ...styles.copyBtn, ...(importCopied ? styles.copyBtnCopied : {}) }} onClick={handleCopyImport}>
            {importCopied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制全部</>}
          </button>
        </div>
        <div style={styles.promptContent}>{maskSensitive(importPrompt)}</div>
      </div>

      {/* 分块复制 */}
      {converted && (
        <>
          {renderCollapsibleSection('systemPrompt', '系统提示词', converted.config.systemPrompt || converted.config.gem?.instructions || '', true)}
          {converted.mcpServers && converted.mcpServers.length > 0 && renderCollapsibleSection('mcp', `MCP 服务器（${converted.mcpServers.length} 个）`, JSON.stringify(converted.mcpServers, null, 2))}
          {converted.skills && converted.skills.length > 0 && renderCollapsibleSection('skills', `技能/插件（${converted.skills.length} 个）`, JSON.stringify(converted.skills, null, 2))}
          {converted.memories && converted.memories.length > 0 && renderCollapsibleSection('memories', `记忆/知识库（${converted.memories.length} 条）`, JSON.stringify(converted.memories, null, 2))}
          {converted.projects && converted.projects.length > 0 && renderCollapsibleSection('projects', `项目/工作流（${converted.projects.length} 个）`, JSON.stringify(converted.projects, null, 2))}
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <button style={{ ...styles.actionBtn, flex: 1, background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => setCurrentStep(2)}>返回修改</button>
        <button style={{ ...styles.actionBtn, flex: 1 }} onClick={() => { setSourcePlatform(null); setTargetPlatform(null); setJsonData(''); setImportPrompt(''); setConverted(null); setStats(null); setCurrentStep(1); }}>
          <Check size={18} /> 完成，开始新迁移
        </button>
      </div>
    </div>
  );

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
        <p style={styles.subtitle}>复制粘贴两次，完成跨平台迁移</p>
      </div>

      {/* 安全承诺横幅 */}
      <div style={styles.securityBanner}>
        <Shield size={20} style={{ color: 'var(--color-success)' }} />
        <span style={styles.securityText}>
          所有数据仅在你本地浏览器转换，<strong>不会上传到任何服务器</strong>，100% 私密安全
        </span>
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
          <div style={styles.stepTitle}>获取配置数据</div>
        </div>
        {currentStep === 2 && renderStep2()}
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <div style={stepNumStyle(3)}>3</div>
          <div style={styles.stepTitle}>导入目标平台</div>
        </div>
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default MigrationPage;