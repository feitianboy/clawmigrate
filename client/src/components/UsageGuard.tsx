import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UpgradeModal } from './UpgradeModal';
import { Crown } from 'lucide-react';

interface UsageGuardProps {
  children: ReactNode;
}

/**
 * 迁移权限守卫组件
 * 1. 未登录用户重定向到登录页
 * 2. 免费用户迁移次数用完时显示升级引导
 */
export function UsageGuard({ children }: UsageGuardProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const { isAuthenticated, canMigrate } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // 检查迁移权限
    canMigrate().then(result => {
      if (!result.allowed) {
        setBlocked(true);
        setBlockReason(result.reason || '迁移次数已用完');
      }
      setChecking(false);
    });
  }, [isAuthenticated, navigate, canMigrate]);

  if (!isAuthenticated) return null;

  if (checking) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-secondary)' }}>
        检查迁移权限中...
      </div>
    );
  }

  if (blocked) {
    return (
      <div style={{
        maxWidth: '500px', margin: '3rem auto', padding: 'var(--space-8)',
        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px', margin: '0 auto var(--space-5)',
          background: 'rgba(245, 158, 11, 0.15)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Crown size={32} color="var(--color-warning)" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
          迁移次数已用完
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: 'var(--space-6)' }}>
          {blockReason}
        </p>
        <button
          onClick={() => setShowUpgrade(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-6)',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
            fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Crown size={18} />
          升级 Pro 解锁无限迁移
        </button>
        <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="usage-limit" />
      </div>
    );
  }

  return <>{children}</>;
}

export function showUpgradeModal() {
  // 保留导出以兼容其他组件
}

export function getGuestMigrationCount() {
  return 0;
}

export function incrementGuestMigrationCount() {
  // 空实现，兼容旧代码
}
