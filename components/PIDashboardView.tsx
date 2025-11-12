'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReportPanel from './ReportPanel';
import { ApiService } from '@/lib/api';
import type { ReportDefinition, LayoutConfig } from '@/lib/config';

interface PIDashboardViewProps {
  selectedPI?: string;
  selectedTeam?: string;
}

const PI_DASHBOARD_DEFAULTS = ['pi-burndown', 'pi-predictability', 'epic-scope-changes', 'sprint-predictability'];

const PIDashboardView: React.FC<PIDashboardViewProps> = ({
  selectedPI,
  selectedTeam,
}) => {
  const [reportOrder, setReportOrder] = useState<string[] | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

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
  }, []);

  const commonPanelProps = useMemo(
    () => ({
      loadingFallback: (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading report...</div>
          </div>
        </div>
      ),
      errorFallback: (errorMessage: string) => (
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500">Error: {errorMessage}</div>
        </div>
      ),
    }),
    []
  );

  const buildPanelKey = (reportId: string) => `${reportId}-${selectedPI ?? 'none'}`;

  const renderReportSection = (reportId: string, panelKey: string) => {
    switch (reportId) {
      case 'pi-burndown':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-burndown"
            initialFilters={{
              issue_type: 'Epic',
              ...(selectedPI ? { pi: selectedPI } : {}),
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
            {...commonPanelProps}
          />
        );
      case 'pi-predictability':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-predictability"
            controlledFilters={{
              pi_names: selectedPI ? [selectedPI] : [],
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
            {...commonPanelProps}
          />
        );
      case 'sprint-predictability':
        return (
          <ReportPanel
            key={panelKey}
            reportId="sprint-predictability"
            initialFilters={{ months: 3 }}
            controlledFilters={selectedTeam ? { team_name: selectedTeam } : undefined}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
            {...commonPanelProps}
          />
        );
      case 'epic-scope-changes':
        return (
          <ReportPanel
            key={panelKey}
            reportId="epic-scope-changes"
            controlledFilters={selectedPI ? { quarters: [selectedPI] } : { quarters: [] }}
            enabled={Boolean(selectedPI)}
            componentProps={{ autoSelectFirst: false, selectedPI, isDashboard: true }}
            {...commonPanelProps}
          />
        );
      case 'pi-metrics-summary':
        return (
          <ReportPanel
            key={panelKey}
            reportId="pi-metrics-summary"
            controlledFilters={{
              ...(selectedPI ? { pi: selectedPI } : {}),
              ...(selectedTeam ? { team_name: selectedTeam } : {}),
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
            {...commonPanelProps}
          />
        );
      default:
        return (
          <ReportPanel
            key={panelKey}
            reportId={reportId}
            controlledFilters={{
              ...(selectedPI ? { pi: selectedPI } : {}),
              ...(selectedTeam ? { team_name: selectedTeam, team: selectedTeam } : {}),
            }}
            enabled={Boolean(selectedPI)}
            componentProps={{ isDashboard: true }}
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
    return (
      <div className="space-y-4 p-4">
        {layoutConfig.rows.map((row, idx) => (
          <div
            key={row.id}
            className="grid gap-4 items-stretch"
            style={{
              gridTemplateColumns: `repeat(${row.reportIds.length}, minmax(0, 1fr))`,
              height: '500px',
              marginBottom: idx < layoutConfig.rows.length - 1 ? '16px' : '0',
            }}
          >
            {row.reportIds.map((reportId) => {
              const panelKey = buildPanelKey(reportId);
              return (
                <div key={panelKey} className="h-full overflow-hidden">
                  {renderReportSection(reportId, panelKey)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Fallback to default layout
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        {reportOrder.length === 0 ? (
          <div className="p-4 text-gray-500">
            No reports are configured for the PI dashboard yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
            {reportOrder.map((reportId, index) => {
              const isLast = index === reportOrder.length - 1;
              const shouldSpan = reportOrder.length % 2 === 1 && isLast;
              const panelKey = buildPanelKey(reportId);
              return (
                <div key={panelKey} className={`${shouldSpan ? 'md:col-span-2' : ''} h-full`}>
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

