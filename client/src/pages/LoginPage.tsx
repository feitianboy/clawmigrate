import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { User, Lock, Mail, ArrowRight, Check } from 'lucide-react';

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-6)',
    background: 'var(--color-bg)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
  },
  header: {
    padding: 'var(--space-8) var(--space-6) var(--space-6)',
    textAlign: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    background: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: 'var(--space-2)',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-2)',
    padding: '0 var(--space-6)',
    marginBottom: 'var(--space-6)',
  },
  tab: {
    flex: 1,
    padding: 'var(--space-3)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: 'white',
  },
  body: {
    padding: '0 var(--space-6) var(--space-6)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  inputGroup: {
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
  submitBtn: {
    width: '100%',
    padding: 'var(--space-4)',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
  },
  error: {
    padding: 'var(--space-3) var(--space-4)',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-danger)',
    fontSize: '0.875rem',
  },
  footer: {
    padding: 'var(--space-5) var(--space-6)',
    borderTop: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  divider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: 'var(--space-5) 0',
  },
  benefits: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  benefit: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
  },
  benefitIcon: {
    color: 'var(--color-success)',
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(mode === 'login' ? '请输入用户名' : '请输入用户名');
      return;
    }

    if (mode === 'register' && !email.trim()) {
      setError('请输入邮箱');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    // 密码强度校验（仅注册时）
    if (mode === 'register' && !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setError('密码必须包含字母和数字');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }



    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, email, password);
      if (result) {
        navigate('/');
      } else {
        setError(useAuthStore.getState().error || '操作失败，请重试');
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请稍后重试');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🦐</div>
            <span style={styles.logoText}>虾管家</span>
          </div>
          <h1 style={styles.title}>
            {mode === 'login' ? '欢迎回来' : '创建账户'}
          </h1>
          <p style={styles.subtitle}>
            {mode === 'login'
              ? '登录以继续使用配置迁移服务'
              : '注册账户以保存迁移历史'}
          </p>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setMode('login'); setError(''); }}
          >
            登录
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setMode('register'); setError(''); }}
          >
            注册
          </button>
        </div>

        <div style={styles.body}>
          <form style={styles.form} onSubmit={handleSubmit}>
            <div style={styles.inputGroup}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="用户名或邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />
            </div>

            {mode === 'register' && (
              <div style={styles.inputGroup}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}

            <div style={styles.inputGroup}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {mode === 'register' && (
              <div style={styles.inputGroup}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              style={{ ...styles.submitBtn, opacity: isLoading ? 0.7 : 1 }}
              disabled={isLoading}
            >
              {isLoading ? '处理中...' : (
                <>
                  {mode === 'login' ? '登录' : '注册'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div style={styles.divider} />
              <div style={styles.benefits}>
                <div style={styles.benefit}>
                  <Check size={16} style={styles.benefitIcon} />
                  <span>保存迁移历史记录</span>
                </div>
                <div style={styles.benefit}>
                  <Check size={16} style={styles.benefitIcon} />
                  <span>支持断点续传</span>
                </div>
                <div style={styles.benefit}>
                  <Check size={16} style={styles.benefitIcon} />
                  <span>获取更多平台支持</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <a href="/" style={styles.backLink}>
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
