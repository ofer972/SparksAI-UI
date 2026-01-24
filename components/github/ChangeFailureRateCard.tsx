'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useDORAMetrics } from '@/hooks/useDORAMetrics';
import { useMetricData } from '@/hooks/useMetricData';
import DORAMetricCard from './DORAMetricCard';
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

export default function ChangeFailureRateCard() {
  const {
    repositories,
    availableEnvironments,
    githubRepoIds,
    environment,
    months,
    setGithubRepoIds,
    setEnvironment,
    setMonths,
    filterBadges,
    fetchData,
    loading: hookLoading,
    error: hookError,
  } = useDORAMetrics();

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Use shared data fetching hook
  const { data, refresh: fetchChangeFailureRate } = useMetricData<ChangeFailureRateData>(
    '/api/v1/github-service/dora/change-failure-rate',
    fetchData,
    [githubRepoIds, environment, months],
    repositories
  );

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

  if (!data) {
    return (
      <DORAMetricCard
        title="Change Failure Rate"
        metricName="change_failure_rate"
        tier=""
        tierLabel=""
        repositories={repositories}
        availableEnvironments={availableEnvironments}
        githubRepoIds={githubRepoIds}
        environment={environment}
        months={months}
        onGithubRepoIdsChange={setGithubRepoIds}
        onEnvironmentChange={setEnvironment}
        onMonthsChange={setMonths}
        filterBadges={filterBadges}
        onRefresh={fetchChangeFailureRate}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading change failure rate data..."
        summaryContent={null}
      >
        {null}
      </DORAMetricCard>
    );
  }

  return (
    <DORAMetricCard
      title="Change Failure Rate"
      metricName="change_failure_rate"
      tier={data.summary.tier}
      tierLabel={data.summary.tier_label}
      repositories={repositories}
      availableEnvironments={availableEnvironments}
      githubRepoIds={githubRepoIds}
      environment={environment}
      months={months}
      onGithubRepoIdsChange={setGithubRepoIds}
      onEnvironmentChange={setEnvironment}
      onMonthsChange={setMonths}
      filterBadges={filterBadges}
      onRefresh={fetchChangeFailureRate}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading change failure rate data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">Failure Rate:</span>
          <span className="text-base font-bold text-content-primary">
            {data.summary.failure_rate.toFixed(1)}%
          </span>
        </div>
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
    </DORAMetricCard>
  );
}


