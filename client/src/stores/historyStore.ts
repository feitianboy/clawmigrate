import { create } from 'zustand';
import { apiFetch } from '../utils/apiFetch';
import { HistoryRecord } from './migrationStore';

interface HistoryState {
  records: HistoryRecord[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: () => Promise<boolean>;
  clearHistory: () => void;
}

const API_BASE = '/api';

export const useHistoryStore = create<HistoryState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  fetchHistory: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`${API_BASE}/migrations`, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        set({ error: result.error || '获取历史记录失败', isLoading: false });
        return false;
      }

      set({ records: result.data || [], isLoading: false });
      return true;
    } catch (error) {
      console.error('Fetch history error:', error);
      set({ error: '网络错误，请稍后重试', isLoading: false });
      return false;
    }
  },

  clearHistory: () => {
    set({ records: [], error: null });
  },
}));
