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
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function ChangeFailureRateCard(props?: ChangeFailureRateCardProps) {
  // Use dual-mode hook
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<ChangeFailureRateData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: true,
    endpoint: '/api/v1/github-service/dora/change-failure-rate',
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


