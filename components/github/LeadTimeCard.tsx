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

export default function LeadTimeCard() {
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
  const { data, refresh: fetchLeadTime } = useMetricData<LeadTimeData>(
    '/api/v1/github-service/dora/lead-time',
    fetchData,
    [githubRepoIds, environment, months],
    repositories
  );

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

  if (!data) {
    return (
      <DORAMetricCard
        title="Lead Time for Changes"
        metricName="lead_time"
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
        onRefresh={fetchLeadTime}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading lead time data..."
        summaryContent={null}
      >
        {null}
      </DORAMetricCard>
    );
  }

  return (
    <DORAMetricCard
      title="Lead Time for Changes"
      metricName="lead_time"
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
      onRefresh={fetchLeadTime}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading lead time data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">Median:</span>
          <span className="text-base font-bold text-content-primary">
            {formatMedianTime(data.summary.median_hours)}
          </span>
        </div>
      }
    >
      {/* Scatter Plot Chart */}
      <ChartContainer>
        {chartData && data.changes && data.changes.length > 0 ? (
          <Chart 
            type="scatter" 
            data={chartData} 
            options={chartOptions} 
          />
        ) : (
          <div className="text-content-muted">No changes in this period</div>
        )}
      </ChartContainer>
    </DORAMetricCard>
  );
}


