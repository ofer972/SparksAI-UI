'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import { ApiService } from '@/lib/api';
import type { ReportDefinition, LayoutConfig } from '@/lib/config';
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      configLoadedRef.current = false;
      prevFiltersRef.current = { selectedPI: '', selectedTeam: '', selectedTreeType: 'team' };
    };
  }, []);

  const configLoadedRef = useRef(false);
  const systemConfigRef = useRef<{ config: any, definitionMap: Record<string, ReportDefinition> } | null>(null);
  
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

  // Load system config and use only system defaults
  useEffect(() => {
    if (configLoadedRef.current) return;
    
    let cancelled = false;
    const loadSystemConfig = async () => {
      try {
        const api = new ApiService();
        
        // Clear dashboard configs cache to ensure fresh data from system settings
        configCache.clearDashboardConfigs();
        
        // Fetch fresh configuration
        const [configs, definitions] = await Promise.all([
          configCache.getDashboardConfigs(() => api.getDashboardViewConfigs()),
          configCache.getReportDefinitions(() => api.getReportDefinitions()),
        ]);
        
        if (cancelled) return;

        const definitionMap: Record<string, ReportDefinition> = {};
        definitions.forEach((definition) => {
          definitionMap[definition.report_id] = definition;
        });

        const viewConfig = configs.find((cfg) => cfg.view === 'pi-dashboard');
        console.log('[PIDashboard] System config loaded:', viewConfig);
        console.log('[PIDashboard] System config reportIds:', viewConfig?.reportIds);
        systemConfigRef.current = { config: viewConfig, definitionMap };
        
        // Use system defaults only
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
            // Explicitly exclude removed reports
            if (reportId === 'pi-metrics-summary-by-team') {
              return;
            }
            const definition = definitionMap[reportId];
            const allowedViews = normalizeAllowedViews(definition);
            if (allowedViews.includes('every-dashboard') || allowedViews.includes(view)) {
              seen.add(reportId);
              unique.push(reportId);
            }
          });
          return unique;
        };

        // Use system config or defaults
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
        
        configLoadedRef.current = true;
        setConfigLoaded(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load PI dashboard config', error);
          // Fallback to defaults on error
          setReportOrder(PI_DASHBOARD_DEFAULTS);
          setLayoutConfig(null);
          setConfigLoaded(true);
        }
      }
    };

    loadSystemConfig();
    return () => {
      cancelled = true;
    };
  }, []);
  
  const prevFiltersRef = useRef({ selectedPI, selectedTeam, selectedTreeType });

  // Create refs to hold latest values for event handlers
  const latestValuesRef = useRef({
    layoutConfig,
    selectedPI,
    selectedTeam,
    selectedTreeType,
    reportFilters: {} as Record<string, Record<string, any>>,
    pinnedFilters: {} as Record<string, string[]>,
  });
  
  // Update refs whenever values change
  useEffect(() => {
    latestValuesRef.current = {
      layoutConfig,
      selectedPI,
      selectedTeam,
      selectedTreeType,
      reportFilters: {},
      pinnedFilters: {},
    };
  }, [layoutConfig, selectedPI, selectedTeam, selectedTreeType]);
  
  // Set up event listeners once
  useEffect(() => {
    const handleCollectDashboardData = () => {
      console.log('[PIDashboard] Dashboard data collection requested');
      // Use ref to access latest values
      const latest = latestValuesRef.current;
      console.log('[PIDashboard] latestValuesRef.current:', latest);
      console.log('[PIDashboard] latest.reportFilters:', latest.reportFilters);
      console.log('[PIDashboard] latest.pinnedFilters:', latest.pinnedFilters);
      
      // Merge report filters with controlled filters for each report
      const mergedReportFilters: Record<string, Record<string, any>> = {};
      
      // Get all report IDs from layout config
      const allReportIds = latest.layoutConfig?.rows?.flatMap((row: any) => row.reportIds || []) || [];
      const uniqueReportIds = Array.from(new Set(allReportIds));
      console.log('[PIDashboard] uniqueReportIds:', uniqueReportIds);
      
      uniqueReportIds.forEach((reportId: string) => {
        const savedReportFilters = latest.reportFilters[reportId] || {};
        const savedPinnedFilters = latest.pinnedFilters[reportId] || [];
        
        console.log(`[PIDashboard] Report ${reportId}:`, { savedReportFilters, savedPinnedFilters });
        
        // Determine which controlled filters to use based on report type
        let controlledFilters: Record<string, any> = {};
        switch (reportId) {
          case 'pi-burndown':
          case 'pi-metrics-summary':
            controlledFilters = {
              pi: latest.selectedPI || null,
              team_name: latest.selectedTeam || null,
              isGroup: latest.selectedTreeType === 'group',
            };
            break;
          case 'pi-predictability':
            controlledFilters = {
              pi_names: latest.selectedPI ? [latest.selectedPI] : [],
              team_name: latest.selectedTeam || null,
              isGroup: latest.selectedTreeType === 'group',
            };
            break;
          default:
            controlledFilters = {
              ...(latest.selectedPI ? { pi: latest.selectedPI } : {}),
              team_name: latest.selectedTeam || null,
              isGroup: latest.selectedTreeType === 'group',
            };
        }
        console.log(`[PIDashboard] controlledFilters for ${reportId}:`, controlledFilters);
        
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
          selectedPI: latest.selectedPI,
          selectedTeam: latest.selectedTeam,
          selectedTreeType: latest.selectedTreeType,
        },
        reportFilters: mergedReportFilters,
        pinnedFilters: latest.pinnedFilters,
      };
      console.log('[PIDashboard] Collected dashboard data:', data);
      console.log('[PIDashboard] Merged report filters (unpinned use topbar):', mergedReportFilters);
      window.dispatchEvent(new CustomEvent('dashboard-data-collected', { detail: data }));
    };
    
    // Only listen for collect-dashboard-data event (save/reset removed)
    window.addEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    
    return () => {
      window.removeEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    };
  }, []); // Empty deps - handlers access latest values via ref

  // Handler to open AI chat for a specific report
  const handleReportAIChat = useCallback((reportId: string) => {
    console.log('[PIDashboardView] Opening AI chat for report:', reportId);
    
    // Get current dashboard data from ref
    const latest = latestValuesRef.current;
    
    // Get the saved report filters and pinned filters for this report
    const savedReportFilters = latest.reportFilters[reportId] || {};
    const savedPinnedFilters = latest.pinnedFilters[reportId] || [];
    
    // Determine which controlled filters to use based on report type
    let controlledFilters: Record<string, any> = {};
    switch (reportId) {
      case 'pi-burndown':
      case 'pi-metrics-summary':
        controlledFilters = {
          pi: latest.selectedPI || null,
          team_name: latest.selectedTeam || null,
          isGroup: latest.selectedTreeType === 'group',
        };
        break;
      case 'pi-predictability':
        controlledFilters = {
          pi_names: latest.selectedPI ? [latest.selectedPI] : [],
          team_name: latest.selectedTeam || null,
          isGroup: latest.selectedTreeType === 'group',
        };
        break;
      default:
        controlledFilters = {
          ...(latest.selectedPI ? { pi: latest.selectedPI } : {}),
          team_name: latest.selectedTeam || null,
          isGroup: latest.selectedTreeType === 'group',
        };
    }
    
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
        selectedPI: latest.selectedPI,
        selectedTeam: latest.selectedTeam,
        selectedTreeType: latest.selectedTreeType,
      },
      reportFilters: {
        [reportId]: mergedReportFilters
      },
      pinnedFilters: {
        [reportId]: savedPinnedFilters
      },
    };
    
    console.log('[PIDashboardView] Dispatching report AI chat data:', data);
    console.log('[PIDashboardView] Merged report filters (unpinned use topbar):', mergedReportFilters);
    
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
  const controlledFiltersPI = useMemo(() => ({ pi: selectedPI || null }), [selectedPI]);
  const controlledFiltersPINames = useMemo(() => ({ 
    pi_names: selectedPI ? [selectedPI] : [],
    team_name: selectedTeam || null,
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);
  const controlledFiltersTeam = useMemo(() => ({
    team_name: selectedTeam || null,
    isGroup: selectedTreeType === 'group',
  }), [selectedTeam, selectedTreeType]);
  const controlledFiltersQuarters = useMemo(() => ({ 
    quarters: selectedPI ? [selectedPI] : [] 
  }), [selectedPI]);
  const controlledFiltersPITeam = useMemo(() => ({
    pi: selectedPI || null,
    team_name: selectedTeam || null,
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);
  const controlledFiltersDefault = useMemo(() => ({
    ...(selectedPI ? { pi: selectedPI } : {}),
    team_name: selectedTeam || null,
    isGroup: selectedTreeType === 'group',
  }), [selectedPI, selectedTeam, selectedTreeType]);

  // Use only reportId as key to preserve component state (including pinned filters) when top bar changes
  const buildPanelKey = (reportId: string) => reportId;

  const renderReportSection = (reportId: string, panelKey: string) => {
    // Don't render reports if PI is not set (must be non-empty string)
    const hasValidPI = selectedPI && typeof selectedPI === 'string' && selectedPI.trim().length > 0;
    if (!hasValidPI) {
      console.log(`[PIDashboard] Blocking render of ${reportId}: selectedPI="${selectedPI}", hasValidPI=${hasValidPI}`);
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
    
    switch (reportId) {
      case 'pi-burndown':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-burndown"
            initialFilters={{
              issue_type: 'Epic',
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
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
              team_name: selectedTeam || null,
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
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
            {...commonPanelProps}
          />
        );
      case 'epic-scope-changes':
        return (
          <ReportPanel
            key={panelKey}
            reportId="epic-scope-changes"
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
              autoSelectFirst: false, 
              selectedPI, 
              isDashboard: true,
              onAIChat: () => handleReportAIChat(reportId),
            }}
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
              team_name: selectedTeam || null,
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
            onFiltersChange={() => {}} // No-op: filters not saved for system dashboards
            onPinnedFiltersChange={() => {}} // No-op: pinned filters not saved for system dashboards
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
          <div className="text-sm text-content-secondary">Loading dashboard configuration...</div>
        </div>
      </div>
    );
  }

  // Wait for settings to apply before rendering reports to avoid fetching with wrong filters
  // Also wait if we don't have a PI yet (might be restoring)
  const hasValidPI = selectedPI && typeof selectedPI === 'string' && selectedPI.trim().length > 0;
  const hasPIInFilters = controlledFiltersPI.pi === selectedPI;
  
  // Show loading spinner while config is loading
  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-secondary">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Show "Loading PI" message if no PI is selected yet
  if (!hasValidPI) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-content-secondary max-w-md mx-auto">
            Loading current PI...
          </p>
        </div>
      </div>
    );
  }

  // Render with layout configuration if available
  if (layoutConfig && layoutConfig.rows && layoutConfig.rows.length > 0) {
    // Don't render reports if PI is not set
    if (!selectedPI) {
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
      </div>
    );
  }

  // Fallback to default layout - simple handler for fallback case
  const handleUpdateReportsFallback = (reportIds: string[]) => {
    console.log('Fallback: handleUpdateReports called with:', reportIds);
    // For the fallback case, just update the display order
    setReportOrder(reportIds);
  };

  // Don't render reports if PI is not set
  if (!selectedPI) {
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
        {reportOrder.length === 0 ? (
          <div className="p-4 text-content-tertiary">
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
    </div>
  );
};

export default PIDashboardView;

