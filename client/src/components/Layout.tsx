import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, ArrowRightLeft, History, Settings, LogOut, Menu, X, User, Shield } from 'lucide-react';

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
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  // Define nav items - show all for non-authenticated users on certain pages
  const getNavItems = () => {
    const baseItems = [
      { path: '/', label: '首页', icon: Home, requireAuth: false },
      { path: '/migrate', label: '开始迁移', icon: ArrowRightLeft, requireAuth: false },
    ];

    if (isAuthenticated) {
      baseItems.push(
        { path: '/history', label: '迁移历史', icon: History, requireAuth: true },
        { path: '/settings', label: '设置', icon: Settings, requireAuth: true }
      );
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div className="header-content" style={styles.headerContent}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}>🔄</div>
            <span>ClawMigrate</span>
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
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                style={{
                  ...styles.navLink,
                  ...(location.pathname === '/admin' ? styles.navLinkActive : {}),
                }}
              >
                <Shield size={18} />
                管理后台
              </Link>
            )}
          </nav>

          <div style={styles.userSection}>
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
                    <Link
                      to="/settings"
                      style={styles.dropdownItem}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={18} />
                      账户设置
                    </Link>
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
          </nav>
        )}
      </header>

      <main className="main-content" style={styles.main}>
        <Outlet />
      </main>

      <footer className="footer" style={styles.footer}>
        <p>© 2026 ClawMigrate. AI 助手配置一键迁移工具</p>
      </footer>
    </div>
  );
};

export default Layout;
