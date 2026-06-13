import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { User, Mail, Phone, Lock, Check, AlertCircle, Save } from 'lucide-react';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '700px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 'var(--space-4)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-muted)',
  },
  input: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4) var(--space-3) 44px',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '0.9375rem',
    transition: 'all 0.2s',
  },
  inputReadonly: {
    background: 'var(--color-bg-tertiary)',
    cursor: 'not-allowed',
  },
  inputError: {
    borderColor: 'var(--color-danger)',
  },
  errorMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: '0.8125rem',
    color: 'var(--color-danger)',
  },
  successMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-success)',
    fontSize: '0.875rem',
  },
  btnRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-4)',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-6)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnPrimary: {
    background: 'var(--color-primary)',
    color: 'white',
  },
  btnSecondary: {
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text)',
  },
  dangerZone: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerTitle: {
    color: 'var(--color-danger)',
  },
  dangerDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    marginBottom: 'var(--space-4)',
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
  sectionDivider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: 'var(--space-6) 0',
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
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, checkAuth, updateProfile, changePassword, isLoading } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setAuthChecked(true);
    };
    initAuth();
  }, [checkAuth]);

  // Redirect to login if not authenticated after auth check
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate]);

  // Update form fields when user data is loaded
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!username.trim()) {
      setProfileError('用户名不能为空');
      return;
    }

    try {
      await updateProfile({ username, email, phone });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('更新失败，请稍后重试');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('请输入当前密码');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码至少需要6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError('密码修改失败，请稍后重试');
    }
  };

  // Loading state
  if (!authChecked) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>账户设置</h1>
          <p style={styles.subtitle}>管理你的个人信息和安全设置</p>
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
          <h1 style={styles.title}>账户设置</h1>
          <p style={styles.subtitle}>管理你的个人信息和安全设置</p>
        </div>
        <div style={styles.loginPrompt}>
          <div style={styles.loginIcon}>🔐</div>
          <h3 style={styles.loginTitle}>登录后访问</h3>
          <p style={styles.loginDesc}>请先登录账户以访问设置页面</p>
          <button style={styles.loginBtn} onClick={() => navigate('/login')}>
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>账户设置</h1>
        <p style={styles.subtitle}>管理你的个人信息和安全设置</p>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>基本信息</h2>
          <p style={styles.cardDesc}>修改你的个人资料</p>
        </div>
        <div style={styles.cardBody}>
          <form style={styles.form} onSubmit={handleProfileSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <User size={16} />
                用户名
              </label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.input}
                  placeholder="输入用户名"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Mail size={16} />
                邮箱地址
              </label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  placeholder="输入邮箱"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Phone size={16} />
                手机号
              </label>
              <div style={styles.inputWrapper}>
                <Phone size={18} style={styles.inputIcon} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                  placeholder="输入手机号（可选）"
                />
              </div>
            </div>

            {profileError && (
              <div style={styles.errorMsg}>
                <AlertCircle size={14} />
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div style={styles.successMsg}>
                <Check size={14} />
                个人信息已更新
              </div>
            )}

            <div style={styles.btnRow}>
              <button
                type="submit"
                style={{ ...styles.btn, ...styles.btnPrimary }}
                disabled={isLoading}
              >
                <Save size={16} />
                保存修改
              </button>
            </div>
          </form>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>修改密码</h2>
          <p style={styles.cardDesc}>更新你的账户密码</p>
        </div>
        <div style={styles.cardBody}>
          <form style={styles.form} onSubmit={handlePasswordSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Lock size={16} />
                当前密码
              </label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={styles.input}
                  placeholder="输入当前密码"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Lock size={16} />
                新密码
              </label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  placeholder="输入新密码（至少6位）"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Lock size={16} />
                确认新密码
              </label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="再次输入新密码"
                />
              </div>
            </div>

            {passwordError && (
              <div style={styles.errorMsg}>
                <AlertCircle size={14} />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={styles.successMsg}>
                <Check size={14} />
                密码已修改成功
              </div>
            )}

            <div style={styles.btnRow}>
              <button
                type="submit"
                style={{ ...styles.btn, ...styles.btnPrimary }}
                disabled={isLoading}
              >
                <Lock size={16} />
                修改密码
              </button>
            </div>
          </form>
        </div>
      </div>

      <div style={{ ...styles.card, ...styles.dangerZone }}>
        <div style={styles.cardHeader}>
          <h2 style={{ ...styles.cardTitle, ...styles.dangerTitle }}>危险区域</h2>
          <p style={styles.dangerDesc}>以下操作不可逆，请谨慎操作</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>注销账户</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                永久删除你的账户和所有数据
              </div>
            </div>
            <button
              style={{ ...styles.btn, ...styles.btnDanger }}
              onClick={() => {
                if (window.confirm('确定要注销账户吗？此操作不可恢复。')) {
                  // TODO: 调用注销接口
                }
              }}
            >
              注销账户
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
