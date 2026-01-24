'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { useDORAMetrics } from '@/hooks/useDORAMetrics';
import { useMetricData } from '@/hooks/useMetricData';
import DORAMetricCard from './DORAMetricCard';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartContainer from './metrics/shared/ChartContainer';
import { createScatterChartOptions } from './utils/chartOptions';

registerChartComponents(false);

interface RecoveryTimeData {
  summary: {
    median_minutes: number;
    total_incidents: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  incidents: Array<{
    incident_index: number;
    recovery_time_min: number;
    incident_date: string;
  }>;
}

export default function RecoveryTimeCard() {
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
  const { data, refresh: fetchRecoveryTime } = useMetricData<RecoveryTimeData>(
    '/api/v1/github-service/dora/recovery-time',
    fetchData,
    [githubRepoIds, environment, months],
    repositories
  );

  // Chart data transformation for scatter plot
  const chartData = useMemo(() => {
    if (!data || !data.incidents || data.incidents.length === 0) {
      return null;
    }

    return {
      datasets: [
        {
          type: 'scatter' as const,
          label: 'Recovery Time',
          data: data.incidents.map(incident => ({
            x: incident.incident_index,
            y: parseFloat(incident.recovery_time_min.toFixed(1)), // Round to 1 decimal place
          })),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [data]);

  // Chart options
  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createScatterChartOptions({
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const minutes = context.parsed.y;
              // Format to 1 decimal place
              const formattedMinutes = minutes.toFixed(1);
              return `Recovery Time: ${formattedMinutes}m`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 90, // Show up to 90 minutes (1.5 hours) to ensure 1h label is visible
          title: {
            display: true,
            text: 'Recovery Time',
          },
          ticks: {
            callback: function(value: any) {
              const minutes = value as number;
              if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                return hours === 1 ? '1h' : `${hours}h`;
              }
              return `${minutes}m`;
            },
            stepSize: 25, // 25 minute intervals
          },
        },
        x: {
          title: {
            display: true,
            text: 'Incident',
          },
          ticks: {
            stepSize: 1,
          },
        },
      },
    }, isDark);
  }, [data, isDark]);

  // Format median time for display
  const formatMedianTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${Math.round(minutes)}m`;
  };

  if (!data) {
    return (
      <DORAMetricCard
        title="Failed Deployment Recovery Time"
        metricName="time_to_restore"
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
        onRefresh={fetchRecoveryTime}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading recovery time data..."
        summaryContent={null}
      >
        {null}
      </DORAMetricCard>
    );
  }

  return (
    <DORAMetricCard
      title="Failed Deployment Recovery Time"
      metricName="time_to_restore"
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
      onRefresh={fetchRecoveryTime}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading recovery time data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">Median:</span>
          <span className="text-base font-bold text-content-primary">
            {formatMedianTime(data.summary.median_minutes)}
          </span>
        </div>
      }
    >
      {/* Scatter Plot Chart */}
      <ChartContainer>
        {chartData && data.incidents && data.incidents.length > 0 ? (
          <Chart 
            type="scatter" 
            data={chartData} 
            options={chartOptions} 
          />
        ) : (
          <div className="text-content-muted">No incidents in this period</div>
        )}
      </ChartContainer>
    </DORAMetricCard>
  );
}

