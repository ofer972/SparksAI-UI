'use client';

import { useMemo, useState, useEffect } from 'react';
import { Chart } from 'react-chartjs-2';
import { useDualModeMetricData } from '@/hooks/useDualModeMetricData';
import MetricCardWrapper from './MetricCardWrapper';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartContainer from './metrics/shared/ChartContainer';
import { createHistogramChartOptions } from './utils/chartOptions';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

registerChartComponents(true);

// Histogram buckets for recovery time (minutes)
const RECOVERY_TIME_BUCKETS = [
  { label: 'Up to 15m', minMinutes: 0, maxMinutes: 15 },
  { label: '15m-1h', minMinutes: 15, maxMinutes: 60 },
  { label: '1h-6h', minMinutes: 60, maxMinutes: 360 },
  { label: '6h-1d', minMinutes: 360, maxMinutes: 1440 },      // 24*60
  { label: '1d-3d', minMinutes: 1440, maxMinutes: 4320 },    // 72*60
  { label: '3d-7d', minMinutes: 4320, maxMinutes: 10080 },   // 168*60
  { label: '7d-30d', minMinutes: 10080, maxMinutes: 43200 }, // 30*24*60
  { label: '30d+', minMinutes: 43200, maxMinutes: Infinity },
];

function getRecoveryBucketIndex(minutes: number): number {
  const i = RECOVERY_TIME_BUCKETS.findIndex(
    (b) => minutes >= b.minMinutes && (b.maxMinutes === Infinity || minutes < b.maxMinutes)
  );
  return i >= 0 ? i : RECOVERY_TIME_BUCKETS.length - 1;
}

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

