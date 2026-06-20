import React, { useState, useEffect } from 'react';
import { X, Crown, Check, Zap, Clock, CreditCard } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

/**
 * 升级弹窗组件
 * 展示当前套餐信息、免费版限制、Pro版优势
 * 支持选择套餐（月度/年度），支付方式为微信支付
 * 跳转ZPAY支付后轮询订单状态
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro_monthly' | 'pro_yearly'>('pro_monthly');
  const [selectedPayType, setSelectedPayType] = useState<'wxpay'>('wxpay');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  
  const [polling, setPolling] = useState(false);

  // 获取套餐列表
  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  // 支付返回后轮询订单状态
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId && isOpen) {
      pollOrderStatus(orderId);
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
      // 调用创建订单API
      const response = await apiFetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          payType: 'wxpay',
        }),
      });

      const result = await response.json();

      if (result.ok && result.data.payUrl) {
        // 跳转到ZPAY支付页面
        window.location.href = result.data.payUrl;
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

  // 轮询订单状态（支付返回后）
  const pollOrderStatus = async (orderId: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30;
    const interval = 2000; // 2秒一次

    const poll = async () => {
      try {
        const response = await apiFetch('/api/orders/' + orderId, {
          method: 'GET',
        });
        const result = await response.json();

        if (result.ok && result.data.status === 'paid') {
          // 支付成功
          setPolling(false);
          alert('支付成功！Pro会员已激活');
          // 清除URL参数
          window.history.replaceState({}, '', window.location.pathname);
          onClose();
          window.location.reload();
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          setPolling(false);
          alert('支付结果确认中，请稍后刷新页面查看会员状态');
        }
      } catch (error) {
        console.error('轮询订单状态失败:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          setPolling(false);
        }
      }
    };

    poll();
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
      position: 'relative',
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
    payTypeSection: {
      marginBottom: 'var(--space-6)',
    },
    payTypeGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 'var(--space-3)',
    },
    payTypeCard: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-3)',
      background: 'var(--color-bg)',
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    payTypeCardSelected: {
      borderColor: 'var(--color-primary)',
      background: 'var(--color-primary-light)',
    },
    wechatIcon: {
      width: '24px',
      height: '24px',
      background: '#07c160',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '0.75rem',
      fontWeight: 700,
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
    pollingOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    pollingBox: {
      background: 'var(--color-bg-secondary)',
      padding: 'var(--space-8)',
      borderRadius: 'var(--radius-xl)',
      textAlign: 'center',
      maxWidth: '360px',
    },
    pollingText: {
      fontSize: '1rem',
      color: 'var(--color-text)',
      marginBottom: 'var(--space-4)',
    },
  };

  const benefits = [
    { icon: Zap, text: '无限次迁移' },
    { icon: Clock, text: '迁移历史永久保存' },
  ];

  const monthlyPrice = proMonthly?.price || 19;
  const yearlyPrice = proYearly?.price || 149;
    
  return (
    <>
      {/* 轮询状态提示 */}
      {polling && (
        <div style={styles.pollingOverlay}>
          <div style={styles.pollingBox}>
            <div style={styles.pollingText}>正在确认支付结果，请稍候...</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              支付成功后将自动刷新
            </div>
          </div>
        </div>
      )}

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
                ? '免费迁移次数已用完，解锁无限迁移'
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

            <h3 style={styles.sectionTitle}>
              选择套餐
                          </h3>
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
                  ¥{monthlyPrice}
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
                  ¥{yearlyPrice}
                </div>
                
                <div style={styles.planUnit}>每年</div>
              </div>
            </div>

            {/* 支付方式 - 仅支持微信支付 */}
            <div style={styles.payTypeSection}>
              <h3 style={styles.sectionTitle}>支付方式</h3>
              <div style={{...styles.payTypeCard, ...styles.payTypeCardSelected, cursor: 'default'}}>
                <div style={styles.wechatIcon}>微</div>
                微信支付
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
                  <CreditCard size={20} />
                  立即支付
                </>
              )}
            </button>
          </div>

          <div style={styles.footer}>
            支付安全由ZPAY保障
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
