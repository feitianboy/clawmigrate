import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import {
  Users,
  ArrowRightLeft,
  Eye,
  UserCheck,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// 图表颜色 - 暖色系
const CHART_COLORS = {
  primary: '#f97316', // 橙色
  secondary: '#fbbf24', // 浅黄色
  accent: '#a78bfa', // 浅紫色
  success: '#34d399', // 绿色
  warning: '#fb923c', // 橙黄色
  info: '#60a5fa', // 蓝色
  pink: '#f472b6', // 粉色
  cyan: '#22d3ee', // 青色
};

// 平台图标映射
const platformIcons: Record<string, string> = {
  coze: '🤖',
  claude: '🧠',
  kimi: '🌙',
  openclaw: '🦞',
  cursor: '📝',
  wind: '🌬️',
};

// 平台名称映射
const platformNames: Record<string, string> = {
  coze: 'Coze',
  claude: 'Claude',
  kimi: 'Kimi',
  openclaw: 'OpenClaw',
  cursor: 'Cursor',
  wind: 'Wind',
};

// 会员等级名称映射
const tierNames: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  };

// 样式定义
const styles: Record<string, React.CSSProperties> = {
  // 密码输入页面
  passwordContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-6)',
    background: 'var(--color-bg)',
  },
  passwordCard: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  passwordIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto var(--space-5)',
    background: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary)',
  },
  passwordTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: 'var(--space-2)',
  },
  passwordSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    marginBottom: 'var(--space-6)',
  },
  passwordInput: {
    width: '100%',
    padding: 'var(--space-4)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '1rem',
    textAlign: 'center',
    marginBottom: 'var(--space-4)',
  },
  passwordBtn: {
    width: '100%',
    padding: 'var(--space-4)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
  },
  passwordError: {
    marginTop: 'var(--space-4)',
    padding: 'var(--space-3)',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
    fontSize: '0.875rem',
  },
  
  // 主内容
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: 'var(--space-6)',
  },
  header: {
    marginBottom: 'var(--space-8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: 'var(--space-1)',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '1rem',
  },
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'rgba(249, 115, 22, 0.15)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // 统计卡片网格
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-4)',
    marginBottom: 'var(--space-6)',
  },
  statCard: {
    padding: 'var(--space-5)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: 'var(--space-1)',
  },
  statLabel: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },

  // 图表区域
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 'var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  chartCard: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-5)',
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 'var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  chartContainer: {
    height: '280px',
  },

  // 标签页
  tabs: {
    display: 'flex',
    gap: 'var(--space-1)',
    padding: 'var(--space-1)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-6)',
  },
  tab: {
    padding: 'var(--space-3) var(--space-5)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  tabActive: {
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
    boxShadow: 'var(--shadow-sm)',
  },

  // 表格卡片
  card: {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    marginBottom: 'var(--space-6)',
  },
  cardHeader: {
    padding: 'var(--space-5) var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: 'var(--color-bg)',
  },
  th: {
    padding: 'var(--space-3) var(--space-4)',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9375rem',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 500,
  },
  userEmail: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  roleAdmin: {
    background: 'rgba(249, 115, 22, 0.15)',
    color: 'var(--color-primary)',
  },
  roleUser: {
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
  },
  tierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  tierFree: {
    background: 'rgba(96, 165, 250, 0.15)',
    color: 'var(--color-info)',
  },
  tierPro: {
    background: 'rgba(249, 115, 22, 0.15)',
    color: 'var(--color-primary)',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  statusSuccess: {
    background: 'rgba(52, 211, 153, 0.15)',
    color: 'var(--color-success)',
  },
  statusFailed: {
    background: 'rgba(248, 113, 113, 0.15)',
    color: '#f87171',
  },
  statusPending: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: 'var(--color-warning)',
  },
  actionBtn: {
    padding: 'var(--space-2)',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCell: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-10)',
    color: 'var(--color-text-secondary)',
  },

  // 分页
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4) var(--space-6)',
    borderTop: '1px solid var(--color-border)',
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  paginationBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  pageBtn: {
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // 迁移路径
  migrationPath: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
};

// 辅助函数
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

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
};

