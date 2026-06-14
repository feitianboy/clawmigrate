import React, { useState, useEffect } from 'react';
import { X, Crown, Check, Zap, Shield, Clock, Star } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

/**
 * 升级弹窗组件
 * 展示当前套餐信息、免费版限制、Pro版优势
 * 支持选择套餐（月度/年度）
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro_monthly' | 'pro_yearly'>('pro_monthly');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  // 获取套餐列表
  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership/plans');
      const result = await response.json();
      if (result.ok) {
        setPlans(result.data.filter((p: any) => p.id.includes('pro')));
      }
    } catch (error) {
      console.error('获取套餐失败:', error);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plan/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          planId: selectedPlan,
          payMethod: 'alipay' 
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        // 订单创建成功，可以跳转到支付页面或显示支付二维码
        // 这里简单提示，实际应该跳转到支付页面
        alert(`订单创建成功！订单号: ${result.data.orderId}\n请完成支付后刷新页面`);
        onClose();
        // 刷新页面以更新会员状态
        window.location.reload();
      } else {
        alert(result.error || '创建订单失败，请稍后重试');
      }
    } catch (error) {
      console.error('升级失败:', error);
      alert('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const proMonthly = plans.find(p => p.id === 'pro_monthly');
  const proYearly = plans.find(p => p.id === 'pro_yearly');

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
      maxWidth: '600px',
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
      transition: 'all 0.2s',
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
      backgroundClip: 'text',
    },
    subtitle: {
      color: 'var(--color-text-secondary)',
      fontSize: '0.9375rem',
    },
    body: {
      padding: 'var(--space-6)',
    },
    sectionTitle: {
      fontSize: '1rem',
      fontWeight: 600,
      marginBottom: 'var(--space-4)',
      color: 'var(--color-text)',
    },
    benefitsList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
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
      fontSize: '0.8125rem',
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
      background: 'var(--color-primary-light)',
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
      marginBottom: 'var(--space-1)',
    },
    planUnit: {
      fontSize: '0.75rem',
      color: 'var(--color-text-secondary)',
    },
    planOriginal: {
      fontSize: '0.75rem',
      color: 'var(--color-text-muted)',
      textDecoration: 'line-through',
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
    { icon: Zap, text: '无限次迁移' },
    { icon: Clock, text: '迁移历史永久保存' },
    { icon: Star, text: '所有导出格式' },
    { icon: Shield, text: '优先客服支持' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <button 
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
          
          <div style={styles.crownIcon}>
            <Crown size={32} color="white" />
          </div>
          <h2 style={styles.title}>升级到 Pro 版本</h2>
          <p style={styles.subtitle}>
            {reason === 'migration-limit' 
              ? '本月迁移次数已用完，解锁无限迁移' 
              : '解锁更多高级功能'}
          </p>
        </div>

        <div style={styles.body}>
          <h3 style={styles.sectionTitle}>Pro 用户专享</h3>
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

          <h3 style={styles.sectionTitle}>选择套餐</h3>
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
              <div style={styles.planPrice}>
                ¥{proMonthly?.price || 29.9}
              </div>
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
              <div style={styles.planPrice}>
                ¥{proYearly?.price || 299}
              </div>
              <div style={styles.planUnit}>每年</div>
              {proYearly?.originalPrice && (
                <div style={styles.planOriginal}>
                  原价 ¥{proYearly.originalPrice}
                </div>
              )}
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
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              '处理中...'
            ) : (
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
