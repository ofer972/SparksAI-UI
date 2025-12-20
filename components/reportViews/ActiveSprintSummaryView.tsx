'use client';

import React, { useMemo, useState } from 'react';
import { ActiveSprintSummaryItem } from '@/lib/config';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import DataTable, { Column, SortConfig } from '../DataTable';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

export interface ActiveSprintSummaryViewProps {
  data: ActiveSprintSummaryItem[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const ActiveSprintSummaryView: React.FC<ActiveSprintSummaryViewProps> = ({
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  const { groups, teams } = useTeamsGroups();

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

  const handleTeamGroupChange = React.useCallback(
    (value: string | null, type: 'group' | 'team', name: string) => {
      if (value === null) {
        setFilters((prev) => ({
          ...prev,
          team_name: '',
          isGroup: false,
        }));
      } else {
        setFilters((prev) => ({
          ...prev,
          team_name: name,
          isGroup: type === 'group',
        }));
      }
    },
    [setFilters]
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // Build columns for DataTable
  const columns = useMemo<Column<ActiveSprintSummaryItem>[]>(() => {
    if (data.length === 0) {
      return [];
    }

    const jiraUrl = meta?.jira_url;
    const firstItem = data[0];
    const allKeys = Object.keys(firstItem);

    // Filter out fields that shouldn't be displayed as dynamic columns
    const excludedKeys = [
      'team_name',
      'sprint_name',
      'sprint_id',
      'start_date',
      'end_date',
      'overall_progress_pct',
      'overall_progress_pct_color',
      'total_issues_to_do',
      'total_issues_in_progress',
      'total_issues_done',
      'issues_remaining',
      'issues_added_color',
      'board_id',
      'project_key',
      'active_sprint_url',
    ];

    const otherKeys = allKeys.filter(key =>
      !excludedKeys.includes(key) &&
      !key.endsWith('_keys')
    );

    // Build fixed columns first
    const builtColumns: Column<ActiveSprintSummaryItem>[] = [
      {
        key: 'team_name',
        label: 'TEAM NAME',
        align: 'left',
        sortable: true,
        width: '150px',
        render: (value) => (
          <div className="text-sm text-gray-900 font-medium">
            {value || '-'}
          </div>
        ),
      },
      {
        key: 'sprint_name',
        label: 'SPRINT NAME',
        align: 'left',
        sortable: true,
        width: '160px',
        render: (value, row) => {
          const sprintUrl = row.active_sprint_url;
          if (sprintUrl) {
            return (
              <div
                className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(sprintUrl, '_blank');
                }}
                title={sprintUrl}
              >
                {value || '-'}
              </div>
            );
          }
          return (
            <div className="text-sm text-gray-900 font-medium">
              {value || '-'}
            </div>
          );
        },
      },
      {
        key: 'end_date',
        label: 'END DATE',
        align: 'center',
        sortable: true,
        width: '120px',
        render: (value) => {
          if (!value) return <div className="text-sm text-gray-500 text-center">-</div>;
          try {
            const date = new Date(value as string);
            const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <div className="text-sm text-gray-700 text-center">
                {formatted}
              </div>
            );
          } catch {
            return <div className="text-sm text-gray-700">{String(value)}</div>;
          }
        },
      },
      {
        key: 'progress_status',
        label: 'PROGRESS (by CATEGORY)',
        align: 'center',
        sortable: false,
        width: '200px',
        render: (value, row) => {
          const item = row;
          const done = item.total_issues_done || 0;
          const inProgress = item.total_issues_in_progress || 0;
          const toDo = item.total_issues_to_do || 0;
          const total = done + inProgress + toDo;

          if (total === 0) {
            return (
              <div className="text-sm text-gray-500 text-center">-</div>
            );
          }

          const donePercent = (done / total) * 100;
          const inProgressPercent = (inProgress / total) * 100;
          const toDoPercent = (toDo / total) * 100;

          return (
            <div className="flex items-center justify-center">
              <div className="w-full max-w-[180px] h-3 bg-gray-200 rounded-full overflow-hidden flex flex-row">
                {done > 0 && (
                  <div
                    className="bg-green-600 h-full transition-all"
                    style={{ width: `${donePercent}%`, minWidth: donePercent > 0 ? '2px' : '0' }}
                    title={`Done: ${done}`}
                  />
                )}
                {inProgress > 0 && (
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${inProgressPercent}%`, minWidth: inProgressPercent > 0 ? '2px' : '0' }}
                    title={`In Progress: ${inProgress}`}
                  />
                )}
                {toDo > 0 && (
                  <div
                    className="bg-gray-300 h-full transition-all"
                    style={{ width: `${toDoPercent}%`, minWidth: toDoPercent > 0 ? '2px' : '0' }}
                    title={`To Do: ${toDo}`}
                  />
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'overall_progress_pct',
        label: 'Progress %',
        align: 'center',
        sortable: true,
        width: '150px',
        render: (value, row) => {
          const val = value as number | null;
          const item = row;
          const progressColor = item.overall_progress_pct_color;

          if (val === null || val === undefined) {
            return (
              <div className="text-sm text-center font-bold text-gray-500">
                -
              </div>
            );
          }

          const formattedVal = val.toFixed(1);
          let colorClass = 'text-gray-700';
          if (progressColor === 'green') {
            colorClass = 'text-green-600 font-bold';
          } else if (progressColor === 'yellow') {
            colorClass = 'text-yellow-600 font-bold';
          } else if (progressColor === 'red') {
            colorClass = 'text-red-600 font-bold';
          } else {
            colorClass = 'text-gray-500';
          }

          return (
            <div className={`text-sm text-center font-bold ${colorClass}`}>
              {formattedVal}%
            </div>
          );
        },
      },
      {
        key: 'total_issues_done',
        label: '# Done',
        align: 'center',
        sortable: true,
        width: '150px',
        render: (value, row) => {
          const val = value as number;
          const item = row;
          const issueKeys = item.issues_done_keys as string[] | null;
          const keysArray = issueKeys || [];

          if (!keysArray || keysArray.length === 0 || val === 0) {
            return (
              <div className="text-sm text-green-600 font-bold text-center">
                {val.toLocaleString()}
              </div>
            );
          }

          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!jiraUrl) return;
            const keysParam = keysArray.join(', ');
            const jqlQuery = `key IN (${keysParam})`;
            const encodedJql = encodeURIComponent(jqlQuery);
            const jiraLink = `${jiraUrl}/issues/?jql=${encodedJql}`;
            window.open(jiraLink, '_blank');
          };

          return (
            <div
              className="text-sm font-bold text-green-600 hover:text-green-800 underline cursor-pointer text-center"
              onClick={handleClick}
              title={keysArray.join(', ')}
            >
              {val.toLocaleString()}
            </div>
          );
        },
      },
      {
        key: 'issues_remaining',
        label: '# Remaining',
        align: 'center',
        sortable: true,
        width: '150px',
        render: (value, row) => {
          const val = value as number;
          const item = row;
          const issueKeys = item.issues_remaining_keys as string[] | null;
          const keysArray = issueKeys || [];

          if (!keysArray || keysArray.length === 0 || val === 0) {
            return (
              <div className="text-sm text-gray-500 text-center">
                {val.toLocaleString()}
              </div>
            );
          }

          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!jiraUrl) return;
            const keysParam = keysArray.join(', ');
            const jqlQuery = `key IN (${keysParam})`;
            const encodedJql = encodeURIComponent(jqlQuery);
            const jiraLink = `${jiraUrl}/issues/?jql=${encodedJql}`;
            window.open(jiraLink, '_blank');
          };

          return (
            <div
              className="text-sm font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer text-center"
              onClick={handleClick}
              title={keysArray.join(', ')}
            >
              {val.toLocaleString()}
            </div>
          );
        },
      },
    ];

    // Add all other fields dynamically
    otherKeys.forEach(key => {
      const value = firstItem[key];

      let column: Column<ActiveSprintSummaryItem>;

      if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}T/))) {
        // Date field
        column = {
          key,
          label: key.toUpperCase().replace(/_/g, ' '),
          align: 'center',
          sortable: true,
          width: '120px',
          render: (val) => {
            if (!val) return <div className="text-sm text-gray-500 text-center">-</div>;
            try {
              const date = new Date(val as string);
              const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              return (
                <div className="text-sm text-gray-700 text-center">
                  {formatted}
                </div>
              );
            } catch {
              return <div className="text-sm text-gray-700">{String(val)}</div>;
            }
          },
        };
      } else if (typeof value === 'number') {
        // Number field - check if it's a percentage field or an issue count field that should be a link
        const isPercentage = key.toLowerCase().includes('pct') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('progress');
        const isOverallProgressPct = key === 'overall_progress_pct';
        const hasKeysField = firstItem[`${key}_keys`] !== undefined;
        const isIssueCountField = hasKeysField && (
          key === 'issues_at_start' ||
          key === 'issues_added' ||
          key === 'flagged_issues'
        );

        // Custom labels for specific fields
        let customLabel = key.toUpperCase().replace(/_/g, ' ');
        if (key === 'issues_at_start') {
          customLabel = '# Planned';
        } else if (key === 'issues_added') {
          customLabel = '# Added';
        } else if (key === 'flagged_issues') {
          customLabel = '# Flagged';
        }

        column = {
          key,
          label: customLabel,
          align: 'center',
          sortable: true,
          width: '120px',
          render: (val, row) => {
            const numVal = val as number;
            if (numVal === null || numVal === undefined) {
              return <div className="text-sm text-gray-500 text-center">-</div>;
            }

            if (isOverallProgressPct) {
              const item = row;
              const progressColor = item.overall_progress_pct_color;
              const formattedVal = numVal.toFixed(1);
              let colorClass = 'text-gray-700';
              if (progressColor === 'green') {
                colorClass = 'text-green-600 font-bold';
              } else if (progressColor === 'yellow') {
                colorClass = 'text-yellow-600 font-bold';
              } else if (progressColor === 'red') {
                colorClass = 'text-red-600 font-bold';
              } else {
                colorClass = 'text-gray-500';
              }
              return (
                <div className={`text-sm text-center font-bold ${colorClass}`}>
                  {formattedVal}%
                </div>
              );
            }

            if (isPercentage) {
              return (
                <div className="text-sm text-gray-700 text-center font-medium">
                  {numVal}%
                </div>
              );
            }

            // If it's an issue count field with keys, make it a clickable link
            if (isIssueCountField) {
              const item = row;
              const issueKeys = item[`${key}_keys`] as string[] | null;
              const keysArray = issueKeys || [];

              // Special handling for issues_added with color coding
              const isIssuesAdded = key === 'issues_added';
              const issuesAddedColor = isIssuesAdded ? (item.issues_added_color as 'red' | 'yellow' | 'default' | undefined) : undefined;

              let colorClass = 'text-blue-600';
              let hoverColorClass = 'hover:text-blue-800';
              if (isIssuesAdded && issuesAddedColor) {
                if (issuesAddedColor === 'red') {
                  colorClass = 'text-red-600';
                  hoverColorClass = 'hover:text-red-800';
                } else if (issuesAddedColor === 'yellow') {
                  colorClass = 'text-yellow-600';
                  hoverColorClass = 'hover:text-yellow-800';
                } else if (issuesAddedColor === 'default') {
                  colorClass = 'text-blue-600';
                  hoverColorClass = 'hover:text-blue-800';
                }
              }

              if (!keysArray || keysArray.length === 0 || numVal === 0) {
                if (isIssuesAdded && issuesAddedColor && issuesAddedColor !== 'default') {
                  return (
                    <div className={`text-sm font-bold ${colorClass} text-center`}>
                      {numVal.toLocaleString()}
                    </div>
                  );
                }
                if (isIssuesAdded) {
                  return (
                    <div className="text-sm font-bold text-gray-500 text-center">
                      {numVal.toLocaleString()}
                    </div>
                  );
                }
                return (
                  <div className="text-sm text-gray-500 text-center">
                    {numVal.toLocaleString()}
                  </div>
                );
              }

              const handleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!jiraUrl) return;
                const keysParam = keysArray.join(', ');
                const jqlQuery = `key IN (${keysParam})`;
                const encodedJql = encodeURIComponent(jqlQuery);
                const jiraLink = `${jiraUrl}/issues/?jql=${encodedJql}`;
                window.open(jiraLink, '_blank');
              };

              return (
                <div
                  className={`text-sm font-bold ${colorClass} ${hoverColorClass} underline cursor-pointer text-center`}
                  onClick={handleClick}
                  title={keysArray.join(', ')}
                >
                  {numVal.toLocaleString()}
                </div>
              );
            }

            return (
              <div className="text-sm text-gray-700 text-center">
                {numVal.toLocaleString()}
              </div>
            );
          },
        };
      } else if (typeof value === 'boolean') {
        // Boolean field
        column = {
          key,
          label: key.toUpperCase().replace(/_/g, ' '),
          align: 'center',
          sortable: true,
          width: '120px',
          render: (val) => (
            <div className="text-sm text-gray-700 text-center">
              {val ? 'Yes' : 'No'}
            </div>
          ),
        };
      } else {
        // String or other - check if it's sprint_goal for expandable functionality
        const isSprintGoal = key === 'sprint_goal';
        column = {
          key,
          label: key.toUpperCase().replace(/_/g, ' '),
          align: 'left',
          sortable: true,
          width: isSprintGoal ? '360px' : '120px',
          expandable: isSprintGoal,
          maxLength: isSprintGoal ? 150 : undefined,
          render: (val) => {
            if (!val) {
              return (
                <div className="text-sm text-gray-500">-</div>
              );
            }
            // For sprint_goal, return as string for DataTable's ExpandableCell to handle
            if (isSprintGoal) {
              return String(val);
            }
            return (
              <div className="text-sm text-gray-700">
                {String(val)}
              </div>
            );
          },
        };
      }

      builtColumns.push(column);
    });

    return builtColumns;
  }, [data, meta]);

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

    return badges;
  }, [teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard
      title="Active Sprint Summary by Team"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      <div className="h-full w-full flex flex-col">
        <DataTable<ActiveSprintSummaryItem>
          data={data}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          loading={loading}
          error={error}
          emptyMessage="No data available"
          maxHeight="100%"
          rowKey={(row, index) => `${row.sprint_id}-${row.team_name}-${index}`}
        />
      </div>
    </ReportCard>
  );
};

export default ActiveSprintSummaryView;
