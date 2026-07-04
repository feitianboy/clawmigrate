import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MigrationCategory,
  UnifiedSchema,
  ConflictResolution,
  PlatformAdapter,
  ParseResult,
} from '../adapters/core/types';

export type MigrationStep =
  | 'select-source'
  | 'export'
  | 'parse'
  | 'preview'
  | 'select-target'
  | 'import'
  | 'complete';

export interface HistoryRecord {
  id: string;
  sourcePlatform: string;
  targetPlatform: string;
  status: 'success' | 'failed' | 'pending';
  itemsCount: number;
  categories: string[];
  createdAt: string;
}

interface MigrationState {
  // 当前步骤
  currentStep: MigrationStep;
  stepHistory: MigrationStep[];

  // 源和目标平台
  sourcePlatform: PlatformAdapter | null;
  targetPlatform: PlatformAdapter | null;

  // 解析数据
  parsedSchema: UnifiedSchema | null;
  parseResult: ParseResult | null;
  rawExportData: string;

  // 用户选择
  selectedCategories: MigrationCategory[];
  conflictResolutions: Record<string, ConflictResolution>;

  // 导入提示词
  importPrompt: string;
  importInstructions: string;

  // 草稿 ID
  draftId: string | null;

  // Actions
  setStep: (step: MigrationStep) => void;
  goBack: () => void;
  goNext: () => void;
  setSourcePlatform: (adapter: PlatformAdapter | null) => void;
  setTargetPlatform: (adapter: PlatformAdapter | null) => void;
  setParsedData: (schema: UnifiedSchema | null, result: ParseResult | null) => void;
  setRawExportData: (data: string) => void;
  toggleCategory: (category: MigrationCategory) => void;
  setAllCategories: (categories: MigrationCategory[]) => void;
  setConflictResolution: (category: string, resolution: ConflictResolution) => void;
  setImportPrompt: (prompt: string, instructions: string) => void;
  reset: () => void;
  saveDraft: () => void;
  loadDraft: () => boolean;
  clearDraft: () => void;
}

const initialState = {
  currentStep: 'select-source' as MigrationStep,
  stepHistory: [] as MigrationStep[],
  sourcePlatform: null,
  targetPlatform: null,
  parsedSchema: null,
  parseResult: null,
  rawExportData: '',
  selectedCategories: Object.values(MigrationCategory),
  conflictResolutions: {},
  importPrompt: '',
  importInstructions: '',
  draftId: null,
};

export const useMigrationStore = create<MigrationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step: MigrationStep) => {
        set((state) => ({
          currentStep: step,
          stepHistory: [...state.stepHistory, step],
        }));
      },

      goBack: () => {
        const { stepHistory } = get();
        if (stepHistory.length > 1) {
          const newHistory = stepHistory.slice(0, -1);
          set({
            stepHistory: newHistory,
            currentStep: newHistory[newHistory.length - 1],
          });
        } else {
          set({ currentStep: 'select-source', stepHistory: ['select-source'] });
        }
      },

      goNext: () => {
        const { currentStep } = get();
        const stepOrder: MigrationStep[] = [
          'select-source',
          'export',
          'parse',
          'preview',
          'select-target',
          'import',
          'complete',
        ];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
          set({
            currentStep: stepOrder[currentIndex + 1],
            stepHistory: [...get().stepHistory, stepOrder[currentIndex + 1]],
          });
        }
      },

      setSourcePlatform: (adapter: PlatformAdapter | null) => {
        set({ sourcePlatform: adapter });
      },

      setTargetPlatform: (adapter: PlatformAdapter | null) => {
        set({ targetPlatform: adapter });
      },

      setParsedData: (schema: UnifiedSchema | null, result: ParseResult | null) => {
        set({ parsedSchema: schema, parseResult: result });
      },

      setRawExportData: (data: string) => {
        set({ rawExportData: data });
      },

      toggleCategory: (category: MigrationCategory) => {
        set((state) => {
          const exists = state.selectedCategories.includes(category);
          return {
            selectedCategories: exists
              ? state.selectedCategories.filter((c) => c !== category)
              : [...state.selectedCategories, category],
          };
        });
      },

      setAllCategories: (categories: MigrationCategory[]) => {
        set({ selectedCategories: categories });
      },

      setConflictResolution: (category: string, resolution: ConflictResolution) => {
        set((state) => ({
          conflictResolutions: { ...state.conflictResolutions, [category]: resolution },
        }));
      },

      setImportPrompt: (prompt: string, instructions: string) => {
        set({ importPrompt: prompt, importInstructions: instructions });
      },

      reset: () => {
        set({
          ...initialState,
          draftId: get().draftId || `draft-${Date.now()}`,
        });
      },

      saveDraft: () => {
        const state = get();
        const draft = {
          id: state.draftId || `draft-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentStep: state.currentStep,
          stepHistory: state.stepHistory,
          sourcePlatform: state.sourcePlatform?.id || null,
          targetPlatform: state.targetPlatform?.id || null,
          parsedSchema: state.parsedSchema,
          selectedCategories: state.selectedCategories,
          conflictResolutions: state.conflictResolutions,
        };
        localStorage.setItem('clawmigrate-draft', JSON.stringify(draft));
      },

      loadDraft: () => {
        const saved = localStorage.getItem('clawmigrate-draft');
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            set({
              draftId: draft.id,
              currentStep: draft.currentStep,
              stepHistory: draft.stepHistory,
              parsedSchema: draft.parsedSchema,
              selectedCategories: draft.selectedCategories,
              conflictResolutions: draft.conflictResolutions,
            });
            return true;
          } catch {
            return false;
          }
        }
        return false;
      },

      clearDraft: () => {
        localStorage.removeItem('clawmigrate-draft');
      },
    }),
    {
      name: 'clawmigrate-migration',
    }
  )
);
