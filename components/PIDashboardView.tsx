'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import AddReportsModal from './AddReportsModal';
import { ApiService } from '@/lib/api';
import type { ReportDefinition, LayoutConfig } from '@/lib/config';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { configCache } from '@/lib/configCache';

interface PIDashboardViewProps {
  selectedPI?: string;
  selectedTeam?: string;
  selectedTreeType?: 'group' | 'team';
  selectedTreeValue?: string | null;
}

const PI_DASHBOARD_DEFAULTS = ['pi-burndown', 'pi-predictability', 'epic-scope-changes', 'sprint-predictability'];

const PIDashboardView: React.FC<PIDashboardViewProps> = ({
  selectedPI,
  selectedTeam,
  selectedTreeType,
  selectedTreeValue,
}) => {
  const [reportOrder, setReportOrder] = useState<string[] | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAddReportsModalOpen, setIsAddReportsModalOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  
  // Dashboard settings hook
  const dashboardSettings = useDashboardSettings('pi-dashboard');

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      // Reset refs on unmount so settings can be reapplied when returning to dashboard
      settingsAppliedRef.current = false;
      configLoadedRef.current = false;
      prevLayoutRef.current = null;
      prevFiltersRef.current = { selectedPI: '', selectedTeam: '', selectedTreeType: 'team' };
    };
  }, []);

  // Listen for open modal event from top bar
  useEffect(() => {
    const handleOpenModal = () => {
      console.log('PIDashboardView: Received open-add-reports-modal event');
      // Use functional update to avoid stale closure
      setIsAddReportsModalOpen(prev => {
        console.log('PIDashboardView: Current modal state:', prev);
        console.log('PIDashboardView: Setting modal state to true');
        return true;
      });
    };
    
    window.addEventListener('open-add-reports-modal', handleOpenModal);
    console.log('PIDashboardView: Event listener attached');
    return () => window.removeEventListener('open-add-reports-modal', handleOpenModal);
  }, []); // Empty dependency array - only run once

  const configLoadedRef = useRef(false);
  const systemConfigRef = useRef<{ config: any, definitionMap: Record<string, ReportDefinition> } | null>(null);
  const settingsAppliedRef = useRef(false);
  
  // Refs for latest values to avoid stale closures
  const selectedPIRef = useRef(selectedPI);
  const selectedTeamRef = useRef(selectedTeam);
  const selectedTreeTypeRef = useRef(selectedTreeType);
  const reportOrderRef = useRef(reportOrder);
  
  // Keep refs in sync
  useEffect(() => {
    selectedPIRef.current = selectedPI;
    selectedTeamRef.current = selectedTeam;
    selectedTreeTypeRef.current = selectedTreeType;
    reportOrderRef.current = reportOrder;
  }, [selectedPI, selectedTeam, selectedTreeType, reportOrder]);

  // Load system config and report definitions once
  useEffect(() => {
    if (configLoadedRef.current) return;
    
    let cancelled = false;
    const loadSystemConfig = async () => {
      try {
        const api = new ApiService();
        
        // Use cache to prevent duplicate API calls
        const [configs, definitions] = await Promise.all([
          configCache.getDashboardConfigs(() => api.getDashboardViewConfigs()),
          configCache.getReportDefinitions(() => api.getReportDefinitions()),
        ]);
        
        if (cancelled) return;

        const definitionMap: Record<string, ReportDefinition> = {};
        definitions.forEach((definition) => {
          definitionMap[definition.report_id] = definition;
        });

        // Filter reports for PI dashboard
        const piReports = definitions.filter((r) => {
          const allowedViews = r.meta_schema?.allowed_views || ['every-dashboard'];
          return allowedViews.includes('every-dashboard') || allowedViews.includes('pi-dashboard');
        });
        setAvailableReports(piReports);

        const viewConfig = configs.find((cfg) => cfg.view === 'pi-dashboard');
        systemConfigRef.current = { config: viewConfig, definitionMap };
        configLoadedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load PI dashboard config', error);
        }
      }
    };

    loadSystemConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const restoringFiltersRef = useRef(false);

  // Check if we need to restore filters BEFORE rendering (synchronous check)
  const needsRestore = useMemo(() => {
    if (dashboardSettings.isLoading || !dashboardSettings.savedState?.topBarFilters) {
      // If settings are loading, assume we might need to restore (be conservative)
      return dashboardSettings.isLoading;
    }
    const savedTeam = dashboardSettings.savedState.topBarFilters.selectedTeam || dashboardSettings.savedState.topBarFilters.team_name;
    const savedPI = dashboardSettings.savedState.topBarFilters.selectedPI;
    return (savedTeam && savedTeam !== selectedTeam) || (savedPI && savedPI !== selectedPI);
  }, [dashboardSettings.isLoading, dashboardSettings.savedState, selectedTeam, selectedPI]);

  // Set restoring flag immediately if restore is needed OR if settings are still loading
  if ((needsRestore || dashboardSettings.isLoading) && !restoringFiltersRef.current && !selectedPI) {
    restoringFiltersRef.current = true;
  }

  // Apply saved settings when they become available (only once)
  useEffect(() => {
    if (!configLoadedRef.current || dashboardSettings.isLoading || settingsAppliedRef.current) return;
    
    const viewConfig = systemConfigRef.current?.config;
    const definitionMap = systemConfigRef.current?.definitionMap || {};

        const normalizeAllowedViews = (report?: ReportDefinition): string[] => {
      if (!report) return ['every-dashboard'];
          const raw = Array.isArray(report.meta_schema?.allowed_views)
            ? report.meta_schema.allowed_views
            : ['every-dashboard'];
          const normalized = raw
            .map((view) => (typeof view === 'string' ? view.trim().toLowerCase() : ''))
            .filter((view): view is string => view.length > 0);
          return normalized.length > 0 ? Array.from(new Set(normalized)) : ['every-dashboard'];
        };

        const filterReportsForView = (reportIds: string[], view: string): string[] => {
          const unique: string[] = [];
          const seen = new Set<string>();
          reportIds.forEach((reportId) => {
        if (seen.has(reportId)) return;
            const definition = definitionMap[reportId];
            const allowedViews = normalizeAllowedViews(definition);
            if (allowedViews.includes('every-dashboard') || allowedViews.includes(view)) {
              seen.add(reportId);
              unique.push(reportId);
            }
          });
          return unique;
        };

    // Apply saved top bar filters
    if (dashboardSettings.savedState?.topBarFilters && 
        Object.keys(dashboardSettings.savedState.topBarFilters).length > 0) {
      console.log('[PIDashboard] Applying saved top bar filters:', dashboardSettings.savedState.topBarFilters);
      
      // Only dispatch event if current props don't match saved settings
      const savedTeam = dashboardSettings.savedState.topBarFilters.selectedTeam || dashboardSettings.savedState.topBarFilters.team_name;
      const savedPI = dashboardSettings.savedState.topBarFilters.selectedPI;
      
      const needsRestoreInEffect = (savedTeam && savedTeam !== selectedTeam) || (savedPI && savedPI !== selectedPI);
      
      if (needsRestoreInEffect) {
        console.log('[PIDashboard] Props mismatch, dispatching restore event');
        restoringFiltersRef.current = true; // Mark that we're waiting for filter restore
          window.dispatchEvent(new CustomEvent('restore-dashboard-filters', {
            detail: {
              dashboard: 'pi-dashboard',
              filters: dashboardSettings.savedState.topBarFilters
            }
          }));
      }
        }
        
    // Apply saved layout or fall back to system config
    if (dashboardSettings.savedState?.layoutConfig) {
          setLayoutConfig(dashboardSettings.savedState.layoutConfig);
      const reportIds = dashboardSettings.savedState.layoutConfig.rows.flatMap((row: any) => row.reportIds);
          const filteredReports = filterReportsForView(reportIds, 'pi-dashboard');
          setReportOrder(filteredReports.length > 0 ? filteredReports : PI_DASHBOARD_DEFAULTS);
        } else {
          // Fall back to system config
          const configuredReports = Array.isArray(viewConfig?.reportIds)
            ? filterReportsForView(viewConfig!.reportIds, 'pi-dashboard')
            : [];
          const fallbackReports = filterReportsForView(PI_DASHBOARD_DEFAULTS, 'pi-dashboard');

          if (configuredReports.length > 0) {
            setReportOrder(configuredReports);
            setLayoutConfig(viewConfig?.layout_config || null);
          } else if (fallbackReports.length > 0) {
            setReportOrder(fallbackReports);
            setLayoutConfig(null);
          } else {
            setReportOrder(PI_DASHBOARD_DEFAULTS);
            setLayoutConfig(null);
          }
        }
    
    settingsAppliedRef.current = true; // Mark as applied to prevent re-runs
          setConfigLoaded(true);
  }, [dashboardSettings.isLoading, dashboardSettings.savedState]);

  // Clear restoring flag when PI is actually set OR when PI is cleared (user deselected) OR when there's no saved PI to restore
  useEffect(() => {
    const hasValidPI = selectedPI && typeof selectedPI === 'string' && selectedPI.trim().length > 0;
    if (restoringFiltersRef.current) {
      if (hasValidPI) {
        console.log('[PIDashboard] PI restored, clearing restoring flag');
        restoringFiltersRef.current = false;
      } else if (!dashboardSettings.isLoading && settingsAppliedRef.current) {
        // PI was deselected by user or no PI to restore (not during initial load), clear the flag
        console.log('[PIDashboard] PI deselected by user or no PI to restore, clearing restoring flag');
        restoringFiltersRef.current = false;
      } else if (!dashboardSettings.isLoading && !dashboardSettings.savedState?.topBarFilters?.selectedPI && !dashboardSettings.savedState?.topBarFilters?.pi) {
        // No saved PI to restore, clear the flag immediately
        console.log('[PIDashboard] No saved PI to restore, clearing restoring flag');
        restoringFiltersRef.current = false;
      }
    }
  }, [selectedPI, dashboardSettings.isLoading, dashboardSettings.savedState]);
  
  const prevLayoutRef = useRef<string | null>(null);
  const prevFiltersRef = useRef({ selectedPI, selectedTeam, selectedTreeType });

  // Track layout config changes (only after settings have been applied and only if actually different from previous)
  useEffect(() => {
    if (!dashboardSettings.isLoading && layoutConfig !== null && settingsAppliedRef.current) {
      const layoutStr = JSON.stringify(layoutConfig);
      
      if (prevLayoutRef.current !== layoutStr) {
        console.log('[PIDashboard] Layout changed, updating state');
      dashboardSettings.updateCurrentState({ layoutConfig });
        prevLayoutRef.current = layoutStr;
      }
    }
  }, [layoutConfig, dashboardSettings.isLoading]);
  
  // Track top bar filters changes (only after settings have been applied and only if actually different from previous)
  useEffect(() => {
    if (!dashboardSettings.isLoading && settingsAppliedRef.current) {
      const newFilters = {
          selectedPI,
        selectedTeam,
          selectedTreeType,
      };
      
      const prev = prevFiltersRef.current;
      const isDifferent = prev.selectedPI !== newFilters.selectedPI ||
        prev.selectedTeam !== newFilters.selectedTeam ||
        prev.selectedTreeType !== newFilters.selectedTreeType;
      
      if (isDifferent) {
        console.log('[PIDashboard] Top bar filters changed, updating state');
        dashboardSettings.updateCurrentState({ topBarFilters: newFilters });
        prevFiltersRef.current = newFilters;
      }
    }
  }, [selectedPI, selectedTeam, selectedTreeType, dashboardSettings.isLoading]);
  
  // Create refs to hold latest values for event handlers
  const latestValuesRef = useRef({
    layoutConfig,
    selectedPI,
    selectedTeam,
    selectedTreeType,
    reportFilters: dashboardSettings.currentState.reportFilters,
    pinnedFilters: dashboardSettings.currentState.pinnedFilters,
  });
  
  // Update refs whenever values change
  useEffect(() => {
    latestValuesRef.current = {
      layoutConfig,
      selectedPI,
      selectedTeam,
      selectedTreeType,
      reportFilters: dashboardSettings.currentState.reportFilters,
      pinnedFilters: dashboardSettings.currentState.pinnedFilters,
    };
  }, [layoutConfig, selectedPI, selectedTeam, selectedTreeType, dashboardSettings.currentState.reportFilters, dashboardSettings.currentState.pinnedFilters]);
  
  // Set up event listeners once
  useEffect(() => {
    const handleSaveRequest = async () => {
      try {
        console.log('[PIDashboard] Save requested');
        
        // The tracking useEffects should have already updated the state
        // Just save what's in the current state
        await dashboardSettings.saveSettings();
        
        console.log('[PIDashboard] Save completed');
        window.dispatchEvent(new CustomEvent('dashboard-settings-saved'));
      } catch (err) {
        console.error('[PIDashboard] Save failed:', err);
        window.dispatchEvent(new CustomEvent('dashboard-settings-save-failed', { 
          detail: { error: err } 
        }));
      }
    };
    
    const handleResetRequest = async () => {
      try {
        await dashboardSettings.resetToDefaults();
      } catch (err) {
        console.error('Failed to reset settings:', err);
      }
    };
    
    const handleCollectDashboardData = () => {
      console.log('[PIDashboard] Dashboard data collection requested');
      // Use ref to access latest values
      const latest = latestValuesRef.current;
      const data = {
        layoutConfig: latest.layoutConfig,
        topBarFilters: {
          selectedPI: latest.selectedPI,
          selectedTeam: latest.selectedTeam,
          selectedTreeType: latest.selectedTreeType,
        },
        reportFilters: latest.reportFilters,
        pinnedFilters: latest.pinnedFilters,
      };
      console.log('[PIDashboard] Collected dashboard data:', data);
      window.dispatchEvent(new CustomEvent('dashboard-data-collected', { detail: data }));
    };
    
    window.addEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
    window.addEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    window.addEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    
    return () => {
      window.removeEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
      window.removeEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
      window.removeEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    };
  }, []); // Empty deps - handlers access latest values via ref

  // Dispatch state changes to parent only when settings state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dashboard-settings-state', {
      detail: {
        hasChanges: dashboardSettings.hasChanges,
        isSaving: dashboardSettings.isSaving,
        error: dashboardSettings.error,
      },
    }));
  }, [dashboardSettings.hasChanges, dashboardSettings.isSaving, dashboardSettings.error]);

  // Handler to open AI chat for a specific report
  const handleReportAIChat = useCallback((reportId: string) => {
    console.log('[PIDashboardView] Opening AI chat for report:', reportId);
    
    // Get current dashboard data from ref
    const latest = latestValuesRef.current;
    const data = {
      layoutConfig: {
        rows: [{
          id: 'single-report',
          reportIds: [reportId]
        }]
      },
      topBarFilters: {
        selectedPI: latest.selectedPI,
        selectedTeam: latest.selectedTeam,
        selectedTreeType: latest.selectedTreeType,
      },
      reportFilters: {
        [reportId]: latest.reportFilters[reportId] || {}
      },
      pinnedFilters: {
        [reportId]: latest.pinnedFilters[reportId] || []
      },
    };
    
    console.log('[PIDashboardView] Dispatching report AI chat data:', data);
    
    // Dispatch event to open AI chat with this specific report's data
    window.dispatchEvent(new CustomEvent('open-report-ai-chat', { detail: data }));
  }, []);

  const commonPanelProps = useMemo(
    () => ({
      // No loadingFallback - let report views handle loading within ReportCard
      errorFallback: (errorMessage: string) => {
        // Check if error is related to missing team/group - show empty state instead of error
        const isTeamNotFoundError = 
          typeof errorMessage === 'string' && (
            errorMessage.includes("Team '") && errorMessage.includes("' not found") ||
            errorMessage.includes('404: Team') ||
            errorMessage.includes('Team not found') ||
            errorMessage.includes('Group not found') ||
            errorMessage.includes("Group '") && errorMessage.includes("' not found") ||
            errorMessage.includes("Group '") && errorMessage.includes("' has no teams") ||
            errorMessage.includes('has no teams')
          );
        
        if (isTeamNotFoundError) {
          // Return empty state instead of error
          return (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 text-sm">No data available</div>
            </div>
          );
        }
        
        // Show error for other types of errors
        return (
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500">Error: {errorMessage}</div>
        </div>
        );
      },
    }),
    []
  );

  // Memoize controlledFilters to prevent infinite re-renders in ReportPanel
  const controlledFiltersPI = useMemo(() => ({ pi: selectedPI || null }), [selectedPI]);
  const controlledFiltersPINames = useMemo(() => ({ 
    pi_names: selectedPI ? [selectedPI] : [],
    ...(selectedTeam ? { team_name: selectedTeam } : {}),
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);
  const controlledFiltersTeam = useMemo(() => ({
    ...(selectedTeam ? { team_name: selectedTeam } : {}),
    isGroup: selectedTreeType === 'group',
  }), [selectedTeam, selectedTreeType]);
  const controlledFiltersQuarters = useMemo(() => ({ 
    quarters: selectedPI ? [selectedPI] : [] 
  }), [selectedPI]);
  const controlledFiltersPITeam = useMemo(() => ({
    pi: selectedPI || null,
    ...(selectedTeam ? { team_name: selectedTeam } : {}),
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);
  const controlledFiltersDefault = useMemo(() => ({
    ...(selectedPI ? { pi: selectedPI } : {}),
    ...(selectedTeam ? { team_name: selectedTeam, team: selectedTeam } : {}),
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);

  // Use only reportId as key to preserve component state (including pinned filters) when top bar changes
  const buildPanelKey = (reportId: string) => reportId;

  const renderReportSection = (reportId: string, panelKey: string) => {
    // Don't render reports if PI is not set (must be non-empty string) or we're restoring filters
    const hasValidPI = selectedPI && typeof selectedPI === 'string' && selectedPI.trim().length > 0;
    if (!hasValidPI || restoringFiltersRef.current || dashboardSettings.isLoading) {
      console.log(`[PIDashboard] Blocking render of ${reportId}: selectedPI="${selectedPI}", hasValidPI=${hasValidPI}, restoring=${restoringFiltersRef.current}, loading=${dashboardSettings.isLoading}`);
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
        </div>
      );
    }

    // Get saved filters and pinned state for this report from user settings
    const savedReportFilters = dashboardSettings.savedState?.reportFilters?.[reportId] || {};
    const savedPinnedFilters = dashboardSettings.savedState?.pinnedFilters?.[reportId] || [];
    
    switch (reportId) {
      case 'pi-burndown':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-burndown"
            initialFilters={{
              issue_type: 'Epic',
              pi: selectedPI,
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersPI}
            enabled={true}
            componentProps={{ 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'pi-predictability':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-predictability"
            initialFilters={{
              pi_names: selectedPI ? [selectedPI] : [],
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersPINames}
            enabled={true}
            componentProps={{ 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'sprint-predictability':
        return (
          <ReportPanel
            key={panelKey}
            reportId="sprint-predictability"
            initialFilters={{ 
              months: 3,
              ...(selectedTeam ? { team_name: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersTeam}
            enabled={Boolean(selectedPI)}
            componentProps={{ 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'epic-scope-changes':
        return (
          <ReportPanel
            key={panelKey}
            reportId="epic-scope-changes"
            initialFilters={{
              quarters: selectedPI ? [selectedPI] : [],
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersQuarters}
            enabled={true}
            componentProps={{ 
              autoSelectFirst: false, 
              selectedPI, 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'pi-metrics-summary':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-metrics-summary"
            initialFilters={{ 
              pi: selectedPI,
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersPITeam}
            enabled={true}
            componentProps={{ 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      default:
        return (
          <ReportPanel
            key={panelKey}
            reportId={reportId}
            initialFilters={{
              ...(selectedPI ? { pi: selectedPI } : {}),
              ...(selectedTeam ? { team_name: selectedTeam, team: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersDefault}
            enabled={Boolean(selectedPI)}
            componentProps={{ 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
    }
  };

  if (!configLoaded || !reportOrder) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">Loading dashboard configuration...</div>
        </div>
      </div>
    );
  }

  // Wait for settings to apply before rendering reports to avoid fetching with wrong filters
  // Also wait if we don't have a PI yet (might be restoring)
  const hasValidPI = selectedPI && typeof selectedPI === 'string' && selectedPI.trim().length > 0;
  const hasPIInFilters = controlledFiltersPI.pi === selectedPI;
  
  // Check if user intentionally deselected PI (no PI, settings applied, not loading)
  const userDeselectedPI = !hasValidPI && !dashboardSettings.isLoading && settingsAppliedRef.current;
  
  // Only show loading spinner if we're actually loading/restoring AND NOT if user intentionally deselected
  const isActuallyLoading = dashboardSettings.isLoading;
  const needsPIInFilters = hasValidPI && !hasPIInFilters; // Only wait for filters if we have a PI
  // Only show "restoring" spinner if we're restoring AND we have a PI (not if user cleared it)
  const isRestoringWithExpectedPI = restoringFiltersRef.current && (dashboardSettings.savedState?.topBarFilters?.selectedPI || dashboardSettings.savedState?.topBarFilters?.pi);
  
  // Show spinner only if actually loading OR actively restoring with expected PI OR if we have a PI but filters aren't ready yet
  // But NEVER if user intentionally deselected (skip spinner check entirely)
  if (userDeselectedPI) {
    // If user intentionally deselected, skip spinner and show "Select a PI" message below
  } else if (isActuallyLoading || isRestoringWithExpectedPI || needsPIInFilters) {
    console.log(`[PIDashboard] Early return: hasValidPI=${hasValidPI}, hasPIInFilters=${hasPIInFilters}, isLoading=${dashboardSettings.isLoading}, restoring=${restoringFiltersRef.current}, expectedPI=${isRestoringWithExpectedPI}`);
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">
            {dashboardSettings.isLoading ? 'Loading dashboard settings...' : 
             isRestoringWithExpectedPI ? 'Restoring saved filters...' : 
             needsPIInFilters ? 'Preparing filters...' :
             'Loading PI selection...'}
          </div>
        </div>
      </div>
    );
  }

  // Show "Select a PI" message if no PI is selected (user intentionally deselected)
  if (!hasValidPI) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a PI</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Please select a PI from the dropdown above to view dashboard insights and reports.
          </p>
        </div>
      </div>
    );
  }

  // Render with layout configuration if available
  if (layoutConfig && layoutConfig.rows && layoutConfig.rows.length > 0) {
    // Don't render reports if PI is not set or we're restoring filters
    if (!selectedPI || restoringFiltersRef.current) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">
              {restoringFiltersRef.current ? 'Restoring saved filters...' : 'Loading...'}
            </div>
          </div>
        </div>
      );
    }

    // On mobile, render as single column regardless of layout
    if (isMobile) {
      console.log('PIDashboardView: Rendering MOBILE view with modal');
      const allReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);
      
      return (
        <>
        <div className="space-y-4 p-2">
          {allReportIds.map((reportId) => {
            const panelKey = buildPanelKey(reportId);
            return (
              <div key={panelKey}>
                {renderReportSection(reportId, panelKey)}
              </div>
            );
          })}
        </div>
          
          <AddReportsModal
            isOpen={isAddReportsModalOpen}
            onClose={() => {
              console.log('PIDashboardView (mobile): Modal onClose called');
              setIsAddReportsModalOpen(false);
            }}
            availableReports={availableReports}
            currentReportIds={allReportIds}
            onUpdateReports={(reportIds: string[]) => {
              console.log('PIDashboard Mobile: handleUpdateReports called with:', reportIds);
              // For mobile, update the layout to show selected reports
              const newLayout: LayoutConfig = {
                rows: [{ id: 'row-1', reportIds: reportIds }]
              };
              setLayoutConfig(newLayout);
              localStorage.setItem(`dashboard-layout-pi-${selectedPI}-${selectedTeam}`, JSON.stringify(newLayout));
            }}
          />
        </>
      );
    }

    // Desktop: use draggable and resizable grid
    const handleLayoutChange = (newLayout: LayoutConfig) => {
      setLayoutConfig(newLayout);
      localStorage.setItem(`dashboard-layout-pi-${selectedPI}`, JSON.stringify(newLayout));
    };

    const handleRemoveReport = (reportId: string) => {
      const newLayout: LayoutConfig = {
        rows: layoutConfig.rows.map((row) => ({
          ...row,
          reportIds: row.reportIds.filter((id) => id !== reportId),
        })).filter((row) => row.reportIds.length > 0),
      };
      
      // If all rows are empty, create one empty row
      if (newLayout.rows.length === 0) {
        newLayout.rows = [{ id: 'row-1', reportIds: [] }];
      }
      
      setLayoutConfig(newLayout);
      localStorage.setItem(`dashboard-layout-pi-${selectedPI}`, JSON.stringify(newLayout));
    };

    const handleUpdateReports = (reportIds: string[]) => {
      let newLayout: LayoutConfig = { ...layoutConfig };
      
      // Get reports to add and remove
      const reportsToAdd = reportIds.filter(id => !currentReportIds.includes(id));
      const reportsToRemove = currentReportIds.filter(id => !reportIds.includes(id));
      
      // Remove unchecked reports from layout
      if (reportsToRemove.length > 0) {
        newLayout.rows = newLayout.rows
          .map((row) => ({
            ...row,
            reportIds: row.reportIds.filter((id) => !reportsToRemove.includes(id)),
          }))
          .filter((row) => row.reportIds.length > 0); // Remove empty rows
      }
      
      // Add new reports - 2 per row
      if (reportsToAdd.length > 0) {
        // If layout is completely empty, create fresh rows
        if (newLayout.rows.length === 0 || newLayout.rows.every(r => r.reportIds.length === 0)) {
          const newRows: { id: string; reportIds: string[] }[] = [];
          for (let i = 0; i < reportsToAdd.length; i += 2) {
            newRows.push({
              id: `row-${Date.now()}-${i}`,
              reportIds: reportsToAdd.slice(i, i + 2),
            });
          }
          newLayout.rows = newRows;
        } else {
          // Add to existing layout
          const newRows: { id: string; reportIds: string[] }[] = [];
          for (let i = 0; i < reportsToAdd.length; i += 2) {
            newRows.push({
              id: `row-${Date.now()}-${i}`,
              reportIds: reportsToAdd.slice(i, i + 2),
            });
          }
          newLayout.rows = [...newLayout.rows, ...newRows];
        }
      }
      
      setLayoutConfig(newLayout);
      localStorage.setItem(`dashboard-layout-pi-${selectedPI}`, JSON.stringify(newLayout));
    };

    const currentReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 px-4 pb-4 overflow-auto">
          <DraggableResizableGrid
            layout={layoutConfig}
            onLayoutChange={handleLayoutChange}
            renderReport={(reportId) => renderReportSection(reportId, buildPanelKey(reportId))}
            onRemoveReport={handleRemoveReport}
            defaultRowHeight={500}
            minRowHeight={500}
          />
        </div>

        <AddReportsModal
          isOpen={isAddReportsModalOpen}
          onClose={() => setIsAddReportsModalOpen(false)}
          availableReports={availableReports}
          currentReportIds={currentReportIds}
          onUpdateReports={handleUpdateReports}
        />
      </div>
    );
  }

  // Fallback to default layout - simple handler for fallback case
  const handleUpdateReportsFallback = (reportIds: string[]) => {
    console.log('Fallback: handleUpdateReports called with:', reportIds);
    // For the fallback case, just update the display order
    setReportOrder(reportIds);
  };

  // Don't render reports if PI is not set or we're restoring filters
  if (!selectedPI || restoringFiltersRef.current) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">
            {restoringFiltersRef.current ? 'Restoring saved filters...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {reportOrder.length === 0 ? (
          <div className="p-4 text-gray-500">
            No reports are configured for the PI dashboard yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reportOrder.map((reportId, index) => {
              const panelKey = buildPanelKey(reportId);
              return (
                <div key={panelKey} style={isMobile ? {} : { height: '500px' }}>
                  {renderReportSection(reportId, panelKey)}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <AddReportsModal
        isOpen={isAddReportsModalOpen}
        onClose={() => setIsAddReportsModalOpen(false)}
        availableReports={availableReports}
        currentReportIds={reportOrder}
        onUpdateReports={handleUpdateReportsFallback}
      />
    </div>
  );
};

export default PIDashboardView;