const getInitials = (name: string) => {
  return name.charAt(0).toUpperCase();
};

// 密码输入页面组件
const PasswordPage: React.FC<{
  onSuccess: () => void;
  verifyAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}> = ({ onSuccess, verifyAdmin, isLoading }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入管理密码');
      return;
    }

    setError('');

    const result = await verifyAdmin(password);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || '密码验证失败');
    }
  };

  return (
    <div style={styles.passwordContainer}>
      <div style={styles.passwordCard}>
        <div style={styles.passwordIcon}>
          <Lock size={32} />
        </div>
        <h1 style={styles.passwordTitle}>管理后台</h1>
        <p style={styles.passwordSubtitle}>请输入管理密码以继续</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="输入管理密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.passwordInput}
            disabled={isLoading}
          />
          
          <button
            type="submit"
            style={{
              ...styles.passwordBtn,
              opacity: isLoading ? 0.7 : 1,
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                验证中...
              </>
            ) : (
              <>
                <Shield size={18} />
                进入后台
              </>
            )}
          </button>
        </form>

        {error && <div style={styles.passwordError}>{error}</div>}
        
        <div style={{ marginTop: 'var(--space-6)' }}>
          <a
            href="/"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
  valueColor?: string;
}> = ({ icon, iconBg, iconColor, value, label, valueColor }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statIcon, background: iconBg, color: iconColor }}>
      {icon}
    </div>
    <div style={styles.statContent}>
      <div style={{ ...styles.statValue, color: valueColor || 'var(--color-text)' }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

// 平台分布饼图
const PlatformPieChart: React.FC<{
  data: { platform: string; count: number }[];
}> = ({ data }) => {
  const COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.accent,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.info,
  ];

  const chartData = data.map((item) => ({
    name: platformNames[item.platform] || item.platform,
    value: item.count,
  }));

  if (chartData.length === 0) {
    return (
      <div style={{ ...styles.chartCard, height: '100%' }}>
        <h3 style={styles.chartTitle}>
          <PieChart size={18} />
          平台分布
        </h3>
        <div style={{ ...styles.chartContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.chartCard}>
      <h3 style={styles.chartTitle}>
        <PieChart size={18} />
        平台分布
      </h3>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 会员分布饼图
const TierPieChart: React.FC<{
  data: { tier: string; count: number }[];
}> = ({ data }) => {
  const COLORS = [
    CHART_COLORS.info,
    CHART_COLORS.primary,
    CHART_COLORS.accent,
  ];

  const chartData = data.map((item) => ({
    name: tierNames[item.tier] || item.tier,
    value: item.count,
  }));

  if (chartData.length === 0) {
    return (
      <div style={{ ...styles.chartCard, height: '100%' }}>
        <h3 style={styles.chartTitle}>
          <Users size={18} />
          会员分布
        </h3>
        <div style={{ ...styles.chartContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.chartCard}>
      <h3 style={styles.chartTitle}>
        <Users size={18} />
        会员分布
      </h3>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 迁移趋势折线图（真实数据）
const MigrationTrendChart: React.FC = () => {
  const [data, setData] = useState<{date: string; migrations: number; success: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await fetch('/api/admin/trend?days=7', {
          headers: { 'x-admin-password': localStorage.getItem('clawmigrate_admin_pwd') || '' }
        });
        const result = await res.json();
        if (result.ok && result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error('获取趋势数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, []);

  return (
    <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
      <h3 style={styles.chartTitle}>
        <TrendingUp size={18} />
        迁移趋势（近7天）
      </h3>
      <div style={{ ...styles.chartContainer, height: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              stroke="var(--color-text-secondary)"
              fontSize={12}
            />
            <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="migrations"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, r: 4 }}
              name="总迁移"
            />
            <Line
              type="monotone"
              dataKey="success"
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.success, r: 4 }}
              name="成功"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 状态徽章组件
const StatusBadge: React.FC<{ status: 'success' | 'failed' | 'pending' }> = ({ status }) => {
  const configs: Record<string, { icon: React.ReactNode; label: string; style: React.CSSProperties }> = {
    success: { icon: <CheckCircle size={12} />, label: '成功', style: styles.statusSuccess },
    failed: { icon: <XCircle size={12} />, label: '失败', style: styles.statusFailed },
    pending: { icon: <Clock size={12} />, label: '进行中', style: styles.statusPending },
  };
  const config = configs[status];
  return (
    <span style={{ ...styles.statusBadge, ...config.style }}>
      {config.icon}
      {config.label}
    </span>
  );
};

// 会员等级徽章
const TierBadge: React.FC<{ tier?: string }> = ({ tier }) => {
  if (!tier) return null;
  
  const configs: Record<string, { label: string; style: React.CSSProperties }> = {
    free: { label: '免费', style: styles.tierFree },
    pro: { label: '专业', style: styles.tierPro },
      };
  const config = configs[tier] || { label: tier, style: {} };
  
  return (
    <span style={{ ...styles.tierBadge, ...config.style }}>
      {config.label}
    </span>
  );
};

// 主组件
export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'migrations'>('users');
  
  const {
    adminToken,
    verifyAdmin,
    stats,
    users,
    usersTotal,
    usersPage,
    usersLimit,
    migrationRecords,
    isLoading,
    error,
    fetchDashboard,
    fetchUsers,
    fetchMigrationRecords,
    deleteUser,
    clearError,
  } = useAdminStore();

  // 检查是否已有 admin token
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setIsAuthenticated(true);
    }
  }, []);

  // 加载数据
  const loadData = useCallback(() => {
    if (isAuthenticated) {
      fetchDashboard();
      fetchUsers(usersPage, usersLimit);
      fetchMigrationRecords();
    }
  }, [isAuthenticated, fetchDashboard, fetchUsers, fetchMigrationRecords, usersPage, usersLimit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理删除用户
  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) {
      await deleteUser(userId);
    }
  };

  // 处理刷新
  const handleRefresh = () => {
    loadData();
  };

  // 分页
  const handlePrevPage = () => {
    if (usersPage > 1) {
      fetchUsers(usersPage - 1, usersLimit);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(usersTotal / usersLimit);
    if (usersPage < totalPages) {
      fetchUsers(usersPage + 1, usersLimit);
    }
  };

  const totalPages = Math.ceil(usersTotal / usersLimit);

  // 认证成功回调
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    loadData();
  };

  // 未认证显示密码输入页面
  if (!isAuthenticated) {
    return <PasswordPage onSuccess={handleAuthSuccess} verifyAdmin={verifyAdmin} isLoading={isLoading} />;
  }

  return (
    <div style={styles.container}>
      {/* 错误提示 */}
      {error && (
        <div
          style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 'var(--space-2)',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 头部 */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div>
            <h1 style={styles.title}>数据看板</h1>
            <p style={styles.subtitle}>业务数据概览</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={styles.adminBadge}>
            <Shield size={14} />
            管理员
          </span>
          <button
            style={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-bar" style={styles.statsGrid}>
        <StatCard
          icon={<Users size={22} />}
          iconBg="rgba(249, 115, 22, 0.15)"
          iconColor={CHART_COLORS.primary}
          value={stats.totalUsers}
          label="总用户数"
        />
        <StatCard
          icon={<ArrowRightLeft size={22} />}
          iconBg="rgba(52, 211, 153, 0.15)"
          iconColor={CHART_COLORS.success}
          value={stats.completedMigrations}
          label="成功迁移"
        />
        <StatCard
          icon={<XCircle size={22} />}
          iconBg="rgba(248, 113, 113, 0.15)"
          iconColor="#f87171"
          value={stats.failedMigrations}
          label="失败迁移"
        />
        <StatCard
          icon={<UserCheck size={22} />}
          iconBg="rgba(167, 139, 250, 0.15)"
          iconColor={CHART_COLORS.accent}
          value={stats.paidUsers}
          label="付费用户"
        />
        <StatCard
          icon={<Eye size={22} />}
          iconBg="rgba(96, 165, 250, 0.15)"
          iconColor={CHART_COLORS.info}
          value={stats.todayPV}
          label="今日 PV"
        />
        <StatCard
          icon={<Activity size={22} />}
          iconBg="rgba(251, 191, 36, 0.15)"
          iconColor={CHART_COLORS.secondary}
          value={stats.todayUV}
          label="今日 UV"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          iconBg="rgba(34, 197, 94, 0.15)"
          iconColor={CHART_COLORS.success}
          value={`${stats.conversionRate}%`}
          label="转化率"
        />
        <StatCard
          icon={<DollarSign size={22} />}
          iconBg="rgba(249, 115, 22, 0.15)"
          iconColor={CHART_COLORS.primary}
          value={stats.monthlyRevenue}
          label="本月收入"
        />
      </div>

      {/* 图表区域 */}
      <div style={styles.chartsGrid}>
        <PlatformPieChart data={stats.platformDistribution} />
        <TierPieChart data={stats.tierDistribution} />
        <MigrationTrendChart />
      </div>

      {/* 标签页切换 */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'users' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          用户管理
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'migrations' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('migrations')}
        >
          <ArrowRightLeft size={16} />
          迁移记录
        </button>
      </div>

      {/* 用户管理表格 */}
      {activeTab === 'users' && (
        <div style={styles.card}>
          <div className="card-header" style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>用户列表</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              共 {usersTotal} 个用户
            </span>
          </div>
          
          {users.length === 0 && !isLoading ? (
            <div style={styles.emptyState}>暂无用户数据</div>
          ) : (
            <>
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>用户</th>
                    <th style={styles.th}>角色</th>
                    <th style={styles.th}>会员等级</th>
                    <th style={styles.th}>注册时间</th>
                    <th style={styles.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={styles.avatar}>{getInitials(u.username)}</div>
                          <div style={styles.userInfo}>
                            <span style={styles.userName}>{u.username}</span>
                            <span style={styles.userEmail}>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.roleBadge, ...(u.role === 'admin' ? styles.roleAdmin : styles.roleUser) }}>
                          {u.role === 'admin' && <Shield size={10} />}
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <TierBadge tier={u.tier} />
                      </td>
                      <td style={{ ...styles.td, ...styles.dateCell }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title="删除用户"
                          disabled={u.role === 'admin'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 分页 */}
              <div style={styles.pagination}>
                <span style={styles.paginationInfo}>
                  第 {usersPage} / {totalPages || 1} 页，共 {usersTotal} 条
                </span>
                <div style={styles.paginationBtns}>
                  <button
                    style={{
                      ...styles.pageBtn,
                      ...(usersPage <= 1 ? styles.pageBtnDisabled : {}),
                    }}
                    onClick={handlePrevPage}
                    disabled={usersPage <= 1}
                  >
                    <ChevronLeft size={16} />
                    上一页
                  </button>
                  <button
                    style={{
                      ...styles.pageBtn,
                      ...(usersPage >= totalPages ? styles.pageBtnDisabled : {}),
                    }}
                    onClick={handleNextPage}
                    disabled={usersPage >= totalPages}
                  >
                    下一页
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 迁移记录表格 */}
      {activeTab === 'migrations' && (
        <div style={styles.card}>
          <div className="card-header" style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>迁移记录</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              共 {migrationRecords.length} 条记录
            </span>
          </div>
          
          {migrationRecords.length === 0 && !isLoading ? (
            <div style={styles.emptyState}>暂无迁移记录</div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>用户</th>
                  <th style={styles.th}>迁移路径</th>
                  <th style={styles.th}>状态</th>
                  <th style={styles.th}>配置项</th>
                  <th style={styles.th}>时间</th>
                </tr>
              </thead>
              <tbody>
                {migrationRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={styles.td}>
                      {record.username || '未知用户'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.migrationPath}>
                        <span>{platformIcons[record.source_platform] || '📦'}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>→</span>
                        <span>{platformIcons[record.target_platform] || '📦'}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'var(--space-1)' }}>
                          {platformNames[record.source_platform]} → {platformNames[record.target_platform]}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <StatusBadge status={record.status} />
                    </td>
                    <td style={styles.td}>
                      {record.categories.length} 项
                    </td>
                    <td style={{ ...styles.td, ...styles.dateCell }}>
                      {formatDate(record.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
