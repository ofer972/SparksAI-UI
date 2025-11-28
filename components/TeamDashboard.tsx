'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import AddReportsModal from './AddReportsModal';
import type { ReportInstancePayload, LayoutConfig, ReportDefinition } from '@/lib/config';
import { ApiService } from '@/lib/api';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';

interface TeamDashboardProps {
  selectedTeam: string;
  selectedTreeType?: 'group' | 'team';
  selectedTreeValue?: string | null;
}

const TEAM_DASHBOARD_DEFAULTS = ['team-current-sprint-progress', 'team-closed-sprints', 'team-sprint-burndown', 'team-issues-trend', 'sprint-predictability'];

const SPRINT_OPTIONS = [
  { value: '', label: 'Current Sprint' },
    { value: 'IDPS-DEV-2025-10-19', label: 'IDPS-DEV-2025-10-19' },
    { value: 'IDPS-DEV-2025-10-05', label: 'IDPS-DEV-2025-10-05' },
    { value: 'IDPS-DEV-2025-09-21', label: 'IDPS-DEV-2025-09-21' },
    { value: 'IDPS-DEV-2025-09-07', label: 'IDPS-DEV-2025-09-07' },
    { value: 'IDPS-DEV-2025-08-24', label: 'IDPS-DEV-2025-08-24' },
    { value: 'IDPS-DEV-2025-08-10', label: 'IDPS-DEV-2025-08-10' },
    { value: 'IDPS-DEV-2025-07-27', label: 'IDPS-DEV-2025-07-27' },
    { value: 'IDPS-DEV-2025-07-13', label: 'IDPS-DEV-2025-07-13' },
    { value: 'IDPS-DEV-2025-06-29', label: 'IDPS-DEV-2025-06-29' },
  ];

