'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
import { registerChartComponents } from '@/utils/chartRegistration';
import { formatChartDateLabel } from '@/utils/dateFormatting';
import ChartContainer from './metrics/shared/ChartContainer';
import { createTimeSeriesChartOptions } from './utils/chartOptions';

registerChartComponents(true);

interface ChangeFailureRateData {
  summary: {
    failure_rate: number;
    failed_deployments: number;
    total_deployments: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  time_series: Array<{
    period: string;
    failed_deployments: number;
    total_deployments: number;
    failure_rate: number;
  }>;
}

interface ChangeFailureRateCardProps {
  data?: ChangeFailureRateData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  setFilters?: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

// Default filter values for DORA reports
const DEFAULT_FILTERS = {
  githubRepoIds: [] as number[],
  months: 1,
  environment: '',
};

export default function ChangeFailureRateCard(props?: ChangeFailureRateCardProps) {
  // Use dual-mode hook (only for hook mode and for repositories/environments list)
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<ChangeFailureRateData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: true,
    endpoint: '/api/v1/github-service/dora/change-failure-rate',
  });

  // In report mode, use filters from props; in hook mode, use hookData
  const currentFilters = isReportMode ? (props?.filters || {}) : {
    githubRepoIds: hookData.githubRepoIds,
    months: hookData.months,
    environment: (hookData as any).environment,
  };

  // Get filter values with defaults
  const githubRepoIds = (currentFilters.githubRepoIds as number[]) || DEFAULT_FILTERS.githubRepoIds;
  const months = (currentFilters.months as number) || DEFAULT_FILTERS.months;
  const environment = (currentFilters.environment as string) ?? DEFAULT_FILTERS.environment;

  // Filter change handlers that work in both modes
  const handleGithubRepoIdsChange = (ids: number[]) => {
    if (isReportMode && props?.setFilters) {
      props.setFilters(prev => ({ ...prev, githubRepoIds: ids }));
    } else {
      hookData.setGithubRepoIds(ids);
    }
  };

  const handleMonthsChange = (newMonths: number) => {
    if (isReportMode && props?.setFilters) {
      props.setFilters(prev => ({ ...prev, months: newMonths }));
    } else {
      hookData.setMonths(newMonths);
    }
  };

  const handleEnvironmentChange = (env: string) => {
    if (isReportMode && props?.setFilters) {
      props.setFilters(prev => ({ ...prev, environment: env }));
    } else {
      (hookData as any).setEnvironment(env);
    }
  };

  // Initialize default filters in report mode on mount
  useEffect(() => {
    if (isReportMode && props?.setFilters) {
      const filtersToSet: Record<string, any> = {};
      let needsUpdate = false;

      if (props?.filters?.months === undefined) {
        filtersToSet.months = DEFAULT_FILTERS.months;
        needsUpdate = true;
      }
      if (props?.filters?.githubRepoIds === undefined) {
        filtersToSet.githubRepoIds = DEFAULT_FILTERS.githubRepoIds;
        needsUpdate = true;
      }
      if (props?.filters?.environment === undefined) {
        filtersToSet.environment = DEFAULT_FILTERS.environment;
        needsUpdate = true;
      }

      if (needsUpdate) {
        props.setFilters(prev => ({ ...prev, ...filtersToSet }));
      }
    }
  }, [isReportMode]); // Only run on mount/mode change

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return null;
    }

    const labels = data.time_series.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Failure Rate',
          data: data.time_series.map(d => d.failure_rate),
          backgroundColor: '#ef4444', // Red for failures
          borderColor: '#dc2626',
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createTimeSeriesChartOptions({
      plugins: {
        datalabels: {
          formatter: (value: number) => {
            if (value > 0) {
              return `${value.toFixed(1)}%`;
            }
            return '';
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const index = context.dataIndex;
              const dayData = data.time_series[index];
              return [
                `Failure Rate: ${dayData.failure_rate.toFixed(2)}%`,
                `Failed: ${dayData.failed_deployments}`,
                `Total: ${dayData.total_deployments}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Failure Rate (%)',
          },
          ticks: {
            callback: function(value: any) {
              return `${value}%`;
            },
          },
        },
      },
    }, isDark);
  }, [data, isDark]);

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="dora"
      title="Change Failure Rate"
      metricName="change_failure_rate"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      availableEnvironments={(hookData as any).availableEnvironments || []}
      githubRepoIds={githubRepoIds}
      environment={environment}
      months={months}
      onGithubRepoIdsChange={handleGithubRepoIdsChange}
      onEnvironmentChange={handleEnvironmentChange}
      onMonthsChange={handleMonthsChange}
      filterBadges={isReportMode ? undefined : hookData.filterBadges}
      onRefresh={isReportMode ? props?.refresh : (hookData.fetchData as () => void)}
      loading={loading}
      error={error}
      loadingText="Loading change failure rate data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">Failure Rate:</span>
            <span className="text-base font-bold text-content-primary">
              {data.summary.failure_rate.toFixed(1)}%
            </span>
          </div>
        ) : null
      }
    >
      {/* Chart */}
      <ChartContainer>
        {chartData && (
          <Chart 
            type="bar" 
            data={chartData} 
            options={chartOptions} 
            plugins={[ChartDataLabels]} 
          />
        )}
      </ChartContainer>
    </MetricCardWrapper>
  );
}


