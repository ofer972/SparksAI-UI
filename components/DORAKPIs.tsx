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
  trend?: Trend | null;
  reportIds: string[];
  initialFilters?: Record<string, any>;
  metric?: MetricResponse;
}

interface DORAKPIsProps {
  singleRowLayout?: boolean;
  onOpenKPIDashboard?: (data: KPIDashboardData) => void;
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
}

export default function DORAKPIs({ 
  singleRowLayout = false, 
  onOpenKPIDashboard,
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
}: DORAKPIsProps) {
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
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch('/api/v1/github-service/KPIs');

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = await response.json();
        setMetrics(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(errorMessage);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

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
          tierStatus: metric.tier_status,
          description: metric.description,
          trend: metric.trend,
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
          tierStatus={selectedKPIDashboard.tierStatus}
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

  if (error || metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center px-4">
          <div className="text-sm text-content-secondary">DORA Metrics are currently disabled.</div>
          <div className="text-xs text-content-tertiary mt-1">Enable GitHub Integration in Settings to view metrics.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {metrics.map((metric) => (
        <KPICard
          key={metric.metric_id}
          metricId={metric.metric_id}
          label={metric.label}
          value={metric.value}
          tierStatus={metric.tier_status}
          metricType={metric.metric_type || null}
          description={metric.description}
          tooltip={metric.tooltip}
          trend={metric.trend}
          alternative_text={(metric as any).alternative_text || null}
          onClick={() => handleKPIClick(metric)}
        />
      ))}

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

