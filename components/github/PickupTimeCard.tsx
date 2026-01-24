'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { usePRWorkflowMetrics } from '@/hooks/usePRWorkflowMetrics';
import { useMetricData } from '@/hooks/useMetricData';
import PRWorkflowMetricCard from './PRWorkflowMetricCard';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartContainer from './metrics/shared/ChartContainer';
import { createScatterChartOptions } from './utils/chartOptions';

registerChartComponents(false);

interface PickupTimeData {
  summary: {
    median_hours: number;
    avg_hours: number;
    total_prs: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  individual_prs: Array<{
    pr_index: number;
    pickup_hours: number;
    pr_date: string;
  }>;
}

export default function PickupTimeCard() {
  const {
    repositories,
    githubRepoIds,
    months,
    prState,
    setGithubRepoIds,
    setMonths,
    setPrState,
    filterBadges,
    fetchData,
    loading: hookLoading,
    error: hookError,
  } = usePRWorkflowMetrics();

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
  const { data, refresh: fetchPickupTime } = useMetricData<PickupTimeData>(
    '/api/v1/github-service/pr-workflow/pickup-time',
    fetchData,
    [githubRepoIds, months, prState],
    repositories
  );

  const chartData = useMemo(() => {
    if (!data || !data.individual_prs || data.individual_prs.length === 0) {
      return null;
    }

    return {
      datasets: [
        {
          type: 'scatter' as const,
          label: 'Pickup Time',
          data: data.individual_prs.map(pr => ({
            x: pr.pr_index,
            y: parseFloat(pr.pickup_hours.toFixed(1)),
          })),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [data]);

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours < 1) {
        return `${days}d`;
      }
      return `${days}d ${Math.round(remainingHours)}h`;
    }
  };

  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createScatterChartOptions({
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              return `Pickup Time: ${formatTime(hours)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours',
          },
        },
        x: {
          title: {
            display: true,
            text: 'PR Index',
          },
        },
      },
    }, isDark);
  }, [data, isDark]);

  if (!data) {
    return (
      <PRWorkflowMetricCard
        title="Pickup Time"
        metricName="pickup_time"
        tier=""
        tierLabel=""
        repositories={repositories}
        githubRepoIds={githubRepoIds}
        months={months}
        prState={prState}
        onGithubRepoIdsChange={setGithubRepoIds}
        onMonthsChange={setMonths}
        onPrStateChange={setPrState}
        filterBadges={filterBadges}
        onRefresh={fetchPickupTime}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading pickup time data..."
        summaryContent={null}
      >
        {null}
      </PRWorkflowMetricCard>
    );
  }

  return (
    <PRWorkflowMetricCard
      title="Pickup Time"
      metricName="pickup_time"
      tier={data.summary.tier}
      tierLabel={data.summary.tier_label}
      repositories={repositories}
      githubRepoIds={githubRepoIds}
      months={months}
      prState={prState}
      onGithubRepoIdsChange={setGithubRepoIds}
      onMonthsChange={setMonths}
      onPrStateChange={setPrState}
      filterBadges={filterBadges}
      onRefresh={fetchPickupTime}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading pickup time data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">median</span>
          <span className="text-base font-bold text-content-primary">
            {formatTime(data.summary.median_hours)}
          </span>
        </div>
      }
    >
      <ChartContainer>
        {chartData && (
          <Chart 
            type="scatter" 
            data={chartData} 
            options={chartOptions} 
          />
        )}
      </ChartContainer>
    </PRWorkflowMetricCard>
  );
}

