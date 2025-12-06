import { useState, useCallback, useEffect, useRef } from 'react';
import { PageSettings, PageType, getPageSettings, updatePageSettings } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { LayoutConfig } from '@/lib/config';

export interface PageState {
  layoutConfig?: LayoutConfig | null;
  topBarFilters?: Record<string, any>;
  reportFilters?: Record<string, Record<string, any>>;
  pinnedFilters?: Record<string, string[]>;
  selectedCategories?: string[];
}

export interface UsePageSettingsReturn {
  currentState: PageState;
  savedState: PageState | null;
  hasChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  updateCurrentState: (updates: Partial<PageState>) => void;
  updateReportFilters: (reportId: string, filters: Record<string, any>) => void;
  updatePinnedFilters: (reportId: string, pinnedKeys: string[]) => void;
}

function deepEqual(a: any, b: any): boolean {
  // Handle exact equality
  if (a === b) return true;
  
  // Handle null/undefined - treat null and undefined as equal
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  
  // Handle different types
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle array vs non-array
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Handle objects - sort keys for consistent comparison
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function hasStateChanges(current: PageState, saved: PageState | null): boolean {
  if (!saved) return true; // No saved state means we should allow saving
  
  // Deep compare all fields
  if (!deepEqual(current.layoutConfig, saved.layoutConfig)) return true;
  if (!deepEqual(current.topBarFilters, saved.topBarFilters)) return true;
  if (!deepEqual(current.reportFilters, saved.reportFilters)) return true;
  if (!deepEqual(current.pinnedFilters, saved.pinnedFilters)) return true;
  if (!deepEqual(current.selectedCategories, saved.selectedCategories)) return true;
  
  return false;
}

export function usePageSettings(pageType: PageType): UsePageSettingsReturn {
  const [currentState, setCurrentState] = useState<PageState>({
    layoutConfig: null,
    topBarFilters: {},
    reportFilters: {},
    pinnedFilters: {},
    selectedCategories: [],
  });
  
  const [savedState, setSavedState] = useState<PageState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initialLoadDone = useRef(false);
  const currentStateRef = useRef<PageState>(currentState);
  const pageTypeRef = useRef(pageType);
  
  // Reset load flag when page type changes (e.g., switching between dashboards)
  useEffect(() => {
    if (pageTypeRef.current !== pageType) {
      console.log(`[usePageSettings] Page type changed from ${pageTypeRef.current} to ${pageType}, resetting load flag`);
      initialLoadDone.current = false;
      pageTypeRef.current = pageType;
    }
  }, [pageType]);
  
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
        console.warn('[usePageSettings] No user ID found');
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }

      const settings = await getPageSettings(user.id, pageType);

      if (settings) {
        const loadedState: PageState = {
          layoutConfig: settings.layoutConfig || null,
          topBarFilters: settings.topBarFilters || {},
          reportFilters: settings.reportFilters || {},
          pinnedFilters: settings.pinnedFilters || {},
          selectedCategories: settings.selectedCategories || [],
        };
        
        setSavedState(loadedState);
        setCurrentState(loadedState);
      }
      
      initialLoadDone.current = true;
    } catch (err) {
      console.error('[usePageSettings] Failed to load settings:', err);
      setError('Failed to load page settings');
      initialLoadDone.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [pageType]);

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
      console.log('[usePageSettings] Saving with state:', latestState);

      const config: PageSettings = {
        layoutConfig: latestState.layoutConfig,
        topBarFilters: latestState.topBarFilters,
        reportFilters: latestState.reportFilters,
        pinnedFilters: latestState.pinnedFilters,
        selectedCategories: latestState.selectedCategories,
      };

      console.log('[usePageSettings] Saving config:', config);
      await updatePageSettings(user.id, pageType, config);
      
      // Update savedState to match what was actually saved
      setSavedState({ ...latestState });
      setHasChanges(false);
      console.log('[usePageSettings] Save complete, new savedState:', latestState);
    } catch (err) {
      console.error('[usePageSettings] Failed to save settings:', err);
      setError('Failed to save page settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [pageType]);

  // Reset to defaults - only resets the current page type, not all pages
  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const user = getCurrentUser();
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      // Reset only this specific page type's settings, not all user settings
      const emptyState: PageState = {
        layoutConfig: null,
        topBarFilters: {},
        reportFilters: {},
        pinnedFilters: {},
        selectedCategories: [],
      };
      
      // Update the page settings to empty values (this effectively resets just this page)
      await updatePageSettings(user.id, pageType, emptyState);
      
      setSavedState(null);
      setCurrentState(emptyState);
      setHasChanges(false);
      
      console.log(`[usePageSettings] Reset settings for page type: ${pageType}`);
    } catch (err) {
      console.error('[usePageSettings] Failed to reset page settings:', err);
      setError('Failed to reset page settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [pageType]);

  // Update current state
  const updateCurrentState = useCallback((updates: Partial<PageState>) => {
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

