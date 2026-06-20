import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  tier?: 'free' | 'pro';
  created_at: string;
  migration_count?: number;
}

export interface MigrationRecord {
  id: string;
  user_id: string;
  username?: string;
  source_platform: string;
  target_platform: string;
  status: 'success' | 'failed' | 'pending';
  categories: string[];
  created_at: string;
  completed_at?: string;
}

export interface PlatformDistribution {
  platform: string;
  count: number;
}

export interface TierDistribution {
  tier: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  totalMigrations: number;
  completedMigrations: number;
  failedMigrations: number;
  inProgressMigrations: number;
  todayPV: number;
  todayUV: number;
  platformDistribution: PlatformDistribution[];
  tierDistribution: TierDistribution[];
  conversionRate: number;
  paidUsers: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  orderByStatus: Record<string, number>;
  orderByPlan: Record<string, number>;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface AdminState {
  adminToken: string | null;
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  migrationRecords: MigrationRecord[];
  stats: AdminStats;
  isLoading: boolean;
  error: string | null;

  // Actions
  verifyAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  clearAdminToken: () => void;
  fetchDashboard: () => Promise<void>;
  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  fetchMigrationRecords: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminToken: null,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersLimit: 10,
  migrationRecords: [],
  stats: {
    totalUsers: 0,
    totalMigrations: 0,
    completedMigrations: 0,
    failedMigrations: 0,
    inProgressMigrations: 0,
    todayPV: 0,
    todayUV: 0,
    platformDistribution: [],
    tierDistribution: [],
    conversionRate: 0,
    paidUsers: 0,
    totalOrders: 0,
    paidOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    orderByStatus: {},
    orderByPlan: {},
  },
  isLoading: false,
  error: null,

  verifyAdmin: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // 保存 admin token 到 localStorage
        localStorage.setItem('admin_token', data.token);
        set({ adminToken: data.token, isLoading: false });
        return { success: true };
      } else {
        set({ error: data.error || '密码验证失败', isLoading: false });
        return { success: false, error: data.error || '密码验证失败' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '验证请求失败';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  clearAdminToken: () => {
    localStorage.removeItem('admin_token');
    set({ adminToken: null });
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    const adminToken = get().adminToken || localStorage.getItem('admin_token');
    try {
      const response = await fetch('/api/admin/stats', {
        headers: adminToken ? {
          'X-Admin-Token': adminToken,
        } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      const raw = await response.json();
      const data = raw.data || raw;
      set({
        stats: {
          totalUsers: data.totalUsers || 0,
          totalMigrations: data.totalMigrations || 0,
          completedMigrations: data.completedMigrations || 0,
          failedMigrations: data.failedMigrations || 0,
          inProgressMigrations: data.inProgressMigrations || 0,
          todayPV: data.todayPV || 0,
          todayUV: data.todayUV || 0,
          platformDistribution: data.platformDistribution || [],
          tierDistribution: data.tierDistribution || [],
          conversionRate: data.conversionRate || 0,
          paidUsers: data.paidUsers || 0,
          totalOrders: data.totalOrders || 0,
          paidOrders: data.paidOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          orderByStatus: data.orderByStatus || {},
          orderByPlan: data.orderByPlan || {},
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取数据失败',
        isLoading: false,
      });
    }
  },

  fetchUsers: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    const adminToken = get().adminToken || localStorage.getItem('admin_token');
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
        headers: adminToken ? {
          'X-Admin-Token': adminToken,
        } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      const result: UsersResponse = await response.json();
      const data = result.data || result;
      set({
        users: data.users || [],
        usersTotal: data.total || 0,
        usersPage: data.page || 1,
        usersLimit: data.limit || 10,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取用户列表失败',
        isLoading: false,
      });
    }
  },

  fetchMigrationRecords: async () => {
    set({ isLoading: true, error: null });
    const adminToken = get().adminToken || localStorage.getItem('admin_token');
    try {
      const response = await fetch('/api/admin/migrations', {
        headers: adminToken ? {
          'X-Admin-Token': adminToken,
        } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      const raw = await response.json();
      const data = raw.data || raw;
      set({
        migrationRecords: data.migrations || [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取迁移记录失败',
        isLoading: false,
      });
    }
  },

  deleteUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    const adminToken = get().adminToken || localStorage.getItem('admin_token');
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: adminToken ? {
          'X-Admin-Token': adminToken,
        } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败: ${response.status}`);
      }
      
      // 删除成功后，从列表中移除该用户
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
        usersTotal: state.usersTotal - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除用户失败',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
