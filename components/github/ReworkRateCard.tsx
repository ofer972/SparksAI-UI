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
import CommitListReportDialog from './CommitListReportDialog';

registerChartComponents(true);

interface ReworkRateData {
  summary: {
    rework_rate: number;
    total_commits: number;
    rework_commits: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  time_series: Array<{
    period: string;
    rework_rate: number;
    commit_count: number;
  }>;
}

interface ReworkRateCardProps {
  data?: ReworkRateData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  setFilters?: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

// Default filter values for PR workflow reports
const DEFAULT_FILTERS = {
  githubRepoIds: [] as number[],
  months: 1,
  prState: 'all',
};

export default function ReworkRateCard(props?: ReworkRateCardProps) {
  // Use dual-mode hook (only for hook mode and for repositories list)
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<ReworkRateData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: false,
    endpoint: '/api/v1/github-service/pr-workflow/rework-rate',
  });

  // In report mode, use filters from props; in hook mode, use hookData
  const currentFilters = isReportMode ? (props?.filters || {}) : {
    githubRepoIds: hookData.githubRepoIds,
    months: hookData.months,
    prState: 'all', // ReworkRate doesn't use prState
  };

  // Get filter values with defaults
  const githubRepoIds = (currentFilters.githubRepoIds as number[]) || DEFAULT_FILTERS.githubRepoIds;
  const months = (currentFilters.months as number) || DEFAULT_FILTERS.months;

  // Initialize default filters in report mode on mount
  useEffect(() => {
    if (isReportMode && props?.setFilters) {
      const filtersToSet: Record<string, any> = {};
      let needsUpdate = false;

      // Set defaults if not already present
      if (props?.filters?.months === undefined) {
        filtersToSet.months = DEFAULT_FILTERS.months;
        needsUpdate = true;
      }
      if (props?.filters?.githubRepoIds === undefined) {
        filtersToSet.githubRepoIds = DEFAULT_FILTERS.githubRepoIds;
        needsUpdate = true;
      }

      if (needsUpdate) {
        props.setFilters(prev => ({ ...prev, ...filtersToSet }));
      }
    }
  }, [isReportMode]); // Only run on mount/mode change, not on filter changes

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

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    if (!data || !data.time_series || data.time_series.length === 0) {
      return null;
    }

    const overallRate = data.summary.rework_rate;
    const labels = data.time_series.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Code Churn Rate',
          data: data.time_series.map(d => d.rework_rate),
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1,
        },
        {
          type: 'line' as const,
          label: 'Overall Average',
          data: labels.map(() => overallRate),
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

  const formatDate = (period: string): string => {
    try {
      const date = new Date(period + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return period;
    }
  };

  const chartOptions = useMemo(() => {
    if (!data) return {};
    
    return createTimeSeriesChartOptions({
      plugins: {
        datalabels: {
          formatter: (value: number, context: any) => {
            if (context.datasetIndex === 0 && value > 0) {
              return `${value.toFixed(1)}%`;
            }
            return '';
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 1) {
                return `Overall Average: ${data.summary.rework_rate.toFixed(1)}%`;
              }
              return `Code Churn Rate: ${context.parsed.y.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Code Churn Rate (%)',
          },
          ticks: {
            callback: function(value: any) {
              return `${value}%`;
            },
          },
        },
      },
      events: ['click'],
      onClick: (event: any, elements: any[]) => {
        if (elements.length === 0) return;
        const element = elements[0];
        // Only handle clicks on bar dataset (index 0), ignore line dataset (index 1)
        if (element.datasetIndex !== 0) return;
        
        const dataIndex = element.index;
        const clickedPeriod = data.time_series[dataIndex]?.period;
        
        if (clickedPeriod) {
          setSelectedPeriod(clickedPeriod);
          setDialogOpen(true);
        }
      },
      interaction: {
        mode: 'point' as const,
        intersect: true,
      },
      elements: {
        bar: {
          borderSkipped: false,
        },
      },
      onHover: (event: any, elements: any[]) => {
        if (elements.length > 0 && elements[0].datasetIndex === 0) {
          event.native.target.style.cursor = 'pointer';
        } else {
          event.native.target.style.cursor = 'default';
        }
      },
    }, isDark);
  }, [data, isDark]);

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="pr-workflow"
      title="Code Churn Rate"
      metricName="rework_rate"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      githubRepoIds={githubRepoIds}
      months={months}
      prState="all"
      onGithubRepoIdsChange={handleGithubRepoIdsChange}
      onMonthsChange={handleMonthsChange}
      onPrStateChange={() => {}}
      filterBadges={isReportMode ? undefined : hookData.filterBadges}
      onRefresh={isReportMode ? props?.refresh : (hookData.fetchData as () => void)}
      loading={loading}
      error={error}
      loadingText="Loading code churn rate data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">avg</span>
            <span className="text-base font-bold text-content-primary">
              {data.summary.rework_rate.toFixed(1)}%
            </span>
          </div>
        ) : null
      }
    >
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

      {/* Commit List Dialog */}
      {dialogOpen && selectedPeriod && (
        <CommitListReportDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedPeriod(null);
          }}
          period={selectedPeriod}
          githubRepoIds={githubRepoIds.length > 0 ? githubRepoIds.join(',') : undefined}
        />
      )}
    </MetricCardWrapper>
  );
}

