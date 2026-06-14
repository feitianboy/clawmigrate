import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { UpgradeModal } from './UpgradeModal';

interface UsageGuardProps {
  children: ReactNode;
  onLimitReached?: () => void;
  showUpgradeModal?: boolean;
}

/**
 * 迁移次数守卫组件
 * 包裹迁移操作区域，在用户点击"开始迁移"或进入迁移页时检查迁移次数
 * - 如果已登录+免费用户+次数用完→显示升级提示
 * - 如果未登录→允许继续（鼓励试用）
 * - Pro/企业版→直接通过
 */
export const UsageGuard: React.FC<UsageGuardProps> = ({
  children,
  onLimitReached,
  showUpgradeModal: externalShowUpgrade,
}) => {
  const [checking, setChecking] = useState(false);
  const [canUse, setCanUse] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  const { isAuthenticated, isPro, fetchPlanInfo, planInfo } = useAuthStore();

  // 检查是否可以迁移
  const checkCanMigrate = async () => {
    setChecking(true);
    
    try {
      // 未登录用户允许继续（鼓励试用）
      if (!isAuthenticated) {
        setCanUse(true);
        setChecking(false);
        return true;
      }

      // Pro/企业版直接通过
      if (isPro()) {
        setCanUse(true);
        setChecking(false);
        return true;
      }

      // 免费用户检查次数
      const response = await fetch('/api/membership/check', {
        method: 'POST',
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.ok && result.data.allowed) {
        setCanUse(true);
      } else {
        setCanUse(false);
        setUpgradeModalOpen(true);
        onLimitReached?.();
      }
    } catch (error) {
      console.error('检查迁移次数失败:', error);
      // 网络错误时允许继续
      setCanUse(true);
    }
    
    setChecking(false);
    return canUse;
  };

  // 组件挂载时获取套餐信息
  useEffect(() => {
    if (isAuthenticated) {
      fetchPlanInfo();
    }
  }, [isAuthenticated, fetchPlanInfo]);

  // 外部控制升级弹窗
  useEffect(() => {
    if (externalShowUpgrade !== undefined) {
      setUpgradeModalOpen(externalShowUpgrade);
    }
  }, [externalShowUpgrade]);

  const handleCloseModal = () => {
    setUpgradeModalOpen(false);
  };

  return (
    <>
      {checking ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
          color: 'var(--color-text-secondary)',
        }}>
          检查迁移次数中...
        </div>
      ) : canUse || !isAuthenticated ? (
        <div onClick={checkCanMigrate}>
          {typeof children === 'function' ? children() : children}
        </div>
      ) : (
        <>
          {/* 免费用户次数用完状态 - 显示禁用状态 */}
          <div onClick={() => setUpgradeModalOpen(true)}>
            {children}
          </div>
        </>
      )}
      
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={handleCloseModal}
        reason="migration-limit"
      />
    </>
  );
};

export default UsageGuard;
