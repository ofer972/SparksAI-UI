'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [dashboardReports, setDashboardReports] = useState<string[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAddReportsModalOpen, setIsAddReportsModalOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  
  // Dashboard settings hook
  const dashboardSettings = useDashboardSettings('team-dashboard');

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
      setIsAddReportsModalOpen(true);
    };
    
    window.addEventListener('open-add-reports-modal', handleOpenModal);
    return () => window.removeEventListener('open-add-reports-modal', handleOpenModal);
  }, []);

  useEffect(() => {
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
        
        // Wait for user settings to load first
        while (dashboardSettings.isLoading) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Priority: User Settings > System Config > Defaults
        // First, restore top bar filters if saved (independent of layout)
        if (dashboardSettings.savedState && dashboardSettings.savedState.topBarFilters && 
            Object.keys(dashboardSettings.savedState.topBarFilters).length > 0) {
          console.log('[TeamDashboard] Restoring top bar filters:', dashboardSettings.savedState.topBarFilters);
          
          // Restore local filters (like sprint selection)
          if (dashboardSettings.savedState.topBarFilters.selectedSprint !== undefined) {
            setSelectedSprint(dashboardSettings.savedState.topBarFilters.selectedSprint);
          }
          
          // Notify parent to restore top bar filters (team/group selection)
          window.dispatchEvent(new CustomEvent('restore-dashboard-filters', {
            detail: {
              dashboard: 'team-dashboard',
              filters: dashboardSettings.savedState.topBarFilters
            }
          }));
        }
        
        if (dashboardSettings.savedState && dashboardSettings.savedState.layoutConfig) {
          // Use user settings for layout
          setLayoutConfig(dashboardSettings.savedState.layoutConfig);
          
          // Extract report IDs from layout
          const reportIds = dashboardSettings.savedState.layoutConfig.rows.flatMap(row => row.reportIds);
          setDashboardReports(reportIds.length > 0 ? reportIds : TEAM_DASHBOARD_DEFAULTS);
        } else {
          // Fall back to system config
          const teamDashboardConfig = config.find((c) => c.view === 'team-dashboard');
          if (teamDashboardConfig) {
            setDashboardReports(teamDashboardConfig.reportIds);
            setLayoutConfig(teamDashboardConfig.layout_config || null);
          } else {
            setDashboardReports(TEAM_DASHBOARD_DEFAULTS);
            setLayoutConfig(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard config:', err);
        setConfigError('Failed to load dashboard configuration.');
        setDashboardReports(TEAM_DASHBOARD_DEFAULTS);
        setLayoutConfig(null);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, [dashboardSettings.isLoading, dashboardSettings.savedState]);

  const [selectedSprint, setSelectedSprint] = useState('');
  const [currentSprintName, setCurrentSprintName] = useState('');

  useEffect(() => {
    setSelectedSprint('');
    setCurrentSprintName('');
  }, [selectedTeam]);
  
  // Track layout config changes
  useEffect(() => {
    if (!dashboardSettings.isLoading && layoutConfig !== null) {
      dashboardSettings.updateCurrentState({ layoutConfig });
    }
  }, [layoutConfig, dashboardSettings.isLoading]);
  
  // Track top bar filters changes
  useEffect(() => {
    if (!dashboardSettings.isLoading) {
      dashboardSettings.updateCurrentState({
        topBarFilters: {
          selectedTeam, // Save the team/group name, not the tree value
          selectedTreeType,
          selectedSprint,
        },
      });
    }
  }, [selectedTeam, selectedTreeType, selectedSprint, dashboardSettings.isLoading, dashboardSettings.updateCurrentState]);
  
  // Expose save settings function and state to parent via custom event
  useEffect(() => {
    const handleSaveRequest = async () => {
      try {
        // Before saving, apply current top bar filters to all reports
        // This ensures unpinned filters get the current top bar values
        const topBarFilters: Record<string, any> = {
          team_name: selectedTeam,
          isGroup: selectedTreeType === 'group',
          sprint_name: selectedSprint,
        };
        
        // Update top bar filters in dashboard state
        dashboardSettings.updateCurrentState({ topBarFilters });
        
        // Get all report IDs from the layout config or dashboard reports
        const allReportIds = layoutConfig 
          ? layoutConfig.rows.flatMap(row => row.reportIds)
          : dashboardReports;
        
        // Apply top bar filters to all reports that aren't pinned
        allReportIds.forEach((reportId: string) => {
          const currentReportFilters = dashboardSettings.currentState.reportFilters[reportId] || {};
          const pinnedKeys = dashboardSettings.currentState.pinnedFilters[reportId] || [];
          
          // Apply top bar values to unpinned filters
          const updatedFilters = { ...currentReportFilters };
          Object.keys(topBarFilters).forEach(filterKey => {
            if (!pinnedKeys.includes(filterKey)) {
              updatedFilters[filterKey] = topBarFilters[filterKey];
            }
          });
          
          dashboardSettings.updateReportFilters(reportId, updatedFilters);
        });
        
        // Small delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await dashboardSettings.saveSettings();
        window.dispatchEvent(new CustomEvent('dashboard-settings-saved'));
      } catch (err) {
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
    
    // Dispatch current state to parent
    window.dispatchEvent(new CustomEvent('dashboard-settings-state', {
      detail: {
        hasChanges: dashboardSettings.hasChanges,
        isSaving: dashboardSettings.isSaving,
        error: dashboardSettings.error,
      },
    }));
    
    return () => {
      window.removeEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
      window.removeEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    };
  }, [
    dashboardSettings.hasChanges, 
    dashboardSettings.isSaving, 
    dashboardSettings.error, 
    dashboardSettings.saveSettings, 
    dashboardSettings.resetToDefaults,
    dashboardSettings.currentState,
    dashboardSettings.updateCurrentState,
    dashboardSettings.updateReportFilters,
    layoutConfig,
    dashboardReports,
    selectedTeam,
    selectedTreeType,
    selectedSprint
  ]);

  const handleBurndownResolved = useCallback((payload: ReportInstancePayload) => {
    const sprintFromMeta = payload?.meta?.sprint_name;
    if (sprintFromMeta) {
      setCurrentSprintName(sprintFromMeta);
    }
  }, []);

  const commonPanelProps = useMemo(
    () => ({
      // No loadingFallback - let report views handle loading within ReportCard
      errorFallback: (errorMessage: string) => (
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500">Error: {errorMessage}</div>
        </div>
      ),
    }),
    []
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
    
    switch (reportId) {
      case 'team-closed-sprints':
        // Use controlledFilters for dynamic values (team_name, isGroup) so they update when filter changes
        // initialFilters only applies on mount, controlledFilters react to prop changes
        return (
          <ReportPanel
            reportId="team-closed-sprints"
            initialFilters={{ months: 3, ...savedReportFilters }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              team_name: selectedTeam || null,
              isGroup: selectedTreeType === 'group',
            }}
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
            controlledFilters={{
              team_name: selectedTeam || null,
              isGroup: selectedTreeType === 'group',
            }}
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
            controlledFilters={{
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
            }}
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
            controlledFilters={{
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
            }}
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
            controlledFilters={{
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
            }}
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
            controlledFilters={{
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
            }}
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
      const allReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);
      return (
        <div className="space-y-4 p-2">
          {allReportIds.map((reportId) => (
            <div key={reportId}>
              {renderReportSection(reportId)}
            </div>
          ))}
        </div>
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
    
    // Filter to only show reports that are in the configured list (from system settings)
    const configuredReportIds = new Set(dashboardReports);
    const filteredAvailableReports = availableReports.filter((report) => 
      configuredReportIds.has(report.report_id)
    );

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
          onClose={() => setIsAddReportsModalOpen(false)}
          availableReports={filteredAvailableReports}
          currentReportIds={currentReportIds}
          onUpdateReports={handleUpdateReports}
        />
      </div>
    );
  }

  // Fallback to default layout
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
    </div>
  );
}