export default function TeamDashboard({ selectedTeam, selectedTreeType, selectedTreeValue }: TeamDashboardProps) {
  console.log('TeamDashboard: Component rendering, selectedTeam:', selectedTeam);
  
  const [dashboardReports, setDashboardReports] = useState<string[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAddReportsModalOpen, setIsAddReportsModalOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  
  // Use a ref to track if modal should be open (persists across renders)
  const modalShouldBeOpen = useRef(false);
  const forceUpdate = useState(0)[1];
  
  console.log('TeamDashboard: Current isAddReportsModalOpen in render:', isAddReportsModalOpen);
  console.log('TeamDashboard: modalShouldBeOpen.current:', modalShouldBeOpen.current);
  
  // Dashboard settings hook
  const dashboardSettings = useDashboardSettings('team-dashboard');
  
  // Track component lifecycle
  useEffect(() => {
    console.log('TeamDashboard: Component MOUNTED for team:', selectedTeam);
    return () => {
      console.log('TeamDashboard: Component UNMOUNTING for team:', selectedTeam);
      // Reset refs on unmount so settings can be reapplied when returning to dashboard
      settingsAppliedRef.current = false;
      configLoadedRef.current = false;
      prevLayoutRef.current = null;
      prevFiltersRef.current = { selectedTeam: '', selectedTreeType: 'team', selectedSprint: '' };
    };
  }, [selectedTeam]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for open modal event from top bar
  useEffect(() => {
    const handleOpenModal = () => {
      console.log('TeamDashboard: Received open-add-reports-modal event');
      console.log('TeamDashboard: Setting ref and state');
      
      // Set ref (persists across renders)
      modalShouldBeOpen.current = true;
      console.log('TeamDashboard: modalShouldBeOpen.current set to true');
      
      // Set state
      setIsAddReportsModalOpen(true);
      console.log('TeamDashboard: setIsAddReportsModalOpen(true) called');
      
      // Force re-render
      forceUpdate(n => n + 1);
      console.log('TeamDashboard: Forced re-render');
    };
    
    window.addEventListener('open-add-reports-modal', handleOpenModal);
    console.log('TeamDashboard: Event listener attached for team:', selectedTeam);
    return () => {
      console.log('TeamDashboard: Removing event listener for team:', selectedTeam);
      window.removeEventListener('open-add-reports-modal', handleOpenModal);
    };
  }, []); // Empty dependency array - only run once
  
  const [selectedSprint, setSelectedSprint] = useState('');
  const [currentSprintName, setCurrentSprintName] = useState('');

  const configLoadedRef = useRef(false);
  const systemConfigRef = useRef<{ reportIds: string[], layoutConfig: any } | null>(null);
  
  // Refs for latest values to avoid stale closures
  const selectedTeamRef = useRef(selectedTeam);
  const selectedTreeTypeRef = useRef(selectedTreeType);
  const selectedSprintRef = useRef(selectedSprint);
  const layoutConfigRef = useRef(layoutConfig);
  const dashboardReportsRef = useRef(dashboardReports);
  
  // Keep refs in sync
  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
    selectedTreeTypeRef.current = selectedTreeType;
    selectedSprintRef.current = selectedSprint;
    layoutConfigRef.current = layoutConfig;
    dashboardReportsRef.current = dashboardReports;
  }, [selectedTeam, selectedTreeType, selectedSprint, layoutConfig, dashboardReports]);

  // Load system config and report definitions once
  useEffect(() => {
    if (configLoadedRef.current) return;
    
    const fetchConfig = async () => {
      setLoadingConfig(true);
      setConfigError(null);
      try {
        const apiService = new ApiService();
        const [config, reports] = await Promise.all([
          apiService.getDashboardViewConfigs(),
          apiService.getReportDefinitions(),
        ]);
        
        // Filter reports for team dashboard
        const teamReports = reports.filter((r) => {
          const allowedViews = r.meta_schema?.allowed_views || ['every-dashboard'];
          return allowedViews.includes('every-dashboard') || allowedViews.includes('team-dashboard');
        });
        setAvailableReports(teamReports);
        
        // Store system config for fallback
        const teamDashboardConfig = config.find((c) => c.view === 'team-dashboard');
        systemConfigRef.current = teamDashboardConfig ? {
          reportIds: teamDashboardConfig.reportIds,
          layoutConfig: teamDashboardConfig.layout_config || null
        } : null;
        
        configLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to fetch dashboard config:', err);
        setConfigError('Failed to load dashboard configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const settingsAppliedRef = useRef(false);

  // Apply saved settings when they become available (only once)
  useEffect(() => {
    if (!configLoadedRef.current || dashboardSettings.isLoading || settingsAppliedRef.current) return;
    
    // Apply saved top bar filters
    if (dashboardSettings.savedState?.topBarFilters && 
            Object.keys(dashboardSettings.savedState.topBarFilters).length > 0) {
      console.log('[TeamDashboard] Applying saved top bar filters:', dashboardSettings.savedState.topBarFilters);
          
          if (dashboardSettings.savedState.topBarFilters.selectedSprint !== undefined) {
            setSelectedSprint(dashboardSettings.savedState.topBarFilters.selectedSprint);
          }
          
      // Only dispatch event if current props don't match saved settings
      const savedTeam = dashboardSettings.savedState.topBarFilters.selectedTeam || dashboardSettings.savedState.topBarFilters.team_name;
      const savedTreeType = dashboardSettings.savedState.topBarFilters.selectedTreeType || dashboardSettings.savedState.topBarFilters.isGroup ? 'group' : 'team';
      
      if (savedTeam && savedTeam !== selectedTeam) {
        console.log('[TeamDashboard] Team mismatch, dispatching restore event');
          window.dispatchEvent(new CustomEvent('restore-dashboard-filters', {
            detail: {
              dashboard: 'team-dashboard',
              filters: dashboardSettings.savedState.topBarFilters
            }
          }));
      }
        }
        
    // Apply saved layout or fall back to system config
    if (dashboardSettings.savedState?.layoutConfig) {
          setLayoutConfig(dashboardSettings.savedState.layoutConfig);
      const reportIds = dashboardSettings.savedState.layoutConfig.rows.flatMap((row: any) => row.reportIds);
          setDashboardReports(reportIds.length > 0 ? reportIds : TEAM_DASHBOARD_DEFAULTS);
    } else if (systemConfigRef.current) {
      setDashboardReports(systemConfigRef.current.reportIds);
      setLayoutConfig(systemConfigRef.current.layoutConfig);
          } else {
            setDashboardReports(TEAM_DASHBOARD_DEFAULTS);
            setLayoutConfig(null);
          }
    
    settingsAppliedRef.current = true; // Mark as applied to prevent re-runs
    console.log('[TeamDashboard] Settings applied. Current saved state:', dashboardSettings.savedState);
  }, [dashboardSettings.isLoading, dashboardSettings.savedState]);

  useEffect(() => {
    setSelectedSprint('');
    setCurrentSprintName('');
  }, [selectedTeam]);
  
  const prevLayoutRef = useRef<string | null>(null);

  // Track layout config changes (only after settings have been applied and only if actually different from previous)
  useEffect(() => {
    if (!dashboardSettings.isLoading && layoutConfig !== null && settingsAppliedRef.current) {
      const layoutStr = JSON.stringify(layoutConfig);
      
      if (prevLayoutRef.current !== layoutStr) {
        console.log('[TeamDashboard] Layout changed, updating state');
      dashboardSettings.updateCurrentState({ layoutConfig });
        prevLayoutRef.current = layoutStr;
      }
    }
  }, [layoutConfig, dashboardSettings.isLoading]);
  
  const prevFiltersRef = useRef({ selectedTeam, selectedTreeType, selectedSprint });

  // Track top bar filters changes (only after settings have been applied and only if actually different from previous)
  useEffect(() => {
    if (!dashboardSettings.isLoading && settingsAppliedRef.current) {
      const newFilters = {
        selectedTeam,
          selectedTreeType,
          selectedSprint,
      };
      
      const prev = prevFiltersRef.current;
      const isDifferent = prev.selectedTeam !== newFilters.selectedTeam ||
        prev.selectedTreeType !== newFilters.selectedTreeType ||
        prev.selectedSprint !== newFilters.selectedSprint;
      
      if (isDifferent) {
        console.log('[TeamDashboard] Top bar filters changed, updating state');
        dashboardSettings.updateCurrentState({ topBarFilters: newFilters });
        prevFiltersRef.current = newFilters;
      }
    }
  }, [selectedTeam, selectedTreeType, selectedSprint, dashboardSettings.isLoading]);
  
  // Set up event listeners once
  useEffect(() => {
    const handleSaveRequest = async () => {
      try {
        console.log('[TeamDashboard] Save requested');
        
        // The tracking useEffects should have already updated the state
        // Just save what's in the current state
        await dashboardSettings.saveSettings();
        
        console.log('[TeamDashboard] Save completed');
        window.dispatchEvent(new CustomEvent('dashboard-settings-saved'));
      } catch (err) {
        console.error('[TeamDashboard] Save failed:', err);
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
    
    window.addEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
    window.addEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    
    return () => {
      window.removeEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
      window.removeEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    };
  }, []); // Empty deps - handlers access latest values via closure

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

  const handleBurndownResolved = useCallback((payload: ReportInstancePayload) => {
    const sprintFromMeta = payload?.meta?.sprint_name;
    if (sprintFromMeta) {
      setCurrentSprintName(sprintFromMeta);
    }
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
            errorMessage.includes("Group '") && errorMessage.includes("' not found")
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
  // Only include team_name if selectedTeam is truthy (not empty string)
  const controlledFilters = useMemo(
    () => ({
      ...(selectedTeam ? { team_name: selectedTeam } : {}),
      isGroup: selectedTreeType === 'group',
    }),
    [selectedTeam, selectedTreeType]
  );

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">Loading dashboard configuration...</div>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p>{configError}</p>
        <p>Displaying default dashboard reports.</p>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a team to view dashboard insights.
      </div>
    );
  }

  const renderReportSection = (reportId: string) => {
    // Get saved filters and pinned state for this report from user settings
    const savedReportFilters = dashboardSettings.savedState?.reportFilters?.[reportId] || {};
    const savedPinnedFilters = dashboardSettings.savedState?.pinnedFilters?.[reportId] || [];
    
    console.log(`[TeamDashboard] Rendering ${reportId} with saved filters:`, savedReportFilters);
    console.log(`[TeamDashboard] Saved pinned filters for ${reportId}:`, savedPinnedFilters);
    
    switch (reportId) {
      case 'team-closed-sprints':
        // Use controlledFilters for dynamic values (team_name, isGroup) so they update when filter changes
        // initialFilters only applies on mount, controlledFilters react to prop changes
        return (
          <ReportPanel
            reportId="team-closed-sprints"
            initialFilters={{ months: 3, ...savedReportFilters }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'team-sprint-burndown':
        return (
          <ReportPanel
            reportId="team-sprint-burndown"
            initialFilters={{
              issue_type: 'all',
              sprint_name: selectedSprint || null,
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled
            componentProps={{
              sprintOptions: SPRINT_OPTIONS,
              onSprintChange: setSelectedSprint,
              currentSprintName,
            }}
            onResolved={handleBurndownResolved}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'team-issues-trend':
        return (
          <ReportPanel
            reportId="team-issues-trend"
            initialFilters={{ issue_type: 'Bug', months: 6, ...savedReportFilters }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'sprint-predictability':
        return (
          <ReportPanel
            reportId="sprint-predictability"
            initialFilters={{ months: 3, ...savedReportFilters }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled={Boolean(selectedTeam)}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
      case 'issues-bugs-by-priority':
        return (
          <ReportPanel
            reportId="issues-bugs-by-priority"
            initialFilters={{ 
              issue_type: 'Bug',
              status_category: null,
              include_done: false,
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            controlledFilters={controlledFilters}
            enabled={Boolean(selectedTeam)}
            {...commonPanelProps}
          />
        );
      default:
        return (
          <ReportPanel
            reportId={reportId}
            initialFilters={savedReportFilters}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled={Boolean(selectedTeam)}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
    }
  };

  // Render with layout configuration if available
  if (layoutConfig && layoutConfig.rows && layoutConfig.rows.length > 0) {
    // On mobile, render as single column regardless of layout
    if (isMobile) {
      console.log('TeamDashboard: Rendering MOBILE view with modal');
      const allReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);
      
      return (
        <>
        <div className="space-y-4 p-2">
          {allReportIds.map((reportId) => (
            <div key={reportId}>
              {renderReportSection(reportId)}
            </div>
          ))}
        </div>
          
          <AddReportsModal
            isOpen={isAddReportsModalOpen}
            onClose={() => {
              console.log('TeamDashboard (mobile): Modal onClose called');
              modalShouldBeOpen.current = false;
              setIsAddReportsModalOpen(false);
            }}
            availableReports={availableReports}
            currentReportIds={allReportIds}
            onUpdateReports={(reportIds: string[]) => {
              console.log('Mobile: handleUpdateReports called with:', reportIds);
              // For mobile, update the layout to show selected reports
              const newLayout: LayoutConfig = {
                rows: [{ id: 'row-1', reportIds: reportIds }]
              };
              setLayoutConfig(newLayout);
              localStorage.setItem(`dashboard-layout-team-${selectedTeam}`, JSON.stringify(newLayout));
            }}
          />
        </>
      );
    }

    // Desktop: use draggable and resizable grid
    const handleLayoutChange = (newLayout: LayoutConfig) => {
      setLayoutConfig(newLayout);
      localStorage.setItem(`dashboard-layout-team-${selectedTeam}`, JSON.stringify(newLayout));
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
      localStorage.setItem(`dashboard-layout-team-${selectedTeam}`, JSON.stringify(newLayout));
    };

    const handleUpdateReports = (reportIds: string[]) => {
      console.log('handleUpdateReports called with:', reportIds);
      console.log('Current reports:', currentReportIds);
      
      let newLayout: LayoutConfig = { ...layoutConfig };
      
      // Get reports to add and remove
      const reportsToAdd = reportIds.filter(id => !currentReportIds.includes(id));
      const reportsToRemove = currentReportIds.filter(id => !reportIds.includes(id));
      
      console.log('Reports to add:', reportsToAdd);
      console.log('Reports to remove:', reportsToRemove);
      
      // Remove unchecked reports from layout
      if (reportsToRemove.length > 0) {
        newLayout.rows = newLayout.rows
          .map((row) => ({
            ...row,
            reportIds: row.reportIds.filter((id) => !reportsToRemove.includes(id)),
          }))
          .filter((row) => row.reportIds.length > 0); // Remove empty rows
        
        console.log('After removal, rows:', newLayout.rows);
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
        
        console.log('After adding, rows:', newLayout.rows);
      }
      
      console.log('Setting new layout:', newLayout);
      setLayoutConfig(newLayout);
      localStorage.setItem(`dashboard-layout-team-${selectedTeam}`, JSON.stringify(newLayout));
    };

    const currentReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 px-4 pb-4 overflow-auto">
          <DraggableResizableGrid
            layout={layoutConfig}
            onLayoutChange={handleLayoutChange}
            renderReport={renderReportSection}
            onRemoveReport={handleRemoveReport}
            defaultRowHeight={500}
            minRowHeight={500}
          />
        </div>

        <AddReportsModal
          isOpen={isAddReportsModalOpen}
          onClose={() => {
            console.log('TeamDashboard: Modal onClose called');
            modalShouldBeOpen.current = false;
            setIsAddReportsModalOpen(false);
          }}
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
    setDashboardReports(reportIds);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {dashboardReports.length === 0 ? (
          <div className="p-4 text-gray-500">
            No reports are configured for the team dashboard yet.
          </div>
        ) : (
          <div className="space-y-4">
            {dashboardReports.map((reportId) => {
              return (
                <div key={reportId} style={isMobile ? {} : { height: '500px' }}>
                  {renderReportSection(reportId)}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <AddReportsModal
        isOpen={isAddReportsModalOpen}
        onClose={() => {
          console.log('TeamDashboard (fallback): Modal onClose called');
          modalShouldBeOpen.current = false;
          setIsAddReportsModalOpen(false);
        }}
        availableReports={availableReports}
        currentReportIds={dashboardReports}
        onUpdateReports={handleUpdateReportsFallback}
      />
    </div>
  );
}
