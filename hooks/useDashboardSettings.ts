import { usePageSettings, PageState } from './usePageSettings';
import { LayoutConfig } from '@/lib/config';

// DashboardState is an alias for PageState for backward compatibility
export interface DashboardState {
  layoutConfig: LayoutConfig | null;
  topBarFilters: Record<string, any>;
  reportFilters: Record<string, Record<string, any>>;
  pinnedFilters: Record<string, string[]>;
}

export interface UseDashboardSettingsReturn {
  currentState: DashboardState;
  savedState: DashboardState | null;
  hasChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  updateCurrentState: (updates: Partial<DashboardState>) => void;
  updateReportFilters: (reportId: string, filters: Record<string, any>) => void;
  updatePinnedFilters: (reportId: string, pinnedKeys: string[]) => void;
}

export function useDashboardSettings(dashboardType: 'team-dashboard' | 'pi-dashboard'): UseDashboardSettingsReturn {
  // Use the generic page settings hook internally
  const pageSettings = usePageSettings(dashboardType);

  // Convert PageState to DashboardState (omit selectedCategories for dashboards)
  const currentState: DashboardState = {
    layoutConfig: pageSettings.currentState.layoutConfig || null,
    topBarFilters: pageSettings.currentState.topBarFilters || {},
    reportFilters: pageSettings.currentState.reportFilters || {},
    pinnedFilters: pageSettings.currentState.pinnedFilters || {},
  };

  const savedState: DashboardState | null = pageSettings.savedState ? {
    layoutConfig: pageSettings.savedState.layoutConfig || null,
    topBarFilters: pageSettings.savedState.topBarFilters || {},
    reportFilters: pageSettings.savedState.reportFilters || {},
    pinnedFilters: pageSettings.savedState.pinnedFilters || {},
  } : null;

  return {
    currentState,
    savedState,
    hasChanges: pageSettings.hasChanges,
    isSaving: pageSettings.isSaving,
    isLoading: pageSettings.isLoading,
    error: pageSettings.error,
    saveSettings: pageSettings.saveSettings,
    loadSettings: pageSettings.loadSettings,
    resetToDefaults: pageSettings.resetToDefaults,
    updateCurrentState: pageSettings.updateCurrentState,
    updateReportFilters: pageSettings.updateReportFilters,
    updatePinnedFilters: pageSettings.updatePinnedFilters,
  };
}

