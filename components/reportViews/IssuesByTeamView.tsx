'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  LabelList,
} from 'recharts';
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

  const barTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
          <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.team_name}</p>
          {payload.map((entry: any) => {
            if (entry.value > 0) {
              return (
                <p key={entry.dataKey} className="text-gray-700" style={{ color: entry.fill }}>
                  {entry.dataKey}: {entry.value}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <ReportCard
      title="Issues by Team"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{issueTypePlural} Breakdown by Team</h3>
            <span className="text-sm text-gray-500">Total: {totalIssues}</span>
          </div>
          <div className="h-96">
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-600">
                Loading team breakdown...
              </div>
            ) : teamChart.teams.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={teamChart.teams} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="team_name" 
                    tick={{ fontSize: 11 }} 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip content={barTooltip} />
                  <RechartsLegend wrapperStyle={{ fontSize: '12px' }} />
                  {teamChart.priorities.map((priorityName, index) => (
                    <Bar
                      key={priorityName}
                      dataKey={priorityName}
                      stackId="bugs"
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey={priorityName}
                        position="center"
                        content={(props: any) => {
                          const { value } = props;
                          if (!value) {
                            return null;
                          }
                          return (
                            <text
                              x={props.x + props.width / 2}
                              y={props.y + props.height / 2}
                              fill="#111827"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={11}
                              fontWeight={600}
                            >
                              {value}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No team data available
              </div>
            )}
          </div>
        </div>
      )}
    </ReportCard>
  );
};

export default IssuesByTeamView;

