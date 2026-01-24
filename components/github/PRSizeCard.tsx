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
import PRListReportDialog from './PRListReportDialog';

registerChartComponents(true);

interface PRSizeData {
  summary: {
    median_lines: number;
    avg_lines: number;
    total_prs: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  time_series: Array<{
    period: string;
    median_lines: number;
    avg_lines: number;
    pr_count: number;
  }>;
}

export default function PRSizeCard() {
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
  const { data, refresh: fetchPRSize } = useMetricData<PRSizeData>(
    '/api/v1/github-service/pr-workflow/pr-size',
    fetchData,
    [githubRepoIds, months, prState],
    repositories
  );

  const chartData = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return null;
    }

    const medianLines = data.summary.median_lines;
    const labels = data.time_series.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Median PR Size',
          data: data.time_series.map(d => d.median_lines),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
        {
          type: 'line' as const,
          label: 'Overall Median',
          data: labels.map(() => medianLines),
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
              return Math.round(value).toString();
            }
            return '';
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 1) {
                return `Overall Median: ${data.summary.median_lines.toFixed(0)} lines`;
              }
              return `Median: ${context.parsed.y.toFixed(0)} lines`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Lines Changed',
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
        title="PR Size"
        metricName="pr_size"
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
        onRefresh={fetchPRSize}
        loading={hookLoading}
        error={hookError}
        loadingText="Loading PR size data..."
        summaryContent={null}
      >
        {null}
      </PRWorkflowMetricCard>
    );
  }

  return (
    <PRWorkflowMetricCard
      title="PR Size"
      metricName="pr_size"
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
      onRefresh={fetchPRSize}
      loading={hookLoading}
      error={hookError}
      loadingText="Loading PR size data..."
      summaryContent={
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-secondary">median</span>
          <span className="text-base font-bold text-content-primary">
            {data.summary.median_lines.toFixed(0)} lines
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

      {/* PR List Dialog */}
      {dialogOpen && selectedPeriod && (
        <PRListReportDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedPeriod(null);
          }}
          metric="pr-size-by-period"
          period={selectedPeriod}
          metricType="pr-size"
          title={`PRs Created on ${formatDate(selectedPeriod)}`}
          githubRepoIds={githubRepoIds}
        />
      )}
    </PRWorkflowMetricCard>
  );
}

