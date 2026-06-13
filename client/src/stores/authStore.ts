import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const API_BASE = '/api';

// 双保险：localStorage 缓存用户信息，避免 Cookie 跨页面丢失
function saveUserLocal(user: User) {
  try { localStorage.setItem('clawmigrate_user', JSON.stringify(user)); } catch {}
}
function loadUserLocal(): User | null {
  try {
    const data = localStorage.getItem('clawmigrate_user');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}
function clearUserLocal() {
  try { localStorage.removeItem('clawmigrate_user'); } catch {}
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

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
      saveUserLocal(result.data.user);
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
      saveUserLocal(result.data.user);
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
      });
      clearUserLocal();
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
        // Cookie 验证失败，尝试 localStorage 兜底
        const localUser = loadUserLocal();
        if (localUser) {
          set({
            user: localUser,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
        set({ isAuthenticated: false, user: null, isLoading: false });
        return false;
      }

      set({
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
      });
      saveUserLocal(result.data);
      return true;
    } catch (error) {
      console.error('Check auth error:', error);
      // 网络错误时也尝试 localStorage 兜底
      const localUser = loadUserLocal();
      if (localUser) {
        set({
          user: localUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
      set({ isAuthenticated: false, user: null, isLoading: false });
      return false;
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
}));
