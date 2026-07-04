import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import {
  LayoutDashboard, Users, ArrowRightLeft, ShoppingCart, TrendingUp,
  Trash2, RefreshCw, CheckCircle, XCircle, Clock, Shield, Lock,
  ChevronLeft, ChevronRight, DollarSign, UserCheck, Eye, Activity,
  PieChart as PieChartIcon, Search, ArrowLeft, Crown, CreditCard, UserPlus,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ---- 常量 ----
const CHART_COLORS = {
  primary: '#f97316', secondary: '#fbbf24', accent: '#a78bfa',
  success: '#34d399', warning: '#fb923c', info: '#60a5fa',
  pink: '#f472b6', cyan: '#22d3ee',
};

const PIE_COLORS = [
  CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent,
  CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.info,
  CHART_COLORS.pink, CHART_COLORS.cyan,
];

const platformIcons: Record<string, string> = {
  claude: '🧠', kimi: '🌙', openclaw: '🦞', qclaw: '🤖', workbuddy: '💼',
  maxclaw: '🚀', duclaw: '🎭', autoclaw: '⚡', arkclaw: '🦅', claw360: '🌐', easyclaw: '✨',
};

const platformNames: Record<string, string> = {
  claude: 'Claude', kimi: 'Kimi', openclaw: 'OpenClaw', qclaw: 'QClaw', workbuddy: 'WorkBuddy',
  maxclaw: 'MaxClaw', duclaw: 'DuClaw', autoclaw: 'AutoClaw', arkclaw: 'ArkClaw', claw360: 'Claw360', easyclaw: 'EasyClaw',
};

const tierNames: Record<string, string> = { free: '免费版', pro: '专业版' };
const planNames: Record<string, string> = { pro_monthly: 'Pro月费', pro_yearly: 'Pro年费' };
const statusNames: Record<string, string> = { pending: '待支付', paid: '已支付', cancelled: '已取消', refunded: '已退款' };

type Page = 'dashboard' | 'users' | 'migrations' | 'orders' | 'revenue';

const formatDate = (s: string) => new Date(s).toLocaleDateString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
const formatNumber = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString();
const formatMoney = (n: number) => `¥${n.toLocaleString()}`;
const getInitials = (name: string) => name.charAt(0).toUpperCase();

// ---- 样式 ----
const S: Record<string, React.CSSProperties> = {
  root: { display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' },
  sidebar: {
    width: '240px', flexShrink: 0, background: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column',
  },
  sidebarLogo: {
    padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)',
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  },
  sidebarNav: { flex: 1, padding: 'var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 500,
    color: 'var(--color-text-secondary)', transition: 'all 0.15s', border: 'none',
    background: 'transparent', width: '100%', textAlign: 'left',
  },
  navItemActive: { background: 'rgba(249, 115, 22, 0.12)', color: 'var(--color-primary)' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    height: '64px', flexShrink: 0, background: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-border)', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)',
  },
  content: { flex: 1, overflow: 'auto', padding: 'var(--space-6)' },
  card: { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' },
  statCard: { padding: 'var(--space-5)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' },
  chartCard: { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' },
  chartTitle: { fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)' },
  td: { padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', fontSize: '0.875rem', cursor: 'pointer' },
  searchInput: { padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-10)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.875rem', width: '240px' },
  emptyState: { textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-secondary)' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-border)' },
  pageBtn: { padding: 'var(--space-2) var(--space-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' },
  // 抽屉
  drawer: { position: 'fixed', top: 0, right: 0, width: '560px', maxWidth: '90vw', height: '100vh', background: 'var(--color-bg-secondary)', borderLeft: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', zIndex: 100, overflow: 'auto', padding: 'var(--space-6)' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 },
};

// ---- 通用组件 ----
const StatCard: React.FC<{ icon: React.ReactNode; bg: string; color: string; value: number | string; label: string; }> = ({ icon, bg, color, value, label }) => (
  <div style={S.statCard}>
    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '1.375rem', fontWeight: 700 }}>{typeof value === 'number' ? formatNumber(value) : value}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { icon: React.ReactNode; label: string; bg: string; color: string }> = {
    completed: { icon: <CheckCircle size={12} />, label: '成功', bg: 'rgba(52,211,153,0.15)', color: 'var(--color-success)' },
    paid: { icon: <CheckCircle size={12} />, label: '已支付', bg: 'rgba(52,211,153,0.15)', color: 'var(--color-success)' },
    success: { icon: <CheckCircle size={12} />, label: '成功', bg: 'rgba(52,211,153,0.15)', color: 'var(--color-success)' },
    failed: { icon: <XCircle size={12} />, label: '失败', bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    cancelled: { icon: <XCircle size={12} />, label: '已取消', bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    in_progress: { icon: <Clock size={12} />, label: '进行中', bg: 'rgba(251,191,36,0.15)', color: 'var(--color-warning)' },
    pending: { icon: <Clock size={12} />, label: '待支付', bg: 'rgba(251,191,36,0.15)', color: 'var(--color-warning)' },
    refunded: { icon: <Clock size={12} />, label: '已退款', bg: 'rgba(96,165,250,0.15)', color: 'var(--color-info)' },
  };
  const c = map[status] || { icon: null, label: status, bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' };
  return <span style={{ ...S.badge, background: c.bg, color: c.color }}>{c.icon}{c.label}</span>;
};

const TierBadge: React.FC<{ tier?: string }> = ({ tier }) => {
  if (!tier) return null;
  const isPro = tier === 'pro';
  return <span style={{ ...S.badge, background: isPro ? 'rgba(249,115,22,0.15)' : 'rgba(96,165,250,0.15)', color: isPro ? 'var(--color-primary)' : 'var(--color-info)' }}>{isPro && <Crown size={10} />}{tierNames[tier] || tier}</span>;
};

const ChartCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; full?: boolean }> = ({ title, icon, children, full }) => (
  <div style={{ ...S.chartCard, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
    <h3 style={S.chartTitle}>{icon}{title}</h3>
    {children}
  </div>
);

const EmptyData: React.FC = () => (
  <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>暂无数据</div>
);

// ---- 密码页 ----
const PasswordPage: React.FC<{
  onSuccess: () => void;
  verifyAdmin: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
  setupAdmin: (u: string, e: string, p: string) => Promise<{ success: boolean; error?: string }>;
  checkSetupStatus: () => Promise<{ hasAdmin: boolean }>;
  isLoading: boolean;
}> = ({ onSuccess, verifyAdmin, setupAdmin, checkSetupStatus, isLoading }) => {
  const [mode, setMode] = useState<'login' | 'setup' | 'loading'>('loading');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkSetupStatus().then(({ hasAdmin }) => {
      setMode(hasAdmin ? 'login' : 'setup');
    });
  }, [checkSetupStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setError('');
    const result = await verifyAdmin(username, password);
    if (result.success) onSuccess();
    else setError(result.error || '登录失败');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) { setError('请填写所有字段'); return; }
    setError('');
    const result = await setupAdmin(username, email, password);
    if (result.success) onSuccess();
    else setError(result.error || '初始化失败');
  };

  if (mode === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const isSetup = mode === 'setup';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', margin: '0 auto var(--space-5)', background: 'rgba(249,115,22,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
          {isSetup ? <UserPlus size={32} /> : <Shield size={32} />}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{isSetup ? '初始化管理员' : '管理后台'}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: 'var(--space-6)' }}>
          {isSetup ? '首次使用，请创建管理员账号' : '请输入管理员账号和密码登录'}
        </p>
        <form onSubmit={isSetup ? handleSetup : handleLogin}>
          <div style={{ marginBottom: 'var(--space-3)', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>管理员账号</label>
            <input type="text" placeholder="输入管理员用户名" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} autoFocus
              style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '1rem' }} />
          </div>
          {isSetup && (
            <div style={{ marginBottom: 'var(--space-3)', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>邮箱</label>
              <input type="email" placeholder="输入邮箱地址" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}
                style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '1rem' }} />
            </div>
          )}
          <div style={{ marginBottom: 'var(--space-4)', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>密码</label>
            <input type="password" placeholder={isSetup ? '设置密码（至少6位）' : '输入密码'} value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}
              style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '1rem' }} />
          </div>
          <button type="submit" disabled={isLoading}
            style={{ width: '100%', padding: 'var(--space-4)', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <><RefreshCw size={18} className="animate-spin" />{isSetup ? '创建中...' : '登录中...'}</> : <>{isSetup ? <><UserPlus size={18} />创建管理员</> : <><Lock size={18} />登录后台</>}</>}
          </button>
        </form>
        {error && <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</div>}
        <button onClick={() => navigate('/')} style={{ marginTop: 'var(--space-6)', background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}>← 返回首页</button>
      </div>
    </div>
  );
};

// ---- 仪表盘 ----
const Dashboard: React.FC = () => {
  const { stats, trendData, fetchTrend } = useAdminStore();

  useEffect(() => { fetchTrend(7); }, [fetchTrend]);

  const platformData = (stats.platformDistribution || []).map(p => ({ name: platformNames[p.platform] || p.platform, value: p.count }));
  const tierData = (stats.tierDistribution || []).map(t => ({ name: tierNames[t.tier] || t.tier, value: t.count }));

  return (
    <>
      <div style={S.statsGrid}>
        <StatCard icon={<Users size={20} />} bg="rgba(249,115,22,0.15)" color={CHART_COLORS.primary} value={stats.totalUsers} label="总用户数" />
        <StatCard icon={<ArrowRightLeft size={20} />} bg="rgba(52,211,153,0.15)" color={CHART_COLORS.success} value={stats.completedMigrations} label="成功迁移" />
        <StatCard icon={<UserCheck size={20} />} bg="rgba(167,139,250,0.15)" color={CHART_COLORS.accent} value={stats.paidUsers} label="付费用户" />
        <StatCard icon={<Eye size={20} />} bg="rgba(96,165,250,0.15)" color={CHART_COLORS.info} value={stats.todayPV} label="今日PV" />
        <StatCard icon={<Activity size={20} />} bg="rgba(251,191,36,0.15)" color={CHART_COLORS.secondary} value={stats.todayUV} label="今日UV" />
        <StatCard icon={<TrendingUp size={20} />} bg="rgba(52,211,153,0.15)" color={CHART_COLORS.success} value={stats.conversionRate ? `${stats.conversionRate}%` : '0%'} label="转化率" />
        <StatCard icon={<DollarSign size={20} />} bg="rgba(249,115,22,0.15)" color={CHART_COLORS.primary} value={formatMoney(stats.monthlyRevenue)} label="本月收入" />
        <StatCard icon={<CreditCard size={20} />} bg="rgba(96,165,250,0.15)" color={CHART_COLORS.info} value={stats.paidOrders} label="已支付订单" />
      </div>

      <div style={S.chartsGrid}>
        <ChartCard title="平台分布" icon={<PieChartIcon size={18} />}>
          {platformData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {platformData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="会员分布" icon={<Users size={18} />}>
          {tierData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {tierData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="迁移趋势（近7天）" icon={<TrendingUp size={18} />} full>
          {trendData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-secondary)" fontSize={12} tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="migrations" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ fill: CHART_COLORS.primary, r: 4 }} name="总迁移" />
                  <Line type="monotone" dataKey="success" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ fill: CHART_COLORS.success, r: 4 }} name="成功" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
};

// ---- 用户管理 ----
const UsersPage: React.FC = () => {
  const { users, usersTotal, usersPage, usersLimit, isLoading, fetchUsers, deleteUser, userDetail, fetchUserDetail } = useAdminStore();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => { fetchUsers(1, 10); }, [fetchUsers]);
  useEffect(() => { if (selectedUserId) fetchUserDetail(selectedUserId); }, [selectedUserId, fetchUserDetail]);

  const handleSearch = () => { setSearch(searchInput); fetchUsers(1, 10, searchInput); };
  const totalPages = Math.ceil(usersTotal / usersLimit);

  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="搜索用户名或邮箱..." style={S.searchInput} />
        </div>
        <button style={S.btn} onClick={handleSearch}><Search size={14} />搜索</button>
      </div>

      <div style={S.card}>
        {users.length === 0 && !isLoading ? <div style={S.emptyState}>暂无用户数据</div> : (
          <>
            <table style={S.table}>
              <thead><tr><th style={S.th}>用户</th><th style={S.th}>角色</th><th style={S.th}>会员</th><th style={S.th}>迁移数</th><th style={S.th}>注册时间</th><th style={S.th}>操作</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 }}>{getInitials(u.username)}</div>
                        <div><div style={{ fontWeight: 500 }}>{u.username}</div><div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{u.email}</div></div>
                      </div>
                    </td>
                    <td style={S.td}><span style={{ ...S.badge, background: u.role === 'admin' ? 'rgba(249,115,22,0.15)' : 'var(--color-bg-tertiary)', color: u.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{u.role === 'admin' && <Shield size={10} />}{u.role === 'admin' ? '管理员' : '用户'}</span></td>
                    <td style={S.td}><TierBadge tier={u.tier || u.membership_tier} /></td>
                    <td style={S.td}>{u.migrationCount ?? 0}</td>
                    <td style={{ ...S.td, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{formatDate(u.created_at)}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button style={{ ...S.btn, padding: 'var(--space-2)', border: 'none', background: 'transparent' }} onClick={() => setSelectedUserId(Number(u.id))} title="查看详情"><Eye size={16} /></button>
                        <button style={{ ...S.btn, padding: 'var(--space-2)', border: 'none', background: 'transparent', color: 'var(--color-danger)' }} onClick={() => window.confirm(`确定删除用户 "${u.username}"？`) && deleteUser(u.id)} disabled={u.role === 'admin'} title="删除"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={S.pagination}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>第 {usersPage} / {totalPages || 1} 页，共 {usersTotal} 条</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button style={{ ...S.pageBtn, opacity: usersPage <= 1 ? 0.5 : 1 }} disabled={usersPage <= 1} onClick={() => fetchUsers(usersPage - 1, usersLimit, search)}><ChevronLeft size={16} />上一页</button>
                <button style={{ ...S.pageBtn, opacity: usersPage >= totalPages ? 0.5 : 1 }} disabled={usersPage >= totalPages} onClick={() => fetchUsers(usersPage + 1, usersLimit, search)}>下一页<ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 用户详情抽屉 */}
      {selectedUserId && userDetail && (
        <>
          <div style={S.overlay} onClick={() => setSelectedUserId(null)} />
          <div style={S.drawer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>用户详情</h2>
              <button style={{ ...S.btn, padding: 'var(--space-2)', border: 'none', background: 'transparent' }} onClick={() => setSelectedUserId(null)}><ArrowLeft size={16} />关闭</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>{getInitials(userDetail.user.username)}</div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{userDetail.user.username}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{userDetail.user.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>会员等级</div><div style={{ fontWeight: 600, marginTop: '4px' }}><TierBadge tier={userDetail.user.tier || userDetail.user.membership_tier} /></div></div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>迁移次数</div><div style={{ fontWeight: 600, marginTop: '4px' }}>{userDetail.user.migrationCount}</div></div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>付费订单</div><div style={{ fontWeight: 600, marginTop: '4px' }}>{userDetail.user.paidOrderCount}</div></div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>注册时间</div><div style={{ fontWeight: 600, marginTop: '4px', fontSize: '0.875rem' }}>{formatDate(userDetail.user.created_at)}</div></div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>迁移记录</h3>
            {userDetail.migrations.length === 0 ? <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-6)' }}>暂无迁移记录</div> : (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                {userDetail.migrations.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span>{platformIcons[m.source_platform] || '📦'}</span><span style={{ color: 'var(--color-text-secondary)' }}>→</span><span>{platformIcons[m.target_platform] || '📦'}</span>
                    </div>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatDate(m.created_at)}</span>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>订单记录</h3>
            {userDetail.orders.length === 0 ? <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>暂无订单记录</div> : (
              userDetail.orders.map(o => (
                <div key={o.order_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
                  <div><div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{planNames[o.plan] || o.plan}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{o.order_id}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 600 }}>{formatMoney(Number(o.amount))}</div><StatusBadge status={o.status} /></div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
};

// ---- 迁移管理 ----
const MigrationsPage: React.FC = () => {
  const { migrationRecords, isLoading, fetchMigrationRecords } = useAdminStore();
  useEffect(() => { fetchMigrationRecords(1, 20); }, [fetchMigrationRecords]);

  return (
    <div style={S.card}>
      {migrationRecords.length === 0 && !isLoading ? <div style={S.emptyState}>暂无迁移记录</div> : (
        <table style={S.table}>
          <thead><tr><th style={S.th}>用户ID</th><th style={S.th}>迁移路径</th><th style={S.th}>状态</th><th style={S.th}>配置项</th><th style={S.th}>时间</th></tr></thead>
          <tbody>
            {migrationRecords.map(r => (
              <tr key={r.id}>
                <td style={S.td}>#{r.user_id}</td>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span>{platformIcons[r.source_platform] || '📦'}</span><span style={{ color: 'var(--color-text-secondary)' }}>→</span><span>{platformIcons[r.target_platform] || '📦'}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{platformNames[r.source_platform] || r.source_platform} → {platformNames[r.target_platform] || r.target_platform}</span>
                  </div>
                </td>
                <td style={S.td}><StatusBadge status={r.status} /></td>
                <td style={S.td}>{r.items_count ?? (Array.isArray(r.categories) ? r.categories.length : 0)} 项</td>
                <td style={{ ...S.td, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ---- 订单管理 ----
const OrdersPage: React.FC = () => {
  const { orders, ordersTotal, ordersPage, isLoading, fetchOrders } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState('');
  useEffect(() => { fetchOrders(1, 10, statusFilter || undefined); }, [fetchOrders, statusFilter]);
  const totalPages = Math.ceil(ordersTotal / 10);

  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
        {['', 'pending', 'paid', 'cancelled', 'refunded'].map(s => (
          <button key={s} style={{ ...S.btn, ...(statusFilter === s ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}) }} onClick={() => setStatusFilter(s)}>{s ? statusNames[s] : '全部'}</button>
        ))}
      </div>
      <div style={S.card}>
        {orders.length === 0 && !isLoading ? <div style={S.emptyState}>暂无订单数据</div> : (
          <>
            <table style={S.table}>
              <thead><tr><th style={S.th}>订单号</th><th style={S.th}>用户</th><th style={S.th}>套餐</th><th style={S.th}>金额</th><th style={S.th}>状态</th><th style={S.th}>时间</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{o.order_id}</td>
                    <td style={S.td}>{o.username || `用户${o.user_id}`}</td>
                    <td style={S.td}><span style={S.badge}>{planNames[o.plan] || o.plan}</span></td>
                    <td style={S.td}>{formatMoney(Number(o.amount))}</td>
                    <td style={S.td}><StatusBadge status={o.status} /></td>
                    <td style={{ ...S.td, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={S.pagination}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>第 {ordersPage} / {totalPages || 1} 页，共 {ordersTotal} 条</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button style={{ ...S.pageBtn, opacity: ordersPage <= 1 ? 0.5 : 1 }} disabled={ordersPage <= 1} onClick={() => fetchOrders(ordersPage - 1, 10, statusFilter || undefined)}><ChevronLeft size={16} />上一页</button>
                <button style={{ ...S.pageBtn, opacity: ordersPage >= totalPages ? 0.5 : 1 }} disabled={ordersPage >= totalPages} onClick={() => fetchOrders(ordersPage + 1, 10, statusFilter || undefined)}>下一页<ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

// ---- 营收分析 ----
const RevenuePage: React.FC = () => {
  const { revenueData, fetchRevenue, stats } = useAdminStore();
  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  const dailyData = (revenueData?.dailyRevenue || []).map(d => ({ date: d.date.slice(5), revenue: d.revenue, orders: d.orders }));
  const planData = (revenueData?.planRevenue || []).map(p => ({ name: planNames[p.plan] || p.plan, revenue: p.revenue, count: p.count }));

  return (
    <>
      <div style={S.statsGrid}>
        <StatCard icon={<DollarSign size={20} />} bg="rgba(249,115,22,0.15)" color={CHART_COLORS.primary} value={formatMoney(stats.totalRevenue)} label="总收入" />
        <StatCard icon={<TrendingUp size={20} />} bg="rgba(52,211,153,0.15)" color={CHART_COLORS.success} value={revenueData ? formatMoney(revenueData.totalRevenue30d) : '-'} label="近30天收入" />
        <StatCard icon={<CreditCard size={20} />} bg="rgba(96,165,250,0.15)" color={CHART_COLORS.info} value={revenueData?.ordersCount30d ?? 0} label="近30天订单" />
        <StatCard icon={<UserCheck size={20} />} bg="rgba(167,139,250,0.15)" color={CHART_COLORS.accent} value={revenueData ? formatMoney(revenueData.arpu) : '-'} label="ARPU" />
        <StatCard icon={<Users size={20} />} bg="rgba(251,191,36,0.15)" color={CHART_COLORS.secondary} value={revenueData?.uniquePayingUsers ?? 0} label="近30天付费用户" />
        <StatCard icon={<TrendingUp size={20} />} bg="rgba(52,211,153,0.15)" color={CHART_COLORS.success} value={stats.conversionRate ? `${stats.conversionRate}%` : '0%'} label="转化率" />
      </div>

      <div style={S.chartsGrid}>
        <ChartCard title="每日收入趋势（近30天）" icon={<DollarSign size={18} />} full>
          {dailyData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="收入" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="套餐收入分布" icon={<PieChartIcon size={18} />}>
          {planData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="revenue" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="套餐订单数" icon={<ShoppingCart size={18} />}>
          {planData.length === 0 ? <EmptyData /> : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
                  <Bar dataKey="count" fill={CHART_COLORS.info} radius={[0, 4, 4, 0]} name="订单数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
};

// ---- 主组件 ----
export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const navigate = useNavigate();
  const { adminToken, adminUser, verifyAdmin, setupAdmin, checkSetupStatus, isLoading, error, fetchDashboard, clearError, clearAdminToken } = useAdminStore();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token) {
      setIsAuthenticated(true);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          useAdminStore.setState({ adminToken: token, adminUser: user });
        } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !adminToken && !localStorage.getItem('admin_token')) setIsAuthenticated(false);
  }, [isAuthenticated, adminToken]);

  useEffect(() => {
    if (isAuthenticated) fetchDashboard();
  }, [isAuthenticated, fetchDashboard]);

  const handleRefresh = () => { fetchDashboard(); };
  const handleLogout = () => { clearAdminToken(); setIsAuthenticated(false); };

  if (!isAuthenticated) {
    return <PasswordPage onSuccess={() => setIsAuthenticated(true)} verifyAdmin={verifyAdmin} setupAdmin={setupAdmin} checkSetupStatus={checkSetupStatus} isLoading={isLoading} />;
  }

  const navItems: { key: Page; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={18} /> },
    { key: 'users', label: '用户管理', icon: <Users size={18} /> },
    { key: 'migrations', label: '迁移管理', icon: <ArrowRightLeft size={18} /> },
    { key: 'orders', label: '订单管理', icon: <ShoppingCart size={18} /> },
    { key: 'revenue', label: '营收分析', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div style={S.root}>
      {/* 侧边栏 */}
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <span style={{ fontSize: '1.5rem' }}>🦐</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>虾管家后台</span>
        </div>
        <nav style={S.sidebarNav}>
          {navItems.map(item => (
            <button key={item.key} style={{ ...S.navItem, ...(currentPage === item.key ? S.navItemActive : {}) }} onClick={() => setCurrentPage(item.key)}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        {/* 底部管理员信息 */}
        <div style={{ padding: 'var(--space-4) var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-2)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>
              {adminUser ? getInitials(adminUser.username) : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminUser?.username || '管理员'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adminUser?.email || ''}</div>
            </div>
          </div>
          <button style={{ ...S.navItem, color: 'var(--color-text-secondary)' }} onClick={() => navigate('/')}>
            <ArrowLeft size={18} />返回前台
          </button>
          <button style={{ ...S.navItem, color: 'var(--color-text-secondary)' }} onClick={handleLogout}>
            <Lock size={18} />退出登录
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <div style={S.main}>
        {/* 顶栏 */}
        <div style={S.topbar}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{navItems.find(n => n.key === currentPage)?.label}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ ...S.badge, background: 'rgba(249,115,22,0.15)', color: 'var(--color-primary)' }}><Shield size={12} />管理员</span>
            <button style={S.btn} onClick={handleRefresh} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />刷新</button>
          </div>
        </div>

        {/* 内容区 */}
        <div style={S.content}>
          {error && (
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{error}</span>
              <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'users' && <UsersPage />}
          {currentPage === 'migrations' && <MigrationsPage />}
          {currentPage === 'orders' && <OrdersPage />}
          {currentPage === 'revenue' && <RevenuePage />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
