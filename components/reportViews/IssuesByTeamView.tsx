'use client';

import React, { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { IssuesByTeam } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

interface IssuesByTeamResult {
  team_breakdown?: IssuesByTeam[];
}

interface IssuesByTeamViewProps {
  data: IssuesByTeamResult | null | undefined;
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

const COLOR_PALETTE = [
  '#991b1b',
  '#fbbf24',
  '#7dd3fc',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#8b5cf6',
  '#0ea5e9',
];

const buildTeamChartData = (teams?: IssuesByTeam[]) => {
  if (!Array.isArray(teams)) {
    return {
      teams: [],
      priorities: [],
    };
  }

  const uniquePriorities = new Set<string>();
  teams.forEach((team) => {
    team.priorities?.forEach((priority) => {
      uniquePriorities.add(priority.priority ?? 'Unspecified');
    });
  });

  const sortedPriorities = Array.from(uniquePriorities).sort();

  const dataset = teams.map((team) => {
    const entry: any = {
      team_name: team.team_name ?? 'Unspecified',
      total_issues: team.total_issues ?? 0,
    };

    sortedPriorities.forEach((priorityName) => {
      const match = team.priorities?.find((p) => p.priority === priorityName);
      entry[priorityName] = match?.issue_count ?? 0;
    });

    return entry;
  });

  return {
    teams: dataset,
    priorities: sortedPriorities,
  };
};

const IssuesByTeamView: React.FC<IssuesByTeamViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  meta,
  refresh,
  componentProps,
  togglePin,
  pinnedFilters = [],
}) => {
  const issueType = (filters.issue_type as string) ?? 'Bug';
  const statusCategory = (filters.status_category as string) ?? '';
  const includeDone = Boolean(filters.include_done);

  const availableIssueTypes = useMemo(() => getIssueTypes(), []);

  // Get plural form of issue type for dynamic header
  const issueTypePlural = useMemo(() => {
    const type = issueType.toLowerCase();
    if (type === 'story') return 'Stories';
    if (type === 'bug') return 'Bugs';
    if (type === 'epic') return 'Epics';
    if (type === 'task') return 'Tasks';
    if (type === 'sub-task' || type === 'subtask') return 'Sub-tasks';
    // Default: add 's' to the end
    return issueType.charAt(0).toUpperCase() + issueType.slice(1) + 's';
  }, [issueType]);

  const availableStatusCategories = useMemo(() => {
    const categories = new Set<string>();
    if (Array.isArray(data?.team_breakdown)) {
      data?.team_breakdown.forEach((team) => {
        team.priorities?.forEach((priority) => {
          // Status categories would need to be added to the backend data structure
          // For now, we'll use common values
        });
      });
    }
    return ['To Do', 'In Progress', 'Done'];
  }, [data?.team_breakdown]);

  const teamChart = useMemo(() => buildTeamChartData(data?.team_breakdown), [data?.team_breakdown]);

  const totalIssues = useMemo(() => {
    return teamChart.teams.reduce((sum, team) => sum + (team.total_issues || 0), 0);
  }, [teamChart.teams]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              issue_type: e.target.value,
            }))
          }
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {availableIssueTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Status">
        <select
          value={statusCategory}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status_category: e.target.value || null,
            }))
          }
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {availableStatusCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Include Done">
        <input
          type="checkbox"
          checked={includeDone}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              include_done: e.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (issueType) {
      badges.push({
        label: 'Issue Type',
        value: issueType,
        filterKey: 'issue_type',
        isPinned: pinnedFilters.includes('issue_type'),
      });
    }
    
    if (statusCategory) {
      badges.push({
        label: 'Status',
        value: statusCategory,
        filterKey: 'status_category',
        isPinned: pinnedFilters.includes('status_category'),
      });
    }
    
    if (includeDone) {
      badges.push({
        label: 'Include Done',
        value: 'Yes',
        filterKey: 'include_done',
        isPinned: pinnedFilters.includes('include_done'),
      });
    }
    
    return badges;
  }, [issueType, statusCategory, includeDone, pinnedFilters]);


  return (
    <ReportCard
      title="Issues by Team"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading team breakdown...</div>
          </div>
        </div>
      )}

      {!loading && !error && teamChart.teams.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">No team data available</div>
        </div>
      )}

      {!loading && !error && teamChart.teams.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{issueTypePlural} Breakdown by Team</h3>
            <span className="text-sm text-gray-500">Total: {totalIssues}</span>
          </div>
          <div className="relative w-full h-[280px] overflow-visible">
            <ResponsiveBar
              data={teamChart.teams}
              keys={teamChart.priorities}
              indexBy="team_name"
              margin={{ top: 20, right: 20, bottom: 70, left: 50 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={(bar) => {
                const index = teamChart.priorities.indexOf(bar.id as string);
                return COLOR_PALETTE[index % COLOR_PALETTE.length];
              }}
              borderWidth={2}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 60,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '# of Issues',
                legendPosition: 'middle',
                legendOffset: -40,
              }}
              enableLabel={true}
              label={(d) => (d.value > 0 ? String(d.value) : '')}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#111827"
              tooltip={({ id, value, indexValue, color }) => (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{indexValue}</p>
                  <p className="text-gray-700" style={{ color }}>
                    {id}: {value}
                  </p>
                </div>
              )}
              legends={[]}
              role="application"
              ariaLabel="Issues by team bar chart"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
            {teamChart.priorities.map((priority, index) => (
              <div key={priority} className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                />
                <span className="text-sm text-gray-700">{priority}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ReportCard>
  );
};

export default IssuesByTeamView;

