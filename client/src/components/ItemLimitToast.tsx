import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';

interface ItemLimitToastProps {
  current: number;
  limit: number;
  onUpgrade: () => void;
  autoHideDuration?: number;
}

/**
 * 超限提示条组件
 * 在迁移过程中检测到条目数超限时显示
 * 固定在页面顶部或底部，5秒自动消失或手动关闭
 */
export const ItemLimitToast: React.FC<ItemLimitToastProps> = ({
  current,
  limit,
  onUpgrade,
  autoHideDuration = 5000,
}) => {
  const [visible, setVisible] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [progress, setProgress] = useState(100);

  // 倒计时自动消失
  useEffect(() => {
    if (autoHideDuration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
      setProgress(remaining);

      if (elapsed >= autoHideDuration) {
        clearInterval(interval);
        setVisible(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoHideDuration]);

  const handleUpgradeClick = () => {
    setUpgradeModalOpen(true);
    onUpgrade();
  };

  if (!visible) return null;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'fixed',
      top: 'var(--space-4)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      maxWidth: '600px',
      width: 'calc(100% - var(--space-8))',
    },
    toast: {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
      overflow: 'hidden',
    },
    progressBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: '3px',
      background: 'rgba(255, 255, 255, 0.5)',
      transition: 'width 0.05s linear',
      width: `${progress}%`,
    },
    content: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
    },
    iconWrapper: {
      flexShrink: 0,
      width: '40px',
      height: '40px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContent: {
      flex: 1,
    },
    title: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      color: 'white',
      marginBottom: 'var(--space-1)',
    },
    description: {
      fontSize: '0.8125rem',
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: 1.5,
    },
    highlight: {
      color: 'white',
      fontWeight: 600,
    },
    actions: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-3)',
    },
    upgradeBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-4)',
      background: 'white',
      color: 'var(--color-warning)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.8125rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    dismissBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.toast}>
          <div style={styles.content}>
            <div style={styles.iconWrapper}>
              <AlertTriangle size={20} color="white" />
            </div>
            <div style={styles.textContent}>
              <div style={styles.title}>免费版配置项数量受限</div>
              <div style={styles.description}>
                免费版最多迁移 <span style={styles.highlight}>{limit}</span> 项配置，
                当前有 <span style={styles.highlight}>{current}</span> 项。
                升级 Pro 版本可解锁无限迁移！
              </div>
              <div style={styles.actions}>
                <button
                  style={styles.upgradeBtn}
                  onClick={handleUpgradeClick}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Zap size={14} />
                  升级 Pro 解锁
                </button>
              </div>
            </div>
            <button
              style={styles.dismissBtn}
              onClick={() => setVisible(false)}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={styles.progressBar} />
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason="item-limit"
      />
    </>
  );
};

export default ItemLimitToast;
