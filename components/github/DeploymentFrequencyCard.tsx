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

interface DeploymentFrequencyData {
  summary: {
    avg_per_day: number;
    total_deployments: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  time_series: Array<{
    period: string;
    deployments: number;
  }>;
}

export default function DeploymentFrequencyCard() {
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
  const { data, refresh: fetchDeploymentFrequency } = useMetricData<DeploymentFrequencyData>(
    '/api/v1/github-service/dora/deployment-frequency',
    fetchData,
    [githubRepoIds, environment, months],
    repositories
  );

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return null;
    }

    const avgPerDay = data.summary.avg_per_day;
    const labels = data.time_series.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Deployments',
          data: data.time_series.map(d => d.deployments),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
        {
          type: 'line' as const,
          label: 'Average',
          data: labels.map(() => avgPerDay),
          borderColor: '#9333ea',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
        },
      ],
    };
  }, [data]);

  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createTimeSeriesChartOptions({
      plugins: {
        datalabels: {
          formatter: (value: number, context: any) => {
            // Only show labels on bars (datasetIndex 0), not on the average line
            if (context.datasetIndex === 0 && value > 0) {
              return value.toString();
            }
            return '';
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 1) {
                return `Average: ${data.summary.avg_per_day.toFixed(2)}/day`;
              }
              return `${context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Deployments',
          },
          ticks: {
            stepSize: 1,
          },
        },
      },
    }, isDark);
  }, [data, isDark]);

  if (!data) {
    return (
      <DORAMetricCard
        title="Deployment Frequency"
        metricName="deployment_frequency"
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
        onRefresh={fetchDeploymentFrequency}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading deployment frequency data..."
        summaryContent={null}
      >
        {null}
      </DORAMetricCard>
    );
  }

  return (
    <DORAMetricCard
      title="Deployment Frequency"
      metricName="deployment_frequency"
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
      onRefresh={fetchDeploymentFrequency}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading deployment frequency data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">avg</span>
          <span className="text-base font-bold text-content-primary">
            {data.summary.avg_per_day.toFixed(1)}/day
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

