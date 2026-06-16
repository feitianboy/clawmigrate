import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { UpgradeModal } from './UpgradeModal';

interface UsageGuardProps {
  children: ReactNode;
  onLimitReached?: () => void;
  showUpgradeModal?: boolean;
}

const GUEST_MIGRATION_LIMIT = 2;
const GUEST_MIGRATION_KEY = 'clawmigrate_guest_migrations';

function getGuestMigrationCount(): number {
  try {
    const raw = localStorage.getItem(GUEST_MIGRATION_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function incrementGuestMigrationCount(): number {
  const next = getGuestMigrationCount() + 1;
  try {
    localStorage.setItem(GUEST_MIGRATION_KEY, String(next));
  } catch {
    // localStorage 不可用时静默失败
  }
  return next;
}

/**
 * 迁移次数守卫组件
 * 包裹迁移操作区域，在用户点击"开始迁移"或进入迁移页时检查迁移次数
 * - 如果已登录+免费用户+次数用完→显示升级提示
 * - 如果未登录+已用2次→显示注册引导
 * - 如果未登录+未达限→允许继续并计数
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
  const [guestRemaining, setGuestRemaining] = useState(GUEST_MIGRATION_LIMIT);
  
  const { isAuthenticated, isPro, fetchPlanInfo } = useAuthStore();

  // 同步未登录用户剩余次数
  useEffect(() => {
    if (!isAuthenticated) {
      const used = getGuestMigrationCount();
      setGuestRemaining(Math.max(0, GUEST_MIGRATION_LIMIT - used));
    }
  }, [isAuthenticated]);

  // 检查是否可以迁移
  const checkCanMigrate = async () => {
    setChecking(true);
    
    try {
      // 未登录用户检查本地次数
      if (!isAuthenticated) {
        const used = getGuestMigrationCount();
        if (used >= GUEST_MIGRATION_LIMIT) {
          setCanUse(false);
          setUpgradeModalOpen(true);
          onLimitReached?.();
          setChecking(false);
          return false;
        }
        // 允许使用并计数
        incrementGuestMigrationCount();
        setGuestRemaining(Math.max(0, GUEST_MIGRATION_LIMIT - used - 1));
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
      ) : canUse || (!isAuthenticated && guestRemaining > 0) ? (
        <div onClick={checkCanMigrate}>
          {typeof children === 'function' ? children() : children}
          {!isAuthenticated && guestRemaining > 0 && (
            <div style={{
              fontSize: '12px',
              color: guestRemaining <= 1 ? 'var(--color-warning)' : 'var(--color-text-tertiary)',
              marginTop: '4px',
              fontWeight: guestRemaining <= 1 ? 600 : 400,
            }}>
              🦐 游客还可迁移 {guestRemaining} 次 · 注册后享每月3次
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 次数用完状态 - 点击显示升级/注册弹窗，阻止子元素onClick冒泡 */}
          <div onClick={(e) => { e.stopPropagation(); setUpgradeModalOpen(true); }}>
            {children}
          </div>
        </>
      )}
      
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={handleCloseModal}
        reason={!isAuthenticated ? 'complete-guide' : 'migration-limit'}
      />
    </>
  );
};

export default UsageGuard;
