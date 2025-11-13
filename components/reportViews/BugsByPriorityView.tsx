'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  BarChart,
  CartesianGrid,
  Bar,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts';
import type { IssueByPriority, IssuesByTeam } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

interface BugsByPriorityResult {
  priority_summary?: IssueByPriority[];
  team_breakdown?: IssuesByTeam[];
}

interface BugsByPriorityViewProps {
  data: BugsByPriorityResult | null | undefined;
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

const normalizePrioritySummary = (summary?: IssueByPriority[]): IssueByPriority[] => {
  if (!Array.isArray(summary)) {
    return [];
  }

  const merged = summary.reduce((acc, item) => {
    const key = item.priority?.toLowerCase() ?? 'unspecified';
    const existing = acc.get(key);
    const count = Number(item.issue_count ?? 0);

    if (existing) {
      existing.issue_count += count;
    } else {
      acc.set(key, {
        priority: item.priority ?? 'Unspecified',
        status_category: item.status_category ?? 'Unspecified',
        issue_count: count,
      });
    }

    return acc;
  }, new Map<string, IssueByPriority>());

  return Array.from(merged.values()).sort((a, b) => a.priority.localeCompare(b.priority));
};

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

const BugsByPriorityView: React.FC<BugsByPriorityViewProps> = ({
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
  const teamName = (filters.team_name as string) ?? '';
  const statusCategory = (filters.status_category as string) ?? '';
  const includeDone = Boolean(filters.include_done);

  const availableIssueTypes = useMemo(() => getIssueTypes(), []);

  const availableStatusCategories = useMemo(() => {
    const categories = new Set<string>();
    if (Array.isArray(data?.priority_summary)) {
      data?.priority_summary.forEach((item) => {
        const value = item.status_category ?? '';
        if (value) {
          categories.add(value);
        }
      });
    }
    return Array.from(categories).sort();
  }, [data?.priority_summary]);

  const prioritySummary = useMemo(
    () => normalizePrioritySummary(data?.priority_summary),
    [data?.priority_summary]
  );
  const totalCount = useMemo(
    () => prioritySummary.reduce((sum, item) => sum + (item.issue_count ?? 0), 0),
    [prioritySummary]
  );

  const pieData = useMemo(
    () =>
      prioritySummary.map((item, index) => ({
        name: item.priority ?? 'Unspecified',
        value: item.issue_count ?? 0,
        percentage: totalCount > 0 ? ((item.issue_count ?? 0) / totalCount) * 100 : 0,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      })),
    [prioritySummary, totalCount]
  );

  const teamChart = useMemo(() => buildTeamChartData(data?.team_breakdown), [data?.team_breakdown]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team">
        <span className="text-sm text-gray-700">
          {teamName ? teamName : 'All Teams'}
        </span>
      </ReportFilterField>

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

  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, value, name }: any) => {
    if (!value) {
      return null;
    }
    const RADIAN = Math.PI / 180;
    const labelRadius = outerRadius + 12;
    const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
    const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : '0.0';

    return (
      <text
        x={x}
        y={y}
        fill="#111827"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${value} (${percentage}%)`}
      </text>
    );
  };

  const pieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const { name, value } = payload[0].payload;
      const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
          <p className="font-semibold text-gray-900 mb-1">{name}</p>
          <p className="text-gray-600">{value} issues ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

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
      title="Bugs by Priority"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      onRefresh={refresh}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Open Bugs by Priority</h3>
              <span className="text-sm text-gray-500">Total: {totalCount}</span>
            </div>
            <div className="h-72">
              {loading ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-600">
                  Loading priority chart...
                </div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={renderPieLabel}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={pieTooltip} />
                    <RechartsLegend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bugs by Team</h3>
            <div className="h-72">
              {loading ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-600">
                  Loading team breakdown...
                </div>
              ) : teamChart.teams.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={teamChart.teams} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team_name" tick={{ fontSize: 12 }} />
                    <YAxis />
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
        </div>
      )}
    </ReportCard>
  );
};

export default BugsByPriorityView;

