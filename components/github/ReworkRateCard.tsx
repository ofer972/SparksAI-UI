'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { usePRWorkflowMetrics } from '@/hooks/usePRWorkflowMetrics';
import { useMetricData } from '@/hooks/useMetricData';
import PRWorkflowMetricCard from './PRWorkflowMetricCard';
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

export default function ReworkRateCard() {
  const {
    repositories,
    githubRepoIds,
    months,
    setGithubRepoIds,
    setMonths,
    filterBadges,
    fetchData,
    loading: hookLoading,
    error: hookError,
  } = usePRWorkflowMetrics();

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

  // Use shared data fetching hook
  const { data, refresh: fetchReworkRate } = useMetricData<ReworkRateData>(
    '/api/v1/github-service/pr-workflow/rework-rate',
    fetchData,
    [githubRepoIds, months],
    repositories
  );

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

  if (!data) {
    return (
      <PRWorkflowMetricCard
        title="Code Churn Rate"
        metricName="rework_rate"
        tier=""
        tierLabel=""
      repositories={repositories}
      githubRepoIds={githubRepoIds}
      months={months}
      prState="all"
      onGithubRepoIdsChange={setGithubRepoIds}
      onMonthsChange={setMonths}
      onPrStateChange={() => {}}
      filterBadges={filterBadges}
      onRefresh={fetchReworkRate}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading code churn rate data..."
      summaryContent={null}
      >
        {null}
      </PRWorkflowMetricCard>
    );
  }

  return (
    <PRWorkflowMetricCard
      title="Code Churn Rate"
      metricName="rework_rate"
      tier={data.summary.tier}
      tierLabel={data.summary.tier_label}
      repositories={repositories}
      githubRepoIds={githubRepoIds}
      months={months}
      prState="all"
      onGithubRepoIdsChange={setGithubRepoIds}
      onMonthsChange={setMonths}
      onPrStateChange={() => {}}
      filterBadges={filterBadges}
      onRefresh={fetchReworkRate}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading code churn rate data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">avg</span>
          <span className="text-base font-bold text-content-primary">
            {data.summary.rework_rate.toFixed(1)}%
          </span>
        </div>
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
    </PRWorkflowMetricCard>
  );
}

