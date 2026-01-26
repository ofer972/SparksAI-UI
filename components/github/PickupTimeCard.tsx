'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
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

interface PickupTimeCardProps {
  data?: PickupTimeData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function PickupTimeCard(props?: PickupTimeCardProps) {
  // Use dual-mode hook
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<PickupTimeData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: false,
    endpoint: '/api/v1/github-service/pr-workflow/pickup-time',
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
          ticks: {},
        },
        x: {
          title: {
            display: true,
            text: 'PR Index',
          },
          ticks: {},
        },
      },
    }, isDark);
  }, [data, isDark]);

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="pr-workflow"
      title="Pickup Time"
      metricName="pickup_time"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      githubRepoIds={hookData.githubRepoIds}
      months={hookData.months}
      prState={(hookData as any).prState || 'open'}
      onGithubRepoIdsChange={hookData.setGithubRepoIds}
      onMonthsChange={hookData.setMonths}
      onPrStateChange={(hookData as any).setPrState}
      filterBadges={hookData.filterBadges}
      onRefresh={hookData.fetchData as () => void}
      loading={loading}
      error={error}
      loadingText="Loading pickup time data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">median</span>
            <span className="text-base font-bold text-content-primary">
              {formatTime(data.summary.median_hours)}
            </span>
          </div>
        ) : null
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
    </MetricCardWrapper>
  );
}

