'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartContainer from './metrics/shared/ChartContainer';
import { createScatterChartOptions } from './utils/chartOptions';

registerChartComponents(false);

interface LeadTimeData {
  summary: {
    median_hours: number;
    total_changes: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  changes: Array<{
    change_index: number;
    lead_time_hours: number;
    commit_date: string;
    deployment_date: string;
  }>;
}

interface LeadTimeCardProps {
  data?: LeadTimeData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function LeadTimeCard(props?: LeadTimeCardProps) {
  // Use dual-mode hook
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<LeadTimeData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: true,
    endpoint: '/api/v1/github-service/dora/lead-time',
  });

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Chart data transformation for scatter plot
  const chartData = useMemo(() => {
    if (!data || !data.changes || data.changes.length === 0) {
      return null;
    }

    return {
      datasets: [
        {
          type: 'scatter' as const,
          label: 'Lead Time',
          data: data.changes.map(change => ({
            x: change.change_index,
            y: parseFloat(change.lead_time_hours.toFixed(1)),
          })),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [data]);

  // Format time for display
  const formatTime = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes > 0) {
      return `${wholeHours}h ${minutes}m`;
    }
    return `${wholeHours}h`;
  };

  // Chart options
  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createScatterChartOptions({
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              const formatted = formatTime(hours);
              return `Lead Time: ${formatted}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Lead Time',
          },
          ticks: {
            callback: function(value: any) {
              const hours = value as number;
              return formatTime(hours);
            },
          },
        },
        x: {
          title: {
            display: true,
            text: 'Change',
          },
          ticks: {
            stepSize: 1,
          },
        },
      },
    }, isDark);
  }, [data, isDark]);

  // Format median time for display
  const formatMedianTime = (hours: number): string => {
    return formatTime(hours);
  };

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="dora"
      title="Lead Time for Changes"
      metricName="lead_time"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      availableEnvironments={(hookData as any).availableEnvironments || []}
      githubRepoIds={hookData.githubRepoIds}
      environment={(hookData as any).environment || ''}
      months={hookData.months}
      onGithubRepoIdsChange={hookData.setGithubRepoIds}
      onEnvironmentChange={(hookData as any).setEnvironment}
      onMonthsChange={hookData.setMonths}
      filterBadges={hookData.filterBadges}
      onRefresh={hookData.fetchData as () => void}
      loading={loading}
      error={error}
      loadingText="Loading lead time data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">Median:</span>
            <span className="text-base font-bold text-content-primary">
              {formatMedianTime(data.summary.median_hours)}
            </span>
          </div>
        ) : null
      }
    >
      {/* Scatter Plot Chart */}
      <ChartContainer>
        {chartData && data && data.changes && data.changes.length > 0 ? (
          <Chart 
            type="scatter" 
            data={chartData} 
            options={chartOptions} 
          />
        ) : (
          <div className="text-content-muted">No changes in this period</div>
        )}
      </ChartContainer>
    </MetricCardWrapper>
  );
}


