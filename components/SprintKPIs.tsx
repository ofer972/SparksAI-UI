'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import KPICard from '@/components/KPICard';
import PRListReportDialog from '@/components/github/PRListReportDialog';
import KPIDashboard from '@/components/KPIDashboard';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
  improved: boolean;
}

interface MetricResponse {
  metric_id: string;
  label: string;
  value: string;
  tier_status: 'elite' | 'high' | 'medium' | 'low' | '';
  metric_type?: 'dora' | 'sprint' | 'pi';
  description: string;
  tooltip: string;
  trend?: Trend | null;
  chart_data?: {
    type: 'line' | 'progress';
    points?: Array<{
      sprint_id: string;
      value: number;
      date: string | null;
    }>;
    current?: number;
    total?: number;
    percentage?: number;
  } | null;
  alternative_text?: string | null;
  action?: {
    type: 'table' | 'report';
    target_id?: string;
    report_ids?: string[];
    params?: {
      metric?: string;
      [key: string]: any;
    };
  };
}

export interface KPIDashboardData {
  title: string;
  value: string;
  tierStatus: 'elite' | 'high' | 'medium' | 'low' | '';
  description: string;
  trend?: Trend;
  reportIds: string[];
  initialFilters?: Record<string, any>;
  metric?: MetricResponse;
}

interface SprintKPIsProps {
  teamName: string;
  isGroup?: boolean;
  singleRowLayout?: boolean;
  onOpenKPIDashboard?: (data: KPIDashboardData) => void;
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
  selectedMetrics?: string[]; // Optional: Array of metric IDs to display
  layout?: 'normal' | 'wide';
}

export default function SprintKPIs({ 
  teamName,
  isGroup = false,
  singleRowLayout = false, 
  onOpenKPIDashboard,
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
  selectedMetrics,
  layout = 'normal',
}: SprintKPIsProps) {
  const [metrics, setMetrics] = useState<MetricResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<{
    metric: string;
    title: string;
  } | null>(null);
  // Only use local state when no callback is provided (for backward compatibility)
  const [selectedKPIDashboard, setSelectedKPIDashboard] = useState<KPIDashboardData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!teamName) {
        console.log('[SprintKPIs] No teamName provided, skipping fetch');
        setLoading(false);
        return;
      }
      
      console.log('[SprintKPIs] Fetching metrics for:', { teamName, isGroup });
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          team_name: teamName,
          isGroup: isGroup.toString()
        });
        const url = `/api/v1/team-metrics/sprint-kpis?${params.toString()}`;
        console.log('[SprintKPIs] Fetching from:', url);
        const response = await authFetch(url);

        console.log('[SprintKPIs] Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[SprintKPIs] Received metrics:', data);
        setMetrics(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch metrics';
        console.error('[SprintKPIs] Error fetching metrics:', err);
        setError(errorMessage);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [teamName, isGroup]);

  const handleKPIClick = (metric: MetricResponse) => {
    if (!metric.action) return;

    if (metric.action.type === 'table') {
      if (metric.action.params?.metric) {
        setSelectedMetric({
          metric: metric.action.params.metric,
          title: metric.label,
        });
      }
    } else if (metric.action.type === 'report') {
      if (metric.action.report_ids && metric.action.report_ids.length > 0) {
        // Merge action params with default team/PI context from home screen
        const mergedFilters: Record<string, any> = {
          ...metric.action.params,
        };
        
        // Add default team/group if available from home screen context
        if (defaultTeamOrGroupName) {
          mergedFilters.team_name = defaultTeamOrGroupName;
          mergedFilters.isGroup = defaultTreeType === 'group';
        }
        
        // Add current PI if available from home screen context
        if (currentPIName) {
          mergedFilters.pi = currentPIName;
        }
        
        const kpiData: KPIDashboardData = {
          title: metric.label,
          value: metric.value,
          tierStatus: metric.tier_status || 'medium', // Default to medium if empty for KPIDashboard
          description: metric.description,
          trend: metric.trend || undefined,
          reportIds: metric.action.report_ids,
          initialFilters: mergedFilters,
          metric: metric,
        };
        
        // If callback is provided, use it to navigate to detail page
        // Otherwise fall back to local state (for backward compatibility)
        if (onOpenKPIDashboard) {
          onOpenKPIDashboard(kpiData);
        } else {
          setSelectedKPIDashboard(kpiData);
        }
      }
    }
  };

  const handleCloseDialog = () => {
    setSelectedMetric(null);
  };

  const handleCloseKPIDashboard = () => {
    setSelectedKPIDashboard(null);
  };

  // If KPI dashboard is selected AND no callback is provided (backward compatibility mode),
  // show it inline instead of the KPI cards
  if (selectedKPIDashboard && !onOpenKPIDashboard) {
    return (
      <div className="h-full w-full">
        <KPIDashboard
          title={selectedKPIDashboard.title}
          value={selectedKPIDashboard.value}
          tierStatus={selectedKPIDashboard.tierStatus || 'medium'}
          description={selectedKPIDashboard.description}
          trend={selectedKPIDashboard.trend}
          reportIds={selectedKPIDashboard.reportIds}
          initialFilters={selectedKPIDashboard.initialFilters}
          onBack={handleCloseKPIDashboard}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-content-tertiary">Loading KPIs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-danger-text">Error: {error}</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-content-tertiary">No KPIs available.</div>
      </div>
    );
  }

  // Filter metrics if selectedMetrics prop is provided
  const displayMetrics = selectedMetrics 
    ? metrics.filter(m => selectedMetrics.includes(m.metric_id))
    : metrics;

  return (
    <>
      <div className="w-full overflow-visible">
        <div
          className={`flex flex-wrap ${layout === 'wide' ? 'gap-10' : 'gap-2'} ${singleRowLayout ? 'justify-start' : 'justify-center'}`}
        >
          {displayMetrics.map((metric) => (
            <KPICard
              key={metric.metric_id}
              metricId={metric.metric_id}
              label={metric.label}
              value={metric.value}
              tierStatus={metric.tier_status || null}
              metricType={metric.metric_type || null}
              description={metric.description}
              tooltip={metric.tooltip}
              trend={metric.trend || null}
              chart_data={metric.chart_data || null}
              layout={layout}
              alternative_text={(metric as any).alternative_text || null}
              onClick={() => handleKPIClick(metric)}
            />
          ))}
        </div>
      </div>

      {/* PR List Report Dialog */}
      {selectedMetric && (
        <PRListReportDialog
          isOpen={true}
          onClose={handleCloseDialog}
          metric={selectedMetric.metric}
          title={selectedMetric.title}
        />
      )}
    </>
  );
}

