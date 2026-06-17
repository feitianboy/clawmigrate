import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, ArrowRightLeft, LogOut, Menu, X, Zap } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 var(--space-6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  navLinkActive: {
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  upgradeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  usageTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: '4px 10px',
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    background: 'var(--color-primary)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  main: {
    flex: 1,
    padding: 'var(--space-8) var(--space-6)',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  footer: {
    borderTop: '1px solid var(--color-border)',
    padding: 'var(--space-6)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
  mobileMenuBtn: {
    display: 'none',
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    cursor: 'pointer',
    padding: 'var(--space-2)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 'var(--space-2)',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    minWidth: '180px',
    padding: 'var(--space-2)',
    zIndex: 50,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    color: 'var(--color-text)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    width: '100%',
    fontSize: '0.9375rem',
    transition: 'all 0.2s',
  },
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, isAuthenticated, checkAuth, logout, planInfo, isPro } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Define nav items
  const getNavItems = () => {
    return [
      { path: '/', label: '首页', icon: Home, requireAuth: false },
      { path: '/migrate', label: '开始迁移', icon: ArrowRightLeft, requireAuth: false },
    ];
  };

  const navItems = getNavItems();

  // 计算剩余迁移次数
  const getRemainingUsage = () => {
    if (!planInfo) return null;
    const { usage } = planInfo;
    if (usage.unlimited) return null;
    return usage.remaining;
  };

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div className="header-content" style={styles.headerContent}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}>🦐</div>
            <span>虾管家</span>
          </Link>

          <nav className="desktop-nav" style={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            {/* 迁移历史在完成页入口，导航栏不显示 */}
          </nav>

          <div style={styles.userSection}>
            {/* 升级入口 - 免费用户显示 */}
            {isAuthenticated && !isPro() && (
              <button
                style={styles.upgradeTag} className="upgrade-tag"
                onClick={() => setUpgradeModalOpen(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Zap size={12} />
                升级 Pro
              </button>
            )}
            
            {/* 套餐状态提示 */}
            {isAuthenticated && planInfo && !isPro() && (
              <span style={styles.usageTag} className="usage-tag">
                免费版 · 剩余 {getRemainingUsage()} 次/月
              </span>
            )}
            {isAuthenticated && isPro() && (
              <span style={{
                ...styles.usageTag,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                fontWeight: 600,
              }}>
                👑 Pro · 无限迁移
              </span>
            )}

            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <button
                  style={styles.userButton}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                >
                  <div style={styles.avatar}>
                    {user ? getInitials(user.username) : 'U'}
                  </div>
                  <span style={{ fontSize: '0.875rem' }}>{user?.username}</span>
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    <button style={styles.dropdownItem} onClick={handleLogout}>
                      <LogOut size={18} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">
                登录 / 注册
              </Link>
            )}

            <button
              className="mobile-menu-btn"
              style={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            {/* 套餐状态 - 移动端 */}
            {isAuthenticated && (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                marginTop: 'var(--space-2)',
              }}>
                {isPro() ? (
                  <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>👑 Pro · 无限迁移</span>
                ) : (
                  <span>免费版 · 剩余 {getRemainingUsage()} 次/月</span>
                )}
              </div>
            )}
          </nav>
        )}
      </header>

      <main className="main-content" style={styles.main}>
        <Outlet />
      </main>

      <footer className="footer" style={styles.footer}>
        <p>© 2026 虾管家. AI 助手配置一键迁移工具</p>
      </footer>

      {/* 升级弹窗 */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason="nav-upgrade"
      />
    </div>
  );
};

export default Layout;
