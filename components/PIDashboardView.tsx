'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
        const [configs, definitions] = await Promise.all([
          api.getDashboardViewConfigs(),
          api.getReportDefinitions(),
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
      
      const needsRestore = (savedTeam && savedTeam !== selectedTeam) || (savedPI && savedPI !== selectedPI);
      
      if (needsRestore) {
        console.log('[PIDashboard] Props mismatch, dispatching restore event');
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
    
    window.addEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
    window.addEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    
    return () => {
      window.removeEventListener('save-dashboard-settings', handleSaveRequest as EventListener);
      window.removeEventListener('reset-dashboard-settings', handleResetRequest as EventListener);
    };
  }, []); // Empty deps - handlers access latest values via refs

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

  // Memoize controlledFilters to prevent infinite re-renders in ReportPanel
  const controlledFiltersPI = useMemo(() => ({ pi: selectedPI || null }), [selectedPI]);
  const controlledFiltersPINames = useMemo(() => ({ 
    pi_names: selectedPI ? [selectedPI] : [],
    team_name: selectedTeam || null,
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
    team_name: selectedTeam || null,
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
            initialFilters={{
              pi_names: selectedPI ? [selectedPI] : [],
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersPINames}
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
            initialFilters={{ 
              months: 3,
              ...(selectedTeam ? { team_name: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersTeam}
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
            initialFilters={{
              quarters: selectedPI ? [selectedPI] : [],
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersQuarters}
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
            initialFilters={{ 
              pi: selectedPI,
              team_name: selectedTeam,
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters 
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersPITeam}
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
            initialFilters={{
              ...(selectedPI ? { pi: selectedPI } : {}),
              ...(selectedTeam ? { team_name: selectedTeam, team: selectedTeam } : {}),
              isGroup: selectedTreeType === 'group',
              ...savedReportFilters
            }}
            initialPinnedFilters={savedPinnedFilters}
            controlledFilters={controlledFiltersDefault}
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

