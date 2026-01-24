'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import KPICard from './KPICard';
import PRListReportDialog from './PRListReportDialog';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
  improved: boolean; // true = good trend, false = bad trend (not used for "flat")
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
    type: string;
    target_id: string;
    params: {
      metric: string;
    };
  };
}

export default function CoreKPIsTab() {
  const [metrics, setMetrics] = useState<MetricResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<{
    metric: string;
    title: string;
  } | null>(null);

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
    if (metric.action?.params?.metric) {
      setSelectedMetric({
        metric: metric.action.params.metric,
        title: metric.label,
      });
    }
  };

  const handleCloseDialog = () => {
    setSelectedMetric(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">No metrics available.</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-row gap-2 pb-2 pt-2">
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

