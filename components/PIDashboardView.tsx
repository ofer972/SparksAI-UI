'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import AddReportsModal from './AddReportsModal';
import { ApiService } from '@/lib/api';
import type { ReportDefinition, LayoutConfig } from '@/lib/config';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';

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
    
    return () => window.removeEventListener('resize', checkMobile);
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

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      try {
        const api = new ApiService();
        const [configs, definitions] = await Promise.all([
          api.getDashboardViewConfigs(),
          api.getReportDefinitions(),
        ]);
        if (cancelled) {
          return;
        }

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

        // Wait for user settings to load first
        while (dashboardSettings.isLoading) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const viewConfig = configs.find((cfg) => cfg.view === 'pi-dashboard');

        const normalizeAllowedViews = (report?: ReportDefinition): string[] => {
          if (!report) {
            return ['every-dashboard'];
          }
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
            if (seen.has(reportId)) {
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

        // Priority: User Settings > System Config > Defaults
        
        // First, restore top bar filters if saved (independent of layout)
        if (dashboardSettings.savedState && dashboardSettings.savedState.topBarFilters && 
            Object.keys(dashboardSettings.savedState.topBarFilters).length > 0) {
          console.log('[PIDashboard] Restoring top bar filters:', dashboardSettings.savedState.topBarFilters);
          window.dispatchEvent(new CustomEvent('restore-dashboard-filters', {
            detail: {
              dashboard: 'pi-dashboard',
              filters: dashboardSettings.savedState.topBarFilters
            }
          }));
        }
        
        if (dashboardSettings.savedState && dashboardSettings.savedState.layoutConfig) {
          // Use user settings for layout
          setLayoutConfig(dashboardSettings.savedState.layoutConfig);
          
          // Extract report IDs from layout
          const reportIds = dashboardSettings.savedState.layoutConfig.rows.flatMap(row => row.reportIds);
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
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load PI dashboard layout', error);
          setReportOrder(PI_DASHBOARD_DEFAULTS);
        }
      } finally {
        if (!cancelled) {
          setConfigLoaded(true);
        }
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, [dashboardSettings.isLoading, dashboardSettings.savedState]);
  
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
          selectedPI,
          selectedTeam, // Save the team/group name, not the tree value
          selectedTreeType,
        },
      });
    }
  }, [selectedPI, selectedTeam, selectedTreeType, dashboardSettings.isLoading, dashboardSettings.updateCurrentState]);
  
  // Expose save settings function and state to parent via custom event
  useEffect(() => {
    const handleSaveRequest = async () => {
      try {
        // Before saving, apply current top bar filters to all reports
        // This ensures unpinned filters get the current top bar values
        const topBarFilters: Record<string, any> = {
          selectedPI,
          selectedTeam,
          selectedTreeType,
        };
        
        // Update top bar filters in dashboard state
        dashboardSettings.updateCurrentState({ topBarFilters });
        
        // Apply top bar filters to all reports that aren't pinned
        if (reportOrder) {
          reportOrder.forEach((reportId: string) => {
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
        }
        
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
    reportOrder,
    selectedPI,
    selectedTeam,
    selectedTreeType
  ]);

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

  // Use only reportId as key to preserve component state (including pinned filters) when top bar changes
  const buildPanelKey = (reportId: string) => reportId;

  const renderReportSection = (reportId: string, panelKey: string) => {
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
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              pi: selectedPI || null,
            }}
            enabled={true}
            componentProps={{ isDashboard: true }}
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
            initialFilters={savedReportFilters}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              pi_names: selectedPI ? [selectedPI] : [],
              team_name: selectedTeam || null,
              isGroup: selectedTreeType === 'group',
            }}
            enabled={true}
            componentProps={{ isDashboard: true }}
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
            initialFilters={{ months: 3, ...savedReportFilters }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              ...(selectedTeam ? { team_name: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
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
            initialFilters={savedReportFilters}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              quarters: selectedPI ? [selectedPI] : [],
            }}
            enabled={true}
            componentProps={{ autoSelectFirst: false, selectedPI, isDashboard: true }}
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
            initialFilters={savedReportFilters}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              pi: selectedPI || null,
              team_name: selectedTeam || null,
              isGroup: selectedTreeType === 'group',
            }}
            enabled={true}
            componentProps={{ isDashboard: true }}
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
            initialFilters={savedReportFilters}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={{
              ...(selectedPI ? { pi: selectedPI } : {}),
              ...(selectedTeam ? { team_name: selectedTeam, team: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
            onFiltersChange={(filters) => dashboardSettings.updateReportFilters(reportId, filters)}
            onPinnedFiltersChange={(pinnedKeys) => dashboardSettings.updatePinnedFilters(reportId, pinnedKeys)}
            {...commonPanelProps}
          />
        );
    }
  };

  if (!selectedPI) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a PI to view dashboard insights.
      </div>
    );
  }

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

  // Render with layout configuration if available
  if (layoutConfig && layoutConfig.rows && layoutConfig.rows.length > 0) {
    // On mobile, render as single column regardless of layout
    if (isMobile) {
      console.log('PIDashboardView: Rendering MOBILE view with modal');
      const allReportIds = layoutConfig.rows.flatMap((row) => row.reportIds);
      
      // Filter to only show reports that are in the configured list
      const configuredReportIds = new Set(reportOrder);
      const filteredAvailableReports = availableReports.filter((report) => 
        configuredReportIds.has(report.report_id)
      );
      
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
            availableReports={filteredAvailableReports}
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
    
    // Filter to only show reports that are in the configured list (from system settings)
    const configuredReportIds = reportOrder ? new Set(reportOrder) : new Set();
    const filteredAvailableReports = availableReports.filter((report) => 
      configuredReportIds.has(report.report_id)
    );

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
          availableReports={filteredAvailableReports}
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
        availableReports={availableReports.filter((report) => 
          new Set(reportOrder).has(report.report_id)
        )}
        currentReportIds={reportOrder}
        onUpdateReports={handleUpdateReportsFallback}
      />
    </div>
  );
};

export default PIDashboardView;

