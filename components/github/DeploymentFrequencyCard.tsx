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

interface DeploymentFrequencyCardProps {
  data?: DeploymentFrequencyData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function DeploymentFrequencyCard(props?: DeploymentFrequencyCardProps) {
  // Use dual-mode hook
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<DeploymentFrequencyData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: true,
    endpoint: '/api/v1/github-service/dora/deployment-frequency',
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

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="dora"
      title="Deployment Frequency"
      metricName="deployment_frequency"
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
      loadingText="Loading deployment frequency data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">avg</span>
            <span className="text-base font-bold text-content-primary">
              {data.summary.avg_per_day.toFixed(1)}/day
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

