'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import KPICard from '@/components/github/KPICard';
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
  tier_status: 'elite' | 'high' | 'medium' | 'low';
  description: string;
  tooltip: string;
  trend?: Trend;
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
  tierStatus: 'elite' | 'high' | 'medium' | 'low';
  description: string;
  trend?: Trend;
  reportIds: string[];
  initialFilters?: Record<string, any>;
}

interface DORAKPIsProps {
  singleRowLayout?: boolean;
  onOpenKPIDashboard?: (data: KPIDashboardData) => void;
}

export default function DORAKPIs({ singleRowLayout = false, onOpenKPIDashboard }: DORAKPIsProps) {
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
        const kpiData: KPIDashboardData = {
          title: metric.label,
          value: metric.value,
          tierStatus: metric.tier_status,
          description: metric.description,
          trend: metric.trend,
          reportIds: metric.action.report_ids,
          initialFilters: metric.action.params || {},
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

  return (
    <>
      <div className="w-full overflow-visible">
        <div
          className={`flex flex-wrap gap-2 ${singleRowLayout ? 'justify-start' : 'justify-center'}`}
        >
          {metrics.map((metric) => (
            <KPICard
              key={metric.metric_id}
              metricId={metric.metric_id}
              label={metric.label}
              value={metric.value}
              tierStatus={metric.tier_status}
              description={metric.description}
              tooltip={metric.tooltip}
              trend={metric.trend}
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

