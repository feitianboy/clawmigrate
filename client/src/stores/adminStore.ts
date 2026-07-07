import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  membership_tier?: string;
  tier?: 'free' | 'pro';
  created_at: string;
  updated_at?: string;
  membership_expire_at?: string;
  phone?: string;
  migrationCount?: number;
}

export interface MigrationRecord {
  id: string;
  user_id: string;
  username?: string;
  source_platform: string;
  target_platform: string;
  status: 'completed' | 'failed' | 'in_progress';
  items_count: number;
  categories: string[];
  created_at: string;
}

export interface OrderRecord {
  id?: number;
  order_id: string;
  user_id: number;
  username?: string;
  email?: string;
  plan: string;
  amount: number;
  pay_method?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  created_at: string;
  paid_at?: string;
}

export interface PlatformDistribution {
  platform: string;
  count: number;
}

export interface TierDistribution {
  tier: string;
  count: number;
}

export interface TrendData {
  date: string;
  migrations: number;
  success: number;
}

export interface RevenueData {
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  planRevenue: { plan: string; revenue: number; count: number }[];
  arpu: number;
  totalRevenue30d: number;
  ordersCount30d: number;
  uniquePayingUsers: number;
}

export interface UserDetail {
  user: User & { migrationCount: number; paidOrderCount: number };
  migrations: MigrationRecord[];
  orders: OrderRecord[];
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

interface AdminState {
  adminToken: string | null;
  adminUser: { id: number; username: string } | null;
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  migrationRecords: MigrationRecord[];
  orders: OrderRecord[];
  ordersTotal: number;
  ordersPage: number;
  stats: AdminStats;
  trendData: TrendData[];
  revenueData: RevenueData | null;
  userDetail: UserDetail | null;
  isLoading: boolean;
  error: string | null;

  verifyAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setupAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  checkSetupStatus: () => Promise<{ hasAdmin: boolean }>;
  clearAdminToken: () => void;
  fetchDashboard: () => Promise<void>;
  fetchUsers: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchMigrationRecords: (page?: number, limit?: number) => Promise<void>;
  fetchOrders: (page?: number, limit?: number, status?: string) => Promise<void>;
  fetchTrend: (days?: number) => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchUserDetail: (userId: number) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  clearError: () => void;
}

const emptyStats: AdminStats = {
  totalUsers: 0, totalMigrations: 0, completedMigrations: 0, failedMigrations: 0,
  inProgressMigrations: 0, todayPV: 0, todayUV: 0, platformDistribution: [],
  tierDistribution: [], conversionRate: 0, paidUsers: 0, totalOrders: 0,
  paidOrders: 0, totalRevenue: 0, monthlyRevenue: 0, orderByStatus: {}, orderByPlan: {},
};

function getAdminHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { 'X-Admin-Token': token } : {};
}

export const useAdminStore = create<AdminState>((set, get) => ({
  adminToken: null,
  adminUser: null,
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersLimit: 10,
  migrationRecords: [],
  orders: [],
  ordersTotal: 0,
  ordersPage: 1,
  stats: emptyStats,
  trendData: [],
  revenueData: null,
  userDetail: null,
  isLoading: false,
  error: null,

  verifyAdmin: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        localStorage.setItem('admin_token', data.token);
        if (data.user) localStorage.setItem('admin_user', JSON.stringify(data.user));
        set({ adminToken: data.token, adminUser: data.user || null, isLoading: false });
        return { success: true };
      }
      set({ error: data.error || '登录失败', isLoading: false });
      return { success: false, error: data.error || '登录失败' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '登录请求失败';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  setupAdmin: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        localStorage.setItem('admin_token', data.token);
        if (data.user) localStorage.setItem('admin_user', JSON.stringify(data.user));
        set({ adminToken: data.token, adminUser: data.user || null, isLoading: false });
        return { success: true };
      }
      set({ error: data.error || '初始化失败', isLoading: false });
      return { success: false, error: data.error || '初始化失败' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '初始化请求失败';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  checkSetupStatus: async () => {
    try {
      const response = await fetch('/api/admin/setup-status');
      const data = await response.json();
      return { hasAdmin: data.hasAdmin || false };
    } catch {
      return { hasAdmin: true }; // 出错时默认已有管理员，走登录流程
    }
  },

  clearAdminToken: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ adminToken: null, adminUser: null });
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/admin/stats', { headers: getAdminHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      const raw = await response.json();
      const data = raw.data || raw;
      set({ stats: { ...emptyStats, ...data }, isLoading: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '获取数据失败';
      if (msg.includes('Admin') || msg.includes('token') || msg.includes('No token')) {
        localStorage.removeItem('admin_token');
        set({ adminToken: null });
      }
      set({ error: msg, isLoading: false });
    }
  },

  fetchUsers: async (page = 1, limit = 10, search) => {
    set({ isLoading: true, error: null });
    try {
      let url = `/api/admin/users?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const response = await fetch(url, { headers: getAdminHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      const result = await response.json();
      const data = result.data || result;
      set({
        users: data.users || [],
        usersTotal: data.pagination?.total || 0,
        usersPage: data.pagination?.page || 1,
        usersLimit: data.pagination?.limit || 10,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取用户列表失败', isLoading: false });
    }
  },

  fetchMigrationRecords: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/admin/migrations?page=${page}&limit=${limit}`, { headers: getAdminHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      const raw = await response.json();
      const data = raw.data || raw;
      set({ migrationRecords: data.migrations || [], isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取迁移记录失败', isLoading: false });
    }
  },

  fetchOrders: async (page = 1, limit = 10, status) => {
    set({ isLoading: true, error: null });
    try {
      let url = `/api/admin/orders?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      const response = await fetch(url, { headers: getAdminHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      const result = await response.json();
      const data = result.data || result;
      set({
        orders: data.orders || [],
        ordersTotal: data.pagination?.total || 0,
        ordersPage: data.pagination?.page || 1,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取订单失败', isLoading: false });
    }
  },

  fetchTrend: async (days = 7) => {
    try {
      const response = await fetch(`/api/admin/trend?days=${days}`, { headers: getAdminHeaders() });
      if (!response.ok) return;
      const result = await response.json();
      if (result.ok) set({ trendData: result.data || [] });
    } catch (error) {
      console.error('Fetch trend error:', error);
    }
  },

  fetchRevenue: async () => {
    try {
      const response = await fetch('/api/admin/revenue', { headers: getAdminHeaders() });
      if (!response.ok) return;
      const result = await response.json();
      if (result.ok) set({ revenueData: result.data });
    } catch (error) {
      console.error('Fetch revenue error:', error);
    }
  },

  fetchUserDetail: async (userId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/admin/user-detail?userId=${userId}`, { headers: getAdminHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      const result = await response.json();
      set({ userDetail: result.data, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取用户详情失败', isLoading: false });
    }
  },

  deleteUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
        usersTotal: state.usersTotal - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除用户失败', isLoading: false });
    }
  },

  deleteOrder: async (orderId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/admin/orders?orderId=${orderId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `请求失败: ${response.status}`);
      }
      set((state) => ({
        orders: state.orders.filter((o) => o.order_id !== orderId),
        ordersTotal: state.ordersTotal - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除订单失败', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
