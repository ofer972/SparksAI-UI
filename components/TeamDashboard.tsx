'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReportPanel from './ReportPanel';
import DraggableResizableGrid from './DraggableResizableGrid';
import type { ReportInstancePayload, LayoutConfig } from '@/lib/config';
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      setConfigError(null);
      try {
        const apiService = new ApiService();
        const config = await apiService.getDashboardViewConfigs();
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
            initialFilters={{ months: 3 }}
            controlledFilters={{ team_name: selectedTeam }}
            enabled
            {...commonPanelProps}
          />
        );
      case 'team-sprint-burndown':
        return (
          <ReportPanel
            reportId="team-sprint-burndown"
            initialFilters={{ issue_type: 'all' }}
            controlledFilters={{
              team_name: selectedTeam,
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
      // TODO: Save to user preferences/localStorage
      localStorage.setItem(`dashboard-layout-team-${selectedTeam}`, JSON.stringify(newLayout));
    };

    return (
      <div className="p-4">
        <DraggableResizableGrid
          layout={layoutConfig}
          onLayoutChange={handleLayoutChange}
          renderReport={renderReportSection}
          defaultRowHeight={500}
          minRowHeight={500}
        />
      </div>
    );
  }

  // Fallback to default layout
  return (
    <div className="space-y-4">
      {dashboardReports.length === 0 ? (
        <div className="p-4 text-gray-500">
          No reports are configured for the team dashboard yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
          {dashboardReports.map((reportId, index) => {
            const isLast = index === dashboardReports.length - 1;
            const shouldSpan = dashboardReports.length % 2 === 1 && isLast;
            return (
              <div
                key={reportId}
                className={`${shouldSpan ? 'md:col-span-2' : ''} h-full`}
              >
                {renderReportSection(reportId)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
