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

/**
 * 获取游客已使用的迁移次数
 */
export function getGuestMigrationCount(): number {
  try {
    const raw = localStorage.getItem(GUEST_MIGRATION_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * 递增游客迁移计数（仅在真正完成迁移时调用）
 */
export function incrementGuestMigrationCount(): number {
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
 * - 如果未登录+未达限→允许继续
 * - Pro版→直接通过
 * 
 * 注意：计数逻辑已移至 MigrationPage 的 complete 步骤，不再在 checkCanMigrate 中提前计数
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
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  const { isAuthenticated, isPro, fetchPlanInfo } = useAuthStore();

  // 同步未登录用户剩余次数
  useEffect(() => {
    if (!isAuthenticated) {
      const used = getGuestMigrationCount();
      setGuestRemaining(Math.max(0, GUEST_MIGRATION_LIMIT - used));
    }
  }, [isAuthenticated]);

  // 已认证用户在组件挂载时立即检查权限，避免闪屏
  useEffect(() => {
    if (!isAuthenticated) {
      // 未登录用户不需要立即检查
      setInitialCheckDone(true);
      return;
    }

    // 已认证用户：立即开始检查，显示 loading 状态直到结果返回
    setChecking(true);
    setInitialCheckDone(false);

    const checkAuthUserPermission = async () => {
      try {
        // 先获取套餐信息
        await fetchPlanInfo();
        
        // Pro版直接通过
        if (isPro()) {
          setCanUse(true);
          setChecking(false);
          setInitialCheckDone(true);
          return;
        }

        // 免费用户检查 API 权限
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
        console.error('检查迁移权限失败:', error);
        // 网络错误时拒绝迁移，防止断网绕过次数限制
        setCanUse(false);
      }
      
      setChecking(false);
      setInitialCheckDone(true);
    };

    checkAuthUserPermission();
  }, [isAuthenticated, fetchPlanInfo, isPro, onLimitReached]);

  // 检查是否可以迁移（仅针对点击操作，未登录用户）
  // 注意：不再在此处递增计数，计数逻辑移至 MigrationPage 的 complete 步骤
  const checkCanMigrate = async () => {
    // 已认证用户已在上个 useEffect 中完成检查，无需重复检查
    if (isAuthenticated) {
      return canUse;
    }

    setChecking(true);
    
    try {
      // 未登录用户检查本地次数（只检查，不计数）
      const used = getGuestMigrationCount();
      if (used >= GUEST_MIGRATION_LIMIT) {
        setCanUse(false);
        setUpgradeModalOpen(true);
        onLimitReached?.();
        setChecking(false);
        return false;
      }
      // 允许使用（不计数，计数在 MigrationPage 的 complete 步骤进行）
      setGuestRemaining(Math.max(0, GUEST_MIGRATION_LIMIT - used));
      setCanUse(true);
    } catch (error) {
      console.error('检查迁移次数失败:', error);
      // 网络错误时拒绝迁移，防止断网绕过次数限制
      setCanUse(false);
    }
    
    setChecking(false);
    return canUse;
  };

  // 外部控制升级弹窗
  useEffect(() => {
    if (externalShowUpgrade !== undefined) {
      setUpgradeModalOpen(externalShowUpgrade);
    }
  }, [externalShowUpgrade]);

  const handleCloseModal = () => {
    setUpgradeModalOpen(false);
  };

  // 未认证用户检查未完成时，显示 loading
  if (!isAuthenticated && !initialCheckDone) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        color: 'var(--color-text-secondary)',
      }}>
        加载中...
      </div>
    );
  }

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
              🦐 游客还可迁移 {guestRemaining} 次 · 注册后享每月2次
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
