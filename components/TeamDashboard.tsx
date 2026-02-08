'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import type { ReportInstancePayload, LayoutConfig, ReportDefinition } from '@/lib/config';
import { ApiService } from '@/lib/api';
// Team Dashboard uses system settings only (no user customization hook needed)
import { configCache } from '@/lib/configCache';

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
  
  // Team Dashboard uses system settings only (no user customization)
  
  // Track component lifecycle
  useEffect(() => {
    console.log('TeamDashboard: Component MOUNTED');
    return () => {
      console.log('TeamDashboard: Component UNMOUNTING');
      configLoadedRef.current = false;
      prevFiltersRef.current = { selectedTeam: '', selectedTreeType: 'team', selectedSprint: '' };
    };
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // No modal event listeners - Team Dashboard doesn't allow report customization
  
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
        
        // Clear dashboard configs cache to ensure fresh data from system settings
        configCache.clearDashboardConfigs();
        
        // Fetch fresh configuration
        const [config, reports] = await Promise.all([
          configCache.getDashboardConfigs(() => apiService.getDashboardViewConfigs()),
          configCache.getReportDefinitions(() => apiService.getReportDefinitions()),
        ]);
        
        // Store system config for fallback
        const teamDashboardConfig = config.find((c) => c.view === 'team-dashboard');
        console.log('[TeamDashboard] System config loaded:', teamDashboardConfig);
        console.log('[TeamDashboard] System config reportIds:', teamDashboardConfig?.reportIds);
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

  // Apply system configuration (no user customization)
  useEffect(() => {
    if (!configLoadedRef.current || loadingConfig) return;
    
    // Always use system config
    if (systemConfigRef.current) {
      console.log('[TeamDashboard] Applying system config:', systemConfigRef.current);
      setDashboardReports(systemConfigRef.current.reportIds || TEAM_DASHBOARD_DEFAULTS);
      setLayoutConfig(systemConfigRef.current.layoutConfig);
    } else {
      console.log('[TeamDashboard] No system config, using defaults');
      setDashboardReports(TEAM_DASHBOARD_DEFAULTS);
      setLayoutConfig(null);
    }
  }, [configLoadedRef.current, loadingConfig]);

  useEffect(() => {
    setSelectedSprint('');
    setCurrentSprintName('');
  }, [selectedTeam]);
  
  const prevFiltersRef = useRef({ selectedTeam, selectedTreeType, selectedSprint });

  // Create refs to hold latest values for event handlers
  const latestValuesRef = useRef({
    layoutConfig,
    selectedTeam,
    selectedTreeType,
    selectedSprint,
    reportFilters: {} as Record<string, Record<string, any>>,
    pinnedFilters: {} as Record<string, string[]>,
  });
  
  // Update refs whenever values change
  useEffect(() => {
    latestValuesRef.current = {
      layoutConfig,
      selectedTeam,
      selectedTreeType,
      selectedSprint,
      reportFilters: {},
      pinnedFilters: {},
    };
  }, [layoutConfig, selectedTeam, selectedTreeType, selectedSprint]);
  
  // Set up event listeners once
  useEffect(() => {
    const handleCollectDashboardData = () => {
      console.log('[TeamDashboard] Dashboard data collection requested');
      // Use ref to access latest values
      const latest = latestValuesRef.current;
      console.log('[TeamDashboard] latestValuesRef.current:', latest);
      console.log('[TeamDashboard] latest.reportFilters:', latest.reportFilters);
      console.log('[TeamDashboard] latest.pinnedFilters:', latest.pinnedFilters);
      
      // Merge report filters with controlled filters for each report
      const mergedReportFilters: Record<string, Record<string, any>> = {};
      
      // Get all report IDs from layout config
      const allReportIds = latest.layoutConfig?.rows?.flatMap((row: any) => row.reportIds || []) || [];
      const uniqueReportIds = Array.from(new Set(allReportIds));
      console.log('[TeamDashboard] uniqueReportIds:', uniqueReportIds);
      
      // Get controlled filters (current topbar values)
      const controlledFilters = {
        ...(latest.selectedTeam ? { team_name: latest.selectedTeam } : {}),
        isGroup: latest.selectedTreeType === 'group',
      };
      console.log('[TeamDashboard] controlledFilters:', controlledFilters);
      
      uniqueReportIds.forEach((reportId: string) => {
        const savedReportFilters = latest.reportFilters[reportId] || {};
        const savedPinnedFilters = latest.pinnedFilters[reportId] || [];
        
        console.log(`[TeamDashboard] Report ${reportId}:`, { savedReportFilters, savedPinnedFilters });
        
        // Merge: unpinned filters use topbar values, pinned filters use saved values
        const merged: Record<string, any> = { ...savedReportFilters };
        Object.entries(controlledFilters).forEach(([key, value]) => {
          if (!savedPinnedFilters.includes(key)) {
            merged[key] = value;
          }
        });
        
        mergedReportFilters[reportId] = merged;
      });
      
      const data = {
        layoutConfig: latest.layoutConfig,
        topBarFilters: {
          selectedTeam: latest.selectedTeam,
          selectedTreeType: latest.selectedTreeType,
          selectedSprint: latest.selectedSprint,
        },
        reportFilters: mergedReportFilters,
        pinnedFilters: latest.pinnedFilters,
      };
      console.log('[TeamDashboard] Collected dashboard data:', data);
      console.log('[TeamDashboard] Merged report filters (unpinned use topbar):', mergedReportFilters);
      window.dispatchEvent(new CustomEvent('dashboard-data-collected', { detail: data }));
    };
    
    // Only listen for collect-dashboard-data event (save/reset removed)
    window.addEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    
    return () => {
      window.removeEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    };
  }, []); // Empty deps - handlers access latest values via ref

  const handleBurndownResolved = useCallback((payload: ReportInstancePayload) => {
    const sprintFromMeta = payload?.meta?.sprint_name;
    if (sprintFromMeta) {
      setCurrentSprintName(sprintFromMeta);
    }
  }, []);

  // Handler to open AI chat for a specific report
  const handleReportAIChat = useCallback((reportId: string) => {
    console.log('[TeamDashboard] Opening AI chat for report:', reportId);
    
    // No saved filters - using system defaults only
    const savedReportFilters = {};
    const savedPinnedFilters: string[] = [];
    
    // Get controlled filters (current topbar values)
    const controlledFilters = {
      ...(selectedTeam ? { team_name: selectedTeam } : {}),
      isGroup: selectedTreeType === 'group',
    };
    
    // Merge report filters with controlled filters
    // For unpinned filters, use controlled (topbar) values
    // For pinned filters, use saved report filter values
    const mergedReportFilters: Record<string, any> = { ...savedReportFilters };
    Object.entries(controlledFilters).forEach(([key, value]) => {
      // If this filter is NOT pinned, use the current topbar value
      if (!savedPinnedFilters.includes(key)) {
        mergedReportFilters[key] = value;
      }
      // If it IS pinned, keep the saved report filter value (already in mergedReportFilters)
    });
    
    const data = {
      layoutConfig: {
        rows: [{
          id: 'single-report',
          reportIds: [reportId]
        }]
      },
      topBarFilters: {
        selectedTeam,
        selectedTreeType,
        selectedSprint,
      },
      reportFilters: {
        [reportId]: mergedReportFilters
      },
      pinnedFilters: {
        [reportId]: savedPinnedFilters
      },
    };
    
    console.log('[TeamDashboard] Dispatching report AI chat data:', data);
    console.log('[TeamDashboard] Merged report filters (unpinned use topbar):', mergedReportFilters);
    
    // Dispatch event to open AI chat with this specific report's data
    window.dispatchEvent(new CustomEvent('open-report-ai-chat', { detail: data }));
  }, [selectedTeam, selectedTreeType, selectedSprint]);

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
              <div className="text-content-tertiary text-sm">No data available</div>
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
    () => {
      const hasValidTeam = selectedTeam && typeof selectedTeam === 'string' && selectedTeam.trim().length > 0;
      return {
        ...(hasValidTeam ? { team_name: selectedTeam } : {}),
      isGroup: selectedTreeType === 'group',
      };
    },
    [selectedTeam, selectedTreeType]
  );

  // Ensure controlledFilters has team_name before rendering reports
  const hasTeamInFilters = controlledFilters.team_name && controlledFilters.team_name.trim().length > 0;

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-secondary">Loading dashboard configuration...</div>
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

  // Wait for settings to apply before rendering reports to avoid fetching with wrong filters
  // Also wait if we don't have a team yet (might be restoring) OR if controlledFilters doesn't have team_name yet
  const hasValidTeam = selectedTeam && typeof selectedTeam === 'string' && selectedTeam.trim().length > 0;
  
  // No additional loading checks needed - config and team are ready

  // Show loading message if no team is selected yet
  if (!hasValidTeam) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-content-secondary max-w-md mx-auto">
            Loading team...
          </p>
        </div>
      </div>
    );
  }

  const renderReportSection = (reportId: string) => {
    // Don't render reports if team is not set (must be non-empty string) or we're restoring filters
    // Also ensure controlledFilters has team_name before rendering
    const hasValidTeam = selectedTeam && typeof selectedTeam === 'string' && selectedTeam.trim().length > 0;
    const filtersHaveTeam = controlledFilters.team_name && controlledFilters.team_name.trim().length > 0;
    if (!hasValidTeam || !filtersHaveTeam) {
      console.log(`[TeamDashboard] Blocking render of ${reportId}: selectedTeam="${selectedTeam}", hasValidTeam=${hasValidTeam}, filtersHaveTeam=${filtersHaveTeam}`);
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-secondary">Loading...</div>
          </div>
        </div>
      );
    }

    // No saved filters - using system defaults only
    const savedReportFilters = {};
    const savedPinnedFilters: string[] = [];
    
    console.log(`[TeamDashboard] Rendering ${reportId} with saved filters:`, savedReportFilters);
    console.log(`[TeamDashboard] Saved pinned filters for ${reportId}:`, savedPinnedFilters);
    
    switch (reportId) {
      case 'team-closed-sprints':
        // Use controlledFilters for dynamic values (team_name, isGroup) so they update when filter changes
        // initialFilters only applies on mount, controlledFilters react to prop changes
        // Include team_name in initialFilters to prevent duplicate fetches
        return (
          <ReportPanel
            reportId="team-closed-sprints"
            initialFilters={{ 
              months: 3,
              ...(controlledFilters.team_name ? { team_name: controlledFilters.team_name } : {}),
              ...(controlledFilters.isGroup !== undefined ? { isGroup: controlledFilters.isGroup } : {}),
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled
            componentProps={{
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
              onSprintChange: setSelectedSprint,
              currentSprintName,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onResolved={handleBurndownResolved}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
            {...commonPanelProps}
          />
        );
      case 'team-issues-trend':
        return (
          <ReportPanel
            reportId="team-issues-trend"
            initialFilters={{ 
              issue_type: 'Bug', 
              months: 6,
              ...(controlledFilters.team_name ? { team_name: controlledFilters.team_name } : {}),
              ...(controlledFilters.isGroup !== undefined ? { isGroup: controlledFilters.isGroup } : {}),
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled
            componentProps={{
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
            componentProps={{
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
              ...(controlledFilters.team_name ? { team_name: controlledFilters.team_name } : {}),
              ...(controlledFilters.isGroup !== undefined ? { isGroup: controlledFilters.isGroup } : {}),
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
            controlledFilters={controlledFilters}
            enabled={Boolean(selectedTeam)}
            componentProps={{
              onAIChat: () => handleReportAIChat(reportId),
            }}
            {...commonPanelProps}
          />
        );
      default:
        return (
          <ReportPanel
            reportId={reportId}
            initialFilters={{
              ...(controlledFilters.team_name ? { team_name: controlledFilters.team_name } : {}),
              ...(controlledFilters.isGroup !== undefined ? { isGroup: controlledFilters.isGroup } : {}),
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFilters}
            enabled={Boolean(selectedTeam)}
            componentProps={{
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
            {...commonPanelProps}
          />
        );
    }
  };

  // Render with layout configuration if available
  if (layoutConfig && layoutConfig.rows && layoutConfig.rows.length > 0) {
    // Don't render reports if team is not set
    if (!selectedTeam) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-secondary">Loading...</div>
          </div>
        </div>
      );
    }

    // On mobile, render as single column regardless of layout
    if (isMobile) {
      console.log('TeamDashboard: Rendering MOBILE view with modal');
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

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 px-4 pb-4 overflow-auto">
          <DraggableResizableGrid
            layout={layoutConfig}
            onLayoutChange={handleLayoutChange}
            renderReport={renderReportSection}
            onRemoveReport={handleRemoveReport}
            defaultRowHeight={550}
            minRowHeight={500}
          />
        </div>
      </div>
    );
  }

  // Fallback to default layout - simple handler for fallback case
  const handleUpdateReportsFallback = (reportIds: string[]) => {
    console.log('Fallback: handleUpdateReports called with:', reportIds);
    // For the fallback case, just update the display order
    setDashboardReports(reportIds);
  };

  // Don't render reports if team is not set
  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {dashboardReports.length === 0 ? (
          <div className="p-4 text-content-tertiary">
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
