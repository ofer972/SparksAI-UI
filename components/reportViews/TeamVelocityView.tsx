'use client';

import React, { useMemo, useCallback } from 'react';
import { ClosedSprint } from '@/lib/config';
import StackedGroupedBarChart, {
  StackedGroupedBarChartData,
} from '../StackedGroupedBarChart';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

const sprintScopeColors = {
  'Issues Planned': '#0066cc',
  'Issues Added': '#800080',
  'Issues Completed': '#009900',
  'Issues Not Completed': '#ff8c00',
  'Issues Removed': '#00ffff',
};

export interface TeamVelocityViewProps {
  data: ClosedSprint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const TeamVelocityView: React.FC<TeamVelocityViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
  togglePin,
  pinnedFilters = [],
}) => {
  const { groups, teams } = useTeamsGroups();
  const months = Number(filters.months ?? 2);
  const teamName = (filters?.team_name as string) ?? '';
  const isGroup = (filters?.isGroup as boolean) ?? false;
  
  // Look up ID from name to construct proper teamValue
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

  const handleTimePeriodChange = useCallback(
    (value: number) => {
      setFilters?.((prev) => ({
        ...prev,
        months: value,
      }));
    },
    [setFilters]
  );

  const handleTeamGroupChange = useCallback(
    (value: string | null, type: 'group' | 'team', name: string) => {
      if (value === null) {
        setFilters?.((prev) => ({
          ...prev,
          team_name: null,
          isGroup: false,
        }));
      } else {
        setFilters?.((prev) => ({
          ...prev,
          team_name: name,
          isGroup: type === 'group',
        }));
      }
    },
    [setFilters]
  );

  // Transform sprint data to chart format
  const chartData = useMemo((): StackedGroupedBarChartData[] => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const chartDataPoints: StackedGroupedBarChartData[] = [];

    data.forEach((sprint) => {
      // Include team name in sprint label to handle duplicate sprint names across teams
      const sprintName = sprint.team_name
        ? `${sprint.sprint_name} (${sprint.team_name})`
        : sprint.sprint_name;

      // Handle both old and new field names from API
      const issuesAtStart = (sprint as any).issues_at_start ?? 0;
      const issuesAdded = (sprint as any).issues_added ?? 0;
      const issuesRemoved = (sprint as any).issues_removed ?? 0;
      const issuesDone = (sprint as any).issues_done ?? (sprint as any).issues_completed_in_sprint ?? 0;
      const issuesNotCompleted = (sprint as any).issues_not_completed ?? (sprint as any).issues_not_completed ?? 0;

      // Get issue keys (handle both old and new field names)
      const issuesAtStartKeys = (sprint as any).issues_at_start_keys ?? [];
      const issuesAddedKeys = (sprint as any).issues_added_keys ?? [];
      const issuesRemovedKeys = (sprint as any).issues_removed_keys ?? [];
      const completedIssueKeys = (sprint as any).completed_issue_keys ?? sprint.completed_issue_keys ?? [];
      const issuesNotCompletedKeys = (sprint as any).issues_not_completed_keys ?? sprint.issues_not_completed_keys ?? [];

      // Left Stack: Plan/Add
      // Issues Planned (issues_at_start)
      if (issuesAtStart > 0) {
        chartDataPoints.push({
          quarter: sprintName,
          stackGroup: 'Plan/Add',
          metricName: 'Issues Planned',
          value: issuesAtStart,
          issueKeys: Array.isArray(issuesAtStartKeys) ? issuesAtStartKeys : [],
        });
      }

      // Issues Added
      if (issuesAdded > 0) {
        chartDataPoints.push({
          quarter: sprintName,
          stackGroup: 'Plan/Add',
          metricName: 'Issues Added',
          value: issuesAdded,
          issueKeys: Array.isArray(issuesAddedKeys) ? issuesAddedKeys : [],
        });
      }

      // Right Stack: Res/NotRes/Rem
      // Issues Completed
      if (issuesDone > 0) {
        chartDataPoints.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Completed',
          value: issuesDone,
          issueKeys: Array.isArray(completedIssueKeys) ? completedIssueKeys : [],
        });
      }

      // Issues Not Completed
      if (issuesNotCompleted > 0) {
        chartDataPoints.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Not Completed',
          value: issuesNotCompleted,
          issueKeys: Array.isArray(issuesNotCompletedKeys) ? issuesNotCompletedKeys : [],
        });
      }

      // Issues Removed
      if (issuesRemoved > 0) {
        chartDataPoints.push({
          quarter: sprintName,
          stackGroup: 'Res/NotRes/Rem',
          metricName: 'Issues Removed',
          value: issuesRemoved,
          issueKeys: Array.isArray(issuesRemovedKeys) ? issuesRemovedKeys : [],
        });
      }
    });

    return chartDataPoints;
  }, [data]);

  const timePeriodOptions = [
    { value: 1, label: 'Last 1 month' },
    { value: 2, label: 'Last 2 months' },
    { value: 3, label: 'Last 3 months' },
    { value: 4, label: 'Last 4 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 9, label: 'Last 9 months' },
    { value: 12, label: 'Last 12 months' },
  ];

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Time Period">
        <select
          value={months}
          onChange={(e) => handleTimePeriodChange(Number(e.target.value))}
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
        >
          {timePeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];

    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }

    if (months) {
      badges.push({
        label: 'Time Period',
        value: `${months} month${months !== 1 ? 's' : ''}`,
        filterKey: 'months',
        isPinned: pinnedFilters.includes('months'),
      });
    }

    return badges;
  }, [teamName, isGroup, months, pinnedFilters]);

  const showChart = !loading && !error && teamName && chartData.length > 0;
  const chartTitle = teamName ? `Velocity Chart - ${teamName}` : 'Velocity Chart';

  return (
    <ReportCard
      title="Sprint Team Velocity"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
      readOnly={componentProps?.readOnly}
      hideHeader={componentProps?.hideHeader}
      hideCollapse={componentProps?.hideCollapse}
    >
      <div className="h-full w-full flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-content-secondary">Loading Velocity Chart...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !teamName && (
          <div className="flex-1 flex items-center justify-center text-content-tertiary">
            Please select a team or group to view velocity chart.
          </div>
        )}

        {showChart && (
          <div className="w-full h-full flex-1 relative min-h-[350px]">
            <StackedGroupedBarChart
              data={chartData}
              title={chartTitle}
              yAxisLabel="# of Issues"
              xAxisLabel=""
              colorScheme={sprintScopeColors}
              jiraUrl={meta?.jira_url}
              loading={false}
              error={null}
              averageVelocity={meta?.average_velocity ?? null}
            />
          </div>
        )}

        {!loading && !error && teamName && chartData.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-content-tertiary">
            No closed sprints found for the selected team and time period.
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default TeamVelocityView;










