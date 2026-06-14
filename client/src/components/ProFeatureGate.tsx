import React, { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { UpgradeModal } from './UpgradeModal';
import { Lock, Crown } from 'lucide-react';

interface ProFeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Pro版功能门控组件
 * 包裹需要Pro权限的功能区域
 * - 免费/未登录用户看到锁定UI+升级引导
 */
export const ProFeatureGate: React.FC<ProFeatureGateProps> = ({
  feature,
  children,
  fallback,
}) => {
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);
  const { isAuthenticated, isPro } = useAuthStore();

  // Pro/企业版直接显示内容
  if (isPro()) {
    return <>{children}</>;
  }

  // 自定义fallback
  if (fallback) {
    return (
      <>
        {fallback}
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          reason={`feature-${feature}`}
        />
      </>
    );
  }

  // 默认锁定UI
  const lockedStyle: React.CSSProperties = {
    position: 'relative',
    opacity: 0.7,
  };

  const lockOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(2px)',
    borderRadius: 'inherit',
    cursor: 'pointer',
    zIndex: 10,
  };

  const lockIconStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    background: 'var(--color-warning)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--space-3)',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  };

  const lockTitleStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'white',
    marginBottom: 'var(--space-2)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  };

  const lockDescStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 'var(--space-4)',
  };

  const upgradeBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    background: 'var(--color-warning)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const getFeatureName = (feature: string): string => {
    const names: Record<string, string> = {
      history: '迁移历史',
      export: '高级导出',
      api: 'API 访问',
      brand: '自定义品牌',
      team: '团队协作',
    };
    return names[feature] || feature;
  };

  return (
    <div style={lockedStyle}>
      {children}
      <div 
        style={lockOverlayStyle}
        onClick={() => setUpgradeModalOpen(true)}
      >
        <div style={lockIconStyle}>
          <Crown size={24} color="white" />
        </div>
        <div style={lockTitleStyle}>
          <Lock size={16} />
          Pro 功能
        </div>
        <div style={lockDescStyle}>
          {getFeatureName(feature)}仅对 Pro 用户开放
        </div>
        <button 
          style={upgradeBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          升级 Pro 解锁
        </button>
      </div>
      
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason={`feature-${feature}`}
      />
    </div>
  );
};

export default ProFeatureGate;
