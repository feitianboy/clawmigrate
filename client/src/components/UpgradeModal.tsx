import { useAuthStore } from '../stores/authStore';
import React, { useState } from 'react';
import { X, Crown, Check, Zap, Clock } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

/**
 * 升级弹窗组件 - 精简版
 * 只展示 Pro 套餐：¥19/月 和 ¥149/年
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro_monthly' | 'pro_yearly'>('pro_yearly');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plan/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId: selectedPlan }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        showNotification('success', `订单创建成功！订单号: ${result.data.orderId}，应付金额: ¥${result.data.amount}，请完成支付后刷新页面`);
        onClose();
        window.location.reload();
      } else {
        showNotification('error', result.error || '创建订单失败');
      }
    } catch (error) {
      console.error('升级失败:', error);
      showNotification('error', '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 'var(--space-4)',
    },
    modal: {
      background: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-xl)',
      maxWidth: '480px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    },
    header: {
      padding: 'var(--space-6)',
      textAlign: 'center',
      borderBottom: '1px solid var(--color-border)',
      position: 'relative',
    },
    closeBtn: {
      position: 'absolute',
      top: 'var(--space-4)',
      right: 'var(--space-4)',
      background: 'transparent',
      border: 'none',
      color: 'var(--color-text-secondary)',
      cursor: 'pointer',
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-md)',
    },
    crownIcon: {
      width: '64px',
      height: '64px',
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto var(--space-4)',
      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 700,
      marginBottom: 'var(--space-2)',
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    subtitle: {
      color: 'var(--color-text-secondary)',
      fontSize: '0.9375rem',
    },
    body: {
      padding: 'var(--space-6)',
    },
    benefitsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-6)',
    },
    benefitItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--color-bg-tertiary)',
      borderRadius: 'var(--radius-md)',
    },
    benefitIcon: {
      width: '32px',
      height: '32px',
      background: 'rgba(34, 197, 94, 0.15)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    benefitText: {
      fontSize: '0.875rem',
      color: 'var(--color-text)',
    },
    planGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)',
    },
    planCard: {
      padding: 'var(--space-5)',
      background: 'var(--color-bg)',
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center',
    },
    planCardSelected: {
      borderColor: 'var(--color-primary)',
      background: 'rgba(249, 115, 22, 0.1)',
    },
    planBadge: {
      display: 'inline-block',
      padding: '2px 8px',
      background: 'var(--color-warning)',
      color: 'white',
      borderRadius: '9999px',
      fontSize: '0.6875rem',
      fontWeight: 600,
      marginBottom: 'var(--space-3)',
    },
    planName: {
      fontSize: '1rem',
      fontWeight: 600,
      marginBottom: 'var(--space-2)',
    },
    planPrice: {
      fontSize: '1.75rem',
      fontWeight: 700,
      color: 'var(--color-primary)',
    },
    planUnit: {
      fontSize: '0.75rem',
      color: 'var(--color-text-secondary)',
    },
    upgradeBtn: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-4)',
      background: 'var(--color-primary)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-lg)',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    footer: {
      padding: 'var(--space-4)',
      textAlign: 'center',
      borderTop: '1px solid var(--color-border)',
      color: 'var(--color-text-muted)',
      fontSize: '0.75rem',
    },
  };

  const benefits = [
    { icon: Zap, text: '每月无限次迁移' },
    { icon: Clock, text: '迁移历史永久保存' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '12px 24px',
          borderRadius: '8px',
          background: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {notification.message}
        </div>
      )}
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
          <div style={styles.crownIcon}>
            <Crown size={32} color="white" />
          </div>
          <h2 style={styles.title}>升级到 Pro 版本</h2>
          <p style={styles.subtitle}>
            {reason === 'migration-limit' ? '本月迁移次数已用完，解锁无限迁移' : '解锁更多高级功能'}
          </p>
        </div>

        <div style={styles.body}>
          <div style={styles.benefitsList}>
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} style={styles.benefitItem}>
                  <div style={styles.benefitIcon}>
                    <Icon size={16} color="#22c55e" />
                  </div>
                  <span style={styles.benefitText}>{benefit.text}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.planGrid}>
            <div 
              style={{
                ...styles.planCard,
                ...(selectedPlan === 'pro_monthly' ? styles.planCardSelected : {}),
              }}
              onClick={() => setSelectedPlan('pro_monthly')}
            >
              <div style={styles.planBadge}>月度</div>
              <div style={styles.planName}>Pro 月度</div>
              <div style={styles.planPrice}>¥19</div>
              <div style={styles.planUnit}>每月</div>
            </div>
            
            <div 
              style={{
                ...styles.planCard,
                ...(selectedPlan === 'pro_yearly' ? styles.planCardSelected : {}),
              }}
              onClick={() => setSelectedPlan('pro_yearly')}
            >
              <div style={{...styles.planBadge, background: 'var(--color-success)'}}>
                年度特惠
              </div>
              <div style={styles.planName}>Pro 年度</div>
              <div style={styles.planPrice}>¥149</div>
              <div style={styles.planUnit}>每年</div>
            </div>
          </div>

          <button
            style={{
              ...styles.upgradeBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? '处理中...' : (
              <>
                <Crown size={20} />
                立即升级 Pro
              </>
            )}
          </button>
        </div>

        <div style={styles.footer}>
          支付安全由支付宝保障 · 7天内无条件退款
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
