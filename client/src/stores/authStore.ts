import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
  membershipTier?: 'free' | 'pro';
  membershipExpireAt?: string | null;
}

interface PlanInfo {
  tier: 'free' | 'pro';
  tierName: string;
  expireAt: string | null;
  isExpired: boolean;
  usage: {
    used: number;
    limit: number;
    unlimited: boolean;
    remaining: number;
  };
  benefits: string[];
  suggestedPlan?: string;
  suggestedPlanPrice?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  planInfo: PlanInfo | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  fetchPlanInfo: () => Promise<void>;
  isPro: () => boolean;
  canMigrate: () => Promise<{ allowed: boolean; reason?: string }>;
}

const API_BASE = '/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  planInfo: null,

  login: async (username: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 发送 cookies
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ error: result.error || '登录失败', isLoading: false });
        return false;
      }

      set({
        user: result.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      // 登录成功后获取套餐信息
      get().fetchPlanInfo();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({ error: '网络错误，请稍后重试', isLoading: false });
      return false;
    }
  },

  register: async (username: string, email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 发送 cookies
        body: JSON.stringify({ username, email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ error: result.error || '注册失败', isLoading: false });
        return false;
      }

      set({
        user: result.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      // 注册成功后获取套餐信息
      get().fetchPlanInfo();
      return true;
    } catch (error) {
      console.error('Register error:', error);
      set({ error: '网络错误，请稍后重试', isLoading: false });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        planInfo: null,
      });
    }
  },

  checkAuth: async (): Promise<boolean> => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        credentials: 'include', // 发送 cookies
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ isAuthenticated: false, user: null, isLoading: false });
        return false;
      }

      set({
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
      });
      // 检查认证后获取套餐信息
      get().fetchPlanInfo();
      return true;
    } catch (error) {
      console.error('Check auth error:', error);
      // 网络错误时不清除认证状态，保持已登录
      const { isAuthenticated } = get();
      set({ isLoading: false });
      return isAuthenticated;
    }
  },

  updateProfile: async (data: Partial<User>): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ error: result.error || '更新失败', isLoading: false });
        return false;
      }

      set((state) => ({
        user: state.user ? { ...state.user, ...result.data } : null,
        isLoading: false,
      }));
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      set({ error: '网络错误，请稍后重试', isLoading: false });
      return false;
    }
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ error: result.error || '修改密码失败', isLoading: false });
        return false;
      }

      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      set({ error: '网络错误，请稍后重试', isLoading: false });
      return false;
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  clearError: () => {
    set({ error: null });
  },

  // 获取用户套餐信息
  fetchPlanInfo: async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/plan/me`, {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.ok) {
        set({ planInfo: result.data });
        // 同步更新user的会员信息
        set((state) => ({
          user: state.user ? {
            ...state.user,
            membershipTier: result.data.tier,
            membershipExpireAt: result.data.expireAt,
          } : null,
        }));
      }
    } catch (error) {
      console.error('获取套餐信息失败:', error);
    }
  },

  // 检查是否为Pro用户
  isPro: (): boolean => {
    const { user, planInfo } = get();
    if (!user || !planInfo) return false;
    
    // 检查tier
    const tier = planInfo.tier || user.membershipTier;
    if (tier !== 'pro') return false;
    
    // 检查是否过期
    if (planInfo.expireAt) {
      return !planInfo.isExpired;
    }
    
    return true;
  },

  // 检查是否可以迁移
  canMigrate: async (): Promise<{ allowed: boolean; reason?: string }> => {
    const { isAuthenticated, isPro } = get();

    // 未登录用户直接拦截
    if (!isAuthenticated) {
      return { allowed: false, reason: '请先登录' };
    }

    // Pro用户直接通过
    if (isPro()) {
      return { allowed: true };
    }

    // 免费用户调用API检查
    try {
      const response = await fetch(`${API_BASE}/membership/check`, {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.ok && result.data.allowed) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          reason: result.data?.reason || '本月迁移次数已用完'
        };
      }
    } catch (error) {
      console.error('检查迁移权限失败:', error);
      return { allowed: true }; // 网络错误时允许继续
    }
  },
}));
