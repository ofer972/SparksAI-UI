'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import KPICard from '@/components/KPICard';

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
  metric_type?: 'dora' | 'sprint' | 'pi';
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

interface GenericKPIsProps {
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
  onOpenKPIDashboard?: (data: any) => void;
}

export default function GenericKPIs({ 
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
  onOpenKPIDashboard,
}: GenericKPIsProps) {
  const [metrics, setMetrics] = useState<MetricResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!defaultTeamOrGroupName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch cycle_time, epic_cycle_time, and open_bugs from sprint-kpis endpoint
        const params = new URLSearchParams({
          team_name: defaultTeamOrGroupName,
          isGroup: (defaultTreeType === 'group').toString(),
          metrics: 'cycle_time,epic_cycle_time,open_bugs'
        });
        
        const response = await authFetch(`/api/v1/team-metrics/sprint-kpis?${params.toString()}`);
        
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
  }, [defaultTeamOrGroupName, defaultTreeType, currentPIName]);

  const handleKPIClick = (metric: MetricResponse) => {
    if (!metric.action || !onOpenKPIDashboard) return;

    if (metric.action.type === 'report') {
      if (metric.action.report_ids && metric.action.report_ids.length > 0) {
        const mergedFilters: Record<string, any> = {
          ...metric.action.params,
        };
        
        if (defaultTeamOrGroupName) {
          mergedFilters.team_name = defaultTeamOrGroupName;
          mergedFilters.isGroup = defaultTreeType === 'group';
        }
        
        if (currentPIName) {
          mergedFilters.pi = currentPIName;
        }
        
        const kpiData = {
          title: metric.label,
          value: metric.value,
          tierStatus: metric.tier_status,
          description: metric.description,
          trend: metric.trend,
          reportIds: metric.action.report_ids,
          initialFilters: mergedFilters,
          metric: metric,
        };
        
        onOpenKPIDashboard(kpiData);
      }
    }
  };

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
    <div className="w-full overflow-visible">
      <div className="flex flex-row flex-wrap gap-2 justify-start">
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
            onClick={() => handleKPIClick(metric)}
          />
        ))}
      </div>
    </div>
  );
}

