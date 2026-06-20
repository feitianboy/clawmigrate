import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, CheckCircle, XCircle, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { useAuthStore, useHistoryStore, HistoryRecord } from '../stores';

const platformIcons: Record<string, string> = {
  claude: '🧠',
  kimi: '🌙',
  openclaw: '🐾',
};

const platformNames: Record<string, string> = {
  claude: 'Claude',
  kimi: 'Kimi',
  openclaw: 'OpenClaw',
};

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
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-8)',
  },
  statCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 'var(--space-1)',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  filterBar: {
    display: 'flex',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
  },
  filterBtn: {
    padding: 'var(--space-2) var(--space-4)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    background: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: 'white',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  recordCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    transition: 'all 0.2s',
  },
  recordHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-4)',
  },
  recordPlatforms: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  platformBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
  },
  platformIcon: {
    fontSize: '1.25rem',
  },
  platformName: {
    fontWeight: 500,
  },
  arrow: {
    color: 'var(--color-text-muted)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  statusSuccess: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: 'var(--color-success)',
  },
  statusFailed: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--color-danger)',
  },
  statusPending: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-warning)',
  },
  statusInProgress: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--color-primary)',
  },
  recordMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  recordCategories: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  categoryTag: {
    padding: '2px 8px',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
  },
  recordActions: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  actionBtn: {
    padding: 'var(--space-2)',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-12)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-lg)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: 'var(--space-4)',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  emptyDesc: {
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-6)',
  },
  emptyBtn: {
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
    textDecoration: 'none',
  },
  loginPrompt: {
    textAlign: 'center',
    padding: 'var(--space-12)',
    background: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-lg)',
  },
  loginIcon: {
    fontSize: '4rem',
    marginBottom: 'var(--space-4)',
  },
  loginTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  loginDesc: {
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-6)',
  },
  loginBtn: {
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
    textDecoration: 'none',
  },
  loadingState: {
    textAlign: 'center',
    padding: 'var(--space-12)',
    color: 'var(--color-text-secondary)',
  },
  errorState: {
    textAlign: 'center',
    padding: 'var(--space-12)',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--color-danger)',
  },
};

const categoryLabels: Record<string, string> = {
  skills: '技能/插件',
  automations: '自动化',
  mcp_connections: 'MCP连接',
  memories: '记忆',
  settings: '设置',
  prompts: '提示词',
  knowledge_bases: '知识库',
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDuration = (start: string, end?: string) => {
  if (!end) return '进行中';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
};

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { records, isLoading, error, fetchHistory } = useHistoryStore();
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setAuthChecked(true);
    };
    initAuth();
  }, [checkAuth]);

  // Fetch history when authenticated
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchHistory();
    }
  }, [authChecked, isAuthenticated, fetchHistory]);

  // Redirect to login if not authenticated after auth check
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate]);

  const filteredRecords = records.filter((record: HistoryRecord) => {
    if (filter === 'all') return true;
    if (filter === 'success') return record.status === 'completed';
    if (filter === 'failed') return record.status === 'failed';
    if (filter === 'pending') return record.status === 'pending' || record.status === 'in_progress';
    return true;
  });

  const stats = {
    total: records.length,
    success: records.filter((r: HistoryRecord) => r.status === 'completed').length,
    failed: records.filter((r: HistoryRecord) => r.status === 'failed').length,
  };

  const getStatusBadge = (status: HistoryRecord['status']) => {
    const configs: Record<HistoryRecord['status'], { icon: React.ReactNode; label: string; style: React.CSSProperties }> = {
      completed: { icon: <CheckCircle size={12} />, label: '成功', style: styles.statusSuccess },
      failed: { icon: <XCircle size={12} />, label: '失败', style: styles.statusFailed },
      pending: { icon: <Clock size={12} />, label: '待处理', style: styles.statusPending },
      in_progress: { icon: <Clock size={12} />, label: '进行中', style: styles.statusInProgress },
    };
    const config = configs[status] || configs.pending;
    return (
      <span style={{ ...styles.statusBadge, ...config.style }}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Loading state
  if (!authChecked || isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>迁移历史</h1>
          <p style={styles.subtitle}>查看你所有的迁移记录</p>
        </div>
        <div style={styles.loadingState}>加载中...</div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>迁移历史</h1>
          <p style={styles.subtitle}>查看你所有的迁移记录</p>
        </div>
        <div style={styles.loginPrompt}>
          <div style={styles.loginIcon}>🔐</div>
          <h3 style={styles.loginTitle}>登录后查看历史记录</h3>
          <p style={styles.loginDesc}>登录账户以查看和管理你的迁移历史</p>
          <button style={styles.loginBtn} onClick={() => navigate('/login')}>
            前往登录
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>迁移历史</h1>
          <p style={styles.subtitle}>查看你所有的迁移记录</p>
        </div>
        <div style={styles.errorState}>
          <p>{error}</p>
          <button style={styles.loginBtn} onClick={fetchHistory}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>迁移历史</h1>
        <p style={styles.subtitle}>查看你所有的迁移记录</p>
      </div>

      <div className="stats-bar" style={styles.statsBar}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: 'var(--color-primary)' }}>{stats.total}</div>
          <div style={styles.statLabel}>总迁移次数</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: 'var(--color-success)' }}>{stats.success}</div>
          <div style={styles.statLabel}>成功</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: 'var(--color-danger)' }}>{stats.failed}</div>
          <div style={styles.statLabel}>失败</div>
        </div>
      </div>

      <div className="filter-bar" style={styles.filterBar}>
        {(['all', 'success', 'failed', 'pending'] as const).map((f) => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'success' ? '成功' : f === 'failed' ? '失败' : '进行中'}
          </button>
        ))}
      </div>

      {filteredRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>暂无迁移记录</h3>
          <p style={styles.emptyDesc}>开始你的第一次迁移吧</p>
          <button style={styles.emptyBtn} onClick={() => navigate('/migrate')}>
            <ArrowRightLeft size={18} />
            开始迁移
          </button>
        </div>
      ) : (
        <div style={styles.recordsList}>
          {filteredRecords.map((record: HistoryRecord) => (
            <div key={record.id} style={styles.recordCard}>
              <div className="record-header" style={styles.recordHeader}>
                <div className="record-platforms" style={styles.recordPlatforms}>
                  <span style={styles.platformBadge}>
                    <span style={styles.platformIcon}>{platformIcons[record.source_platform] || '🤖'}</span>
                    <span style={styles.platformName}>{platformNames[record.source_platform] || record.source_platform}</span>
                  </span>
                  <ArrowRightLeft size={16} style={styles.arrow} />
                  <span style={styles.platformBadge}>
                    <span style={styles.platformIcon}>{platformIcons[record.target_platform] || '🤖'}</span>
                    <span style={styles.platformName}>{platformNames[record.target_platform] || record.target_platform}</span>
                  </span>
                </div>
                {getStatusBadge(record.status)}
              </div>

              <div className="record-meta" style={styles.recordMeta}>
                <span>📅 {formatDate(record.created_at)}</span>
                <span>⏱️ {getDuration(record.created_at, record.updated_at)}</span>
                <span>📦 {record.items_count} 项</span>
                <div style={styles.recordCategories}>
                  {(record.categories || []).map((cat: string) => (
                    <span key={cat} style={styles.categoryTag}>
                      {categoryLabels[cat] || cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
