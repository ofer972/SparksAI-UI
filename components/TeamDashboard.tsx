'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import AddReportsModal from './AddReportsModal';
import type { ReportInstancePayload, LayoutConfig, ReportDefinition } from '@/lib/config';
import { ApiService } from '@/lib/api';

interface TeamDashboardProps {
  selectedTeam: string;
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

export default function TeamDashboard({ selectedTeam }: TeamDashboardProps) {
  const [dashboardReports, setDashboardReports] = useState<string[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAddReportsModalOpen, setIsAddReportsModalOpen] = useState(false);
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);

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
        
        const teamDashboardConfig = config.find((c) => c.view === 'team-dashboard');
        if (teamDashboardConfig) {
          setDashboardReports(teamDashboardConfig.reportIds);
          setLayoutConfig(teamDashboardConfig.layout_config || null);
        } else {
          setDashboardReports(TEAM_DASHBOARD_DEFAULTS);
          setLayoutConfig(null);
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
  }, []);

  const [selectedSprint, setSelectedSprint] = useState('');
  const [currentSprintName, setCurrentSprintName] = useState('');

  useEffect(() => {
    setSelectedSprint('');
    setCurrentSprintName('');
  }, [selectedTeam]);

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
    switch (reportId) {
      case 'team-closed-sprints':
        return (
          <ReportPanel
            reportId="team-closed-sprints"
            initialFilters={{ 
              months: 3,
              team_name: selectedTeam || null
            }}
            enabled
            {...commonPanelProps}
          />
        );
      case 'team-sprint-burndown':
        return (
          <ReportPanel
            reportId="team-sprint-burndown"
            initialFilters={{
              team_name: selectedTeam || null,
              issue_type: 'all',
              sprint_name: selectedSprint || null,
            }}
            enabled
            componentProps={{
              sprintOptions: SPRINT_OPTIONS,
              onSprintChange: setSelectedSprint,
              currentSprintName,
            }}
            onResolved={handleBurndownResolved}
            {...commonPanelProps}
          />
        );
      case 'team-issues-trend':
        return (
          <ReportPanel
            reportId="team-issues-trend"
            initialFilters={{ issue_type: 'Bug', months: 6 }}
            controlledFilters={{ team_name: selectedTeam }}
            enabled
            {...commonPanelProps}
          />
        );
      case 'sprint-predictability':
        return (
          <ReportPanel
            reportId="sprint-predictability"
            initialFilters={{ months: 3 }}
            controlledFilters={{ team_name: selectedTeam }}
            enabled={Boolean(selectedTeam)}
            {...commonPanelProps}
          />
        );
      case 'issues-bugs-by-priority':
        return (
          <ReportPanel
            reportId="issues-bugs-by-priority"
            initialFilters={{ 
              issue_type: 'Bug',
              team_name: selectedTeam,
              status_category: null,
              include_done: false
            }}
            enabled={Boolean(selectedTeam)}
            {...commonPanelProps}
          />
        );
      default:
        return (
          <ReportPanel
            reportId={reportId}
            controlledFilters={{ team_name: selectedTeam }}
            enabled={Boolean(selectedTeam)}
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
            <div key={reportId} style={{ height: '500px' }}>
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
                <div key={reportId} style={{ height: '500px' }}>
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
