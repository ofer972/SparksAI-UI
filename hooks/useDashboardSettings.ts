import { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardConfig, getUserDashboardSettings, updateDashboardSettings, resetUserSettings } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { LayoutConfig } from '@/lib/config';

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

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function hasStateChanges(current: DashboardState, saved: DashboardState | null): boolean {
  if (!saved) return true; // No saved state means we should allow saving
  
  // Deep compare layout configs
  if (!deepEqual(current.layoutConfig, saved.layoutConfig)) return true;
  
  // Deep compare top bar filters
  if (!deepEqual(current.topBarFilters, saved.topBarFilters)) return true;
  
  // Deep compare all report filters
  if (!deepEqual(current.reportFilters, saved.reportFilters)) return true;
  
  // Deep compare pinned filters
  if (!deepEqual(current.pinnedFilters, saved.pinnedFilters)) return true;
  
  return false;
}

export function useDashboardSettings(dashboardType: 'team-dashboard' | 'pi-dashboard'): UseDashboardSettingsReturn {
  const [currentState, setCurrentState] = useState<DashboardState>({
    layoutConfig: null,
    topBarFilters: {},
    reportFilters: {},
    pinnedFilters: {},
  });
  
  const [savedState, setSavedState] = useState<DashboardState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initialLoadDone = useRef(false);
  const currentStateRef = useRef<DashboardState>(currentState);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    if (initialLoadDone.current) return; // Only load once on mount
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user = getCurrentUser();
      if (!user?.id) {
        console.warn('[useDashboardSettings] No user ID found');
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }

      const settings = await getUserDashboardSettings(user.id);
      const dashboardConfig = settings.dashboard_settings?.[dashboardType];

      if (dashboardConfig) {
        const loadedState: DashboardState = {
          layoutConfig: dashboardConfig.layoutConfig || null,
          topBarFilters: dashboardConfig.topBarFilters || {},
          reportFilters: dashboardConfig.reportFilters || {},
          pinnedFilters: dashboardConfig.pinnedFilters || {},
        };
        
        setSavedState(loadedState);
        setCurrentState(loadedState);
      }
      
      initialLoadDone.current = true;
    } catch (err) {
      console.error('[useDashboardSettings] Failed to load settings:', err);
      setError('Failed to load dashboard settings');
      initialLoadDone.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [dashboardType]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Check for changes whenever current state changes
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setHasChanges(hasStateChanges(currentState, savedState));
  }, [currentState, savedState]);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const user = getCurrentUser();
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      // Use ref to get the latest state (in case React state hasn't updated yet)
      const latestState = currentStateRef.current;
      console.log('[useDashboardSettings] Saving with state:', latestState);

      const config: DashboardConfig = {
        layoutConfig: latestState.layoutConfig,
        topBarFilters: latestState.topBarFilters,
        reportFilters: latestState.reportFilters, // Save all report filters
        pinnedFilters: latestState.pinnedFilters,
      };

      console.log('[useDashboardSettings] Saving config:', config);
      await updateDashboardSettings(user.id, dashboardType, config);
      
      // Update savedState to match what was actually saved
      setSavedState({ ...latestState });
      setHasChanges(false);
      console.log('[useDashboardSettings] Save complete, new savedState:', latestState);
    } catch (err) {
      console.error('[useDashboardSettings] Failed to save settings:', err);
      setError('Failed to save dashboard settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [dashboardType]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const user = getCurrentUser();
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      await resetUserSettings(user.id);
      
      const emptyState: DashboardState = {
        layoutConfig: null,
        topBarFilters: {},
        reportFilters: {},
        pinnedFilters: {},
      };
      
      setSavedState(null);
      setCurrentState(emptyState);
      setHasChanges(false);
    } catch (err) {
      console.error('[useDashboardSettings] Failed to reset settings:', err);
      setError('Failed to reset dashboard settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update current state
  const updateCurrentState = useCallback((updates: Partial<DashboardState>) => {
    setCurrentState(prev => ({ ...prev, ...updates }));
  }, []);

  // Update report filters
  const updateReportFilters = useCallback((reportId: string, filters: Record<string, any>) => {
    setCurrentState(prev => ({
      ...prev,
      reportFilters: {
        ...prev.reportFilters,
        [reportId]: filters,
      },
    }));
  }, []);

  // Update pinned filters
  const updatePinnedFilters = useCallback((reportId: string, pinnedKeys: string[]) => {
    setCurrentState(prev => ({
      ...prev,
      pinnedFilters: {
        ...prev.pinnedFilters,
        [reportId]: pinnedKeys,
      },
    }));
  }, []);

  return {
    currentState,
    savedState,
    hasChanges,
    isSaving,
    isLoading,
    error,
    saveSettings,
    loadSettings,
    resetToDefaults,
    updateCurrentState,
    updateReportFilters,
    updatePinnedFilters,
  };
}

