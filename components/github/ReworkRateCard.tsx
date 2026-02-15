'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
import { registerChartComponents } from '@/utils/chartRegistration';
import { formatChartDateLabel } from '@/utils/dateFormatting';
import ChartContainer from './metrics/shared/ChartContainer';
import { createTimeSeriesChartOptions } from './utils/chartOptions';
import CommitListReportDialog, { type CommitListData } from './CommitListReportDialog';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { authFetch } from '@/lib/api';

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
    rework_count?: number;
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

  const { preferences } = useUser();
  const { groups, teams } = useTeamsGroups();

  // In report mode, use filters from props; in hook mode, use hookData
  const currentFilters = isReportMode ? (props?.filters || {}) : {
    githubRepoIds: hookData.githubRepoIds,
    months: hookData.months,
    prState: 'all', // ReworkRate doesn't use prState
    teamName: (hookData as any).teamName,
    isGroup: (hookData as any).isGroup,
  };

  // Get filter values with defaults
  const githubRepoIds = (currentFilters.githubRepoIds as number[]) || DEFAULT_FILTERS.githubRepoIds;
  const months = (currentFilters.months as number) || DEFAULT_FILTERS.months;
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
  const [commitListData, setCommitListData] = useState<CommitListData | null>(null);
  const [commitListLoading, setCommitListLoading] = useState(false);
  const [commitListError, setCommitListError] = useState<string | null>(null);

  const fetchCommitList = useCallback(
    async (period: string) => {
      setCommitListLoading(true);
      setCommitListError(null);
      try {
        const params = new URLSearchParams({ period });
        if (githubRepoIds.length > 0) {
          params.append('github_repo_ids', githubRepoIds.join(','));
        }
        if (teamName) {
          params.append('team_name', teamName);
          params.append('isGroup', String(isGroup));
        }
        const response = await authFetch(
          `/api/v1/github-service/reports/commit-list?${params.toString()}`
        );
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        setCommitListData({
          issues: (data.data || []) as CommitListData['issues'],
          total: typeof data.total === 'number' ? data.total : 0,
          total_commits_on_period:
            typeof data.total_commits_on_period === 'number' ? data.total_commits_on_period : 0,
        });
      } catch (err) {
        setCommitListError(err instanceof Error ? err.message : 'Failed to fetch commits');
        setCommitListData(null);
      } finally {
        setCommitListLoading(false);
      }
    },
    [githubRepoIds, teamName, isGroup]
  );

  const handleCloseCommitListDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPeriod(null);
    setCommitListData(null);
    setCommitListError(null);
  }, []);

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Only show days that have commits, so the "3 commits" are visible (e.g. Jan 16 + Jan 17) instead of 31 empty bars
  const activeSeries = useMemo(() => {
    if (!data?.time_series) return [];
    const filtered = data.time_series.filter(d => (d.commit_count ?? 0) > 0);
    return filtered.length > 0 ? filtered : data.time_series;
  }, [data]);

  // Use rework_count/commit_count when both present so bar height matches tooltip; else fall back to rework_rate
  const barValues = useMemo(() => {
    return activeSeries.map(d => {
      const r = d.rework_count;
      const t = d.commit_count;
      if (typeof r === 'number' && typeof t === 'number' && t > 0) return (r / t) * 100;
      return d.rework_rate ?? 0;
    });
  }, [activeSeries]);

  const chartData = useMemo(() => {
    if (!data || activeSeries.length === 0) {
      return null;
    }

    const overallRate = data.summary.rework_rate;
    const labels = activeSeries.map(d => formatChartDateLabel(d.period));

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Code Churn Rate',
          data: barValues,
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1,
          order: 1,
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
          order: 2,
        },
      ],
    };
  }, [data, activeSeries, barValues]);

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
    if (!data || activeSeries.length === 0) return {};
    if (!data.summary) return {};
    
    // Use same bar values for scale so axis matches bar height
    const maxValue = Math.max(...barValues, data.summary.rework_rate);
    const suggestedMax = Math.max(maxValue * 1.15, 10); // Add 15% padding at top for labels, minimum 10%
    
    return createTimeSeriesChartOptions({
      layout: {
        padding: {
          top: 20, // Add padding at top for data labels
        },
      },
      plugins: {
        datalabels: {
          formatter: (value: number, context: any) => {
            if (context.datasetIndex !== 0) return '';
            if (value === 0) return '';
            return `${value.toFixed(0)}%`;
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 1 && data?.summary) {
                return `Overall Average: ${data.summary.rework_rate.toFixed(1)}%`;
              }
              const point = activeSeries[context.dataIndex];
              const rework = point?.rework_count;
              const total = point?.commit_count;
              if (typeof rework === 'number' && typeof total === 'number') {
                const pct = total ? (rework / total) * 100 : 0;
                const c = total !== 1 ? 'commits' : 'commit';
                return `${total} ${c}, ${rework} rework (${pct.toFixed(1)}%)`;
              }
              return `Code Churn Rate: ${context.parsed.y.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMax,
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
      onClick: (event: any, elements: any[]) => {
        if (elements.length === 0) return;
        if (!data || activeSeries.length === 0) return;
        
        const element = elements[0];
        // Only handle clicks on bar dataset (index 0), ignore line dataset (index 1)
        if (element.datasetIndex !== 0) return;
        
        const dataIndex = element.index;
        const clickedPeriod = activeSeries[dataIndex]?.period;
        
        if (clickedPeriod) {
          setSelectedPeriod(clickedPeriod);
          setDialogOpen(true);
          fetchCommitList(clickedPeriod);
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
  }, [data, activeSeries, barValues, isDark, fetchCommitList]);

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
      teamName={teamName}
      isGroup={isGroup}
      onGithubRepoIdsChange={handleGithubRepoIdsChange}
      onMonthsChange={handleMonthsChange}
      onPrStateChange={() => {}}
      onTeamGroupChange={handleTeamGroupChange}
      filterBadges={isReportMode ? undefined : hookData.filterBadges}
      onRefresh={isReportMode ? props?.refresh : (hookData.fetchData as () => void)}
      loading={loading}
      error={error}
      loadingText="Loading code churn rate data..."
      filters={props?.filters}
      setFilters={props?.setFilters}
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
          onClose={handleCloseCommitListDialog}
          period={selectedPeriod}
          data={commitListData}
          loading={commitListLoading}
          error={commitListError}
        />
      )}
    </MetricCardWrapper>
  );
}

