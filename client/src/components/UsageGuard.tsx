import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface UsageGuardProps {
  children: ReactNode;
}

export function UsageGuard({ children }: UsageGuardProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

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