interface RecoveryTimeCardProps {
  data?: RecoveryTimeData;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  setFilters?: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  refresh?: () => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

// Default filter values for DORA reports
const DEFAULT_FILTERS = {
  githubRepoIds: [] as number[],
  months: 1,
  environment: '',
};

export default function RecoveryTimeCard(props?: RecoveryTimeCardProps) {
  const { groups, teams } = useTeamsGroups();

  // Use dual-mode hook (only for hook mode and for repositories/environments list)
  const { data, loading, error, isReportMode, hookData } = useDualModeMetricData<RecoveryTimeData>({
    data: props?.data,
    loading: props?.loading,
    error: props?.error,
    filters: props?.filters,
    refresh: props?.refresh,
    useDORA: true,
    endpoint: '/api/v1/github-service/dora/recovery-time',
  });

  // In report mode, use filters from props; in hook mode, use hookData
  const currentFilters = isReportMode ? (props?.filters || {}) : {
    githubRepoIds: hookData.githubRepoIds,
    months: hookData.months,
    environment: (hookData as any).environment,
    teamName: (hookData as any).teamName,
    isGroup: (hookData as any).isGroup,
  };

  // Get filter values with defaults
  const githubRepoIds = (currentFilters.githubRepoIds as number[]) || DEFAULT_FILTERS.githubRepoIds;
  const months = (currentFilters.months as number) || DEFAULT_FILTERS.months;
  const environment = (currentFilters.environment as string) ?? DEFAULT_FILTERS.environment;
  const teamName = (currentFilters.team_name as string) || (currentFilters.teamName as string) || null;
  const isGroup = (currentFilters.isGroup as boolean) || false;

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

  const handleEnvironmentChange = (env: string) => {
    if (isReportMode && props?.setFilters) {
      props.setFilters(prev => ({ ...prev, environment: env }));
    } else {
      (hookData as any).setEnvironment(env);
    }
  };

  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    if (isReportMode && props?.setFilters) {
      if (value === null) {
        props.setFilters(prev => ({
          ...prev,
          team_name: null,
          teamName: null,
          isGroup: false,
        }));
      } else {
        props.setFilters(prev => ({
          ...prev,
          team_name: name,
          teamName: name,
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

  // Initialize default filters in report mode on mount
  useEffect(() => {
    if (isReportMode && props?.setFilters) {
      const filtersToSet: Record<string, any> = {};
      let needsUpdate = false;

      if (props?.filters?.months === undefined) {
        filtersToSet.months = DEFAULT_FILTERS.months;
        needsUpdate = true;
      }
      if (props?.filters?.githubRepoIds === undefined) {
        filtersToSet.githubRepoIds = DEFAULT_FILTERS.githubRepoIds;
        needsUpdate = true;
      }
      if (props?.filters?.environment === undefined) {
        filtersToSet.environment = DEFAULT_FILTERS.environment;
        needsUpdate = true;
      }

      if (needsUpdate) {
        props.setFilters(prev => ({ ...prev, ...filtersToSet }));
      }
    }
  }, [isReportMode]); // Only run on mount/mode change

  // Theme colors (match Pickup Time bar chart: primary blue + white label in bar)
  const [isDark, setIsDark] = useState(false);
  const [chartColors, setChartColors] = useState({ bar: 'rgb(37, 99, 235)', label: '#ffffff' });
  useEffect(() => {
    const updateTheme = () => {
      const root = document.documentElement;
      setIsDark(root.classList.contains('dark'));
      const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
      const bar = primary ? `rgb(${primary.replace(/\s+/g, ', ')})` : 'rgb(37, 99, 235)';
      setChartColors({ bar, label: '#ffffff' });
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Chart data: histogram counts per bucket
  const chartData = useMemo(() => {
    if (!data || !data.incidents || data.incidents.length === 0) {
      return null;
    }

    const counts = RECOVERY_TIME_BUCKETS.map(() => 0);
    for (const incident of data.incidents) {
      counts[getRecoveryBucketIndex(incident.recovery_time_min)] += 1;
    }

    return {
      labels: RECOVERY_TIME_BUCKETS.map((b) => b.label),
      datasets: [
        {
          label: 'Incidents',
          data: counts,
          backgroundColor: chartColors.bar,
          datalabels: {
            color: () => chartColors.label,
          },
        },
      ],
    };
  }, [data, chartColors]);

  // Chart options (histogram)
  const chartOptions = useMemo(
    () =>
      createHistogramChartOptions(
        {
          scales: {
            x: { title: { display: true, text: 'Recovery Time' } },
            y: { title: { display: true, text: 'Incidents' } },
          },
          plugins: {
            datalabels: {
              color: () => chartColors.label,
              anchor: 'center',
              align: 'center',
              formatter: (value: number) => (value > 0 ? value : ''),
            },
            tooltip: {
              callbacks: {
                label: (context: { label?: string; parsed?: { y?: number | null } }) =>
                  `${context.label}: ${context.parsed?.y ?? 0} incidents`,
              },
            },
          },
        },
        isDark
      ),
    [isDark, chartColors]
  );

  // Format median time for display
  const formatMedianTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${Math.round(minutes)}m`;
  };

  return (
    <MetricCardWrapper
      isReportMode={isReportMode}
      cardType="dora"
      title="Failed Deployment Recovery Time"
      metricName="time_to_restore"
      tier={data?.summary?.tier || ''}
      tierLabel={data?.summary?.tier_label || ''}
      repositories={hookData.repositories}
      availableEnvironments={(hookData as any).availableEnvironments || []}
      githubRepoIds={githubRepoIds}
      environment={environment}
      months={months}
      teamName={teamName}
      isGroup={isGroup}
      onGithubRepoIdsChange={handleGithubRepoIdsChange}
      onEnvironmentChange={handleEnvironmentChange}
      onMonthsChange={handleMonthsChange}
      onTeamGroupChange={handleTeamGroupChange}
      filterBadges={isReportMode ? undefined : hookData.filterBadges}
      onRefresh={isReportMode ? props?.refresh : (hookData.fetchData as () => void)}
      loading={loading}
      error={error}
      loadingText="Loading recovery time data..."
      filters={props?.filters}
      togglePin={props?.togglePin}
      pinnedFilters={props?.pinnedFilters}
      componentProps={props?.componentProps}
      summaryContent={
        data?.summary ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-content-secondary">Median:</span>
            <span className="text-base font-bold text-content-primary">
              {formatMedianTime(data.summary.median_minutes)}
            </span>
          </div>
        ) : null
      }
    >
      {/* Recovery Time histogram */}
      <ChartContainer>
        {chartData && data && data.incidents && data.incidents.length > 0 ? (
          <Chart type="bar" data={chartData} options={chartOptions} />
        ) : (
          <div className="text-content-muted">No incidents in this period</div>
        )}
      </ChartContainer>
    </MetricCardWrapper>
  );
}

