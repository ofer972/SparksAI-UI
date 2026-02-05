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
import PRListReportDialog from './PRListReportDialog';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

registerChartComponents(true);

interface PRMaturityData {
  summary: {
    avg_maturity: number;
    median_maturity: number;
    review_depth: number;
    total_prs: number;
    period_days: number;
    tier: string;
    tier_label: string;
    tier_description: string;
  };
  time_series: Array<{
    period: string;
    avg_maturity: number;
    pr_count: number;
  }>;
}

interface PRMaturityCardProps {
  data?: PRMaturityData;
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

export default function PRMaturityCard(props?: PRMaturityCardProps) {
  // Use dual-mode hook (only for hook mode and for repositories list)
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<PRMaturityData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: false,
    endpoint: '/api/v1/github-service/pr-workflow/pr-maturity',
  });

  const { preferences } = useUser();
  const { groups, teams } = useTeamsGroups();

  // In report mode, use filters from props; in hook mode, use hookData
  const currentFilters = isReportMode ? (props?.filters || {}) : {
    githubRepoIds: hookData.githubRepoIds,
    months: hookData.months,
    prState: (hookData as any).prState,
    teamName: (hookData as any).teamName,
    isGroup: (hookData as any).isGroup,
  };

  // Get filter values with defaults
  const githubRepoIds = (currentFilters.githubRepoIds as number[]) || DEFAULT_FILTERS.githubRepoIds;
  const months = (currentFilters.months as number) || DEFAULT_FILTERS.months;
  const prState = (currentFilters.prState as string) || DEFAULT_FILTERS.prState;
  const teamName = (currentFilters.team_name as string) || (currentFilters.teamName as string) || null;
  const isGroup = (currentFilters.isGroup as boolean) || false;

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
      if (props?.filters?.prState === undefined) {
        filtersToSet.prState = DEFAULT_FILTERS.prState;
        needsUpdate = true;
      }
      if (props?.filters?.githubRepoIds === undefined) {
        filtersToSet.githubRepoIds = DEFAULT_FILTERS.githubRepoIds;
        needsUpdate = true;
      }

      // Initialize team from user preferences if not set
      if (props?.filters?.team_name === undefined && props?.filters?.teamName === undefined && preferences?.default_team_or_group) {
        let teamGroupName = preferences.default_team_or_group;
        if (teamGroupName.includes(':')) {
          teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
        }
        filtersToSet.team_name = teamGroupName;
        filtersToSet.isGroup = preferences.default_type === 'group';
        needsUpdate = true;
      }

      if (needsUpdate) {
        props.setFilters(prev => ({ ...prev, ...filtersToSet }));
      }
    }
  }, [isReportMode, preferences]); // Only run on mount/mode change, not on filter changes

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

  const handlePrStateChange = (state: string) => {
    if (isReportMode && props?.setFilters) {
      props.setFilters(prev => ({ ...prev, prState: state }));
    } else {
      (hookData as any).setPrState(state);
    }
  };

  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    if (isReportMode && props?.setFilters) {
      if (value === null) {
        props.setFilters(prev => ({
          ...prev,
          team_name: null,
          isGroup: false,
        }));
      } else {
        props.setFilters(prev => ({
          ...prev,
          team_name: name,
          isGroup: type === 'group',
        }));
      }
    } else {
      (hookData as any).setTeamName(name || null);
      (hookData as any).setIsGroup(type === 'group');
    }
  };

  // Look up ID from name to construct proper teamValue for filter
  const teamValue = useMemo(() => {
    if (!teamName) return null;
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      return group ? `group:${group.group_key}` : null;
    } else {
      const team = teams.find(t => t.team_name === teamName);
      return team ? `team:${team.team_key}` : null;
    }
  }, [teamName, isGroup, groups, teams]);

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

    const avgMaturity = data.summary.avg_maturity;
    const labels = data.time_series.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Avg Maturity',
          data: data.time_series.map(d => d.avg_maturity * 100), // Convert to percentage
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
        {
          type: 'line' as const,
          label: 'Overall Average',
          data: labels.map(() => avgMaturity * 100),
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
      layout: {
        padding: {
          top: 20, // Add padding at top for data labels
        },
      },
      plugins: {
        datalabels: {
          formatter: (value: number, context: any) => {
            if (context.datasetIndex === 0 && value > 0) {
              return `${Math.round(value)}%`;
            }
            return '';
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 1) {
                return `Overall Average: ${(data.summary.avg_maturity * 100).toFixed(1)}%`;
              }
              return `Maturity: ${context.parsed.y.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 110, // Increase max to 110% to provide space for top labels
          title: {
            display: true,
            text: 'Maturity (%)',
          },
          ticks: {
            callback: function(value: any) {
              return `${value}%`;
            },
            max: 100, // Only show ticks up to 100%
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
      title="PR Maturity"
      metricName="pr_maturity"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      githubRepoIds={githubRepoIds}
      months={months}
      prState={prState}
      teamName={teamName}
      isGroup={isGroup}
      onGithubRepoIdsChange={handleGithubRepoIdsChange}
      onMonthsChange={handleMonthsChange}
      onPrStateChange={handlePrStateChange}
      onTeamGroupChange={handleTeamGroupChange}
      filterBadges={isReportMode ? undefined : hookData.filterBadges}
      onRefresh={isReportMode ? props?.refresh : (hookData.fetchData as () => void)}
      loading={loading}
      error={error}
      loadingText="Loading PR maturity data..."
      filters={props?.filters}
      setFilters={props?.setFilters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-content-secondary">avg</span>
              <span className="text-base font-bold text-content-primary">
                {(data.summary.avg_maturity * 100).toFixed(1)}%
              </span>
            </div>
            {data.summary.review_depth > 0 && (
              <div className="text-xs text-content-tertiary">
                Avg Comments/Review: {data.summary.review_depth.toFixed(1)}
              </div>
            )}
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

      {/* PR List Dialog */}
      {dialogOpen && selectedPeriod && (
        <PRListReportDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedPeriod(null);
          }}
          metric="pr-maturity-by-period"
          period={selectedPeriod}
          metricType="pr-maturity"
          title={`PRs Created on ${formatDate(selectedPeriod)}`}
          githubRepoIds={githubRepoIds.length > 0 ? githubRepoIds.join(',') : undefined}
        />
      )}
    </MetricCardWrapper>
  );
}

