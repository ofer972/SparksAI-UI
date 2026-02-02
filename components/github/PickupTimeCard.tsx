'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartContainer from './metrics/shared/ChartContainer';
import { createScatterChartOptions } from './utils/chartOptions';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

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

export default function PickupTimeCard(props?: PickupTimeCardProps) {
  // Use dual-mode hook (only for hook mode and for repositories list)
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<PickupTimeData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: false,
    endpoint: '/api/v1/github-service/pr-workflow/pickup-time',
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
      // githubRepoIds defaults to empty array (all repos)
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
      loadingText="Loading pickup time data..."
      filters={props?.filters}
      setFilters={props?.setFilters}
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

