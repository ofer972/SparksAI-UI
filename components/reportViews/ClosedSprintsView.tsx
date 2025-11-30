'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ClosedSprint, getCleanJiraUrl } from '@/lib/config';
import DataTable, { Column, SortConfig } from '../DataTable';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

export interface ClosedSprintsViewProps {
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

const ClosedSprintsView: React.FC<ClosedSprintsViewProps> = ({
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'team_name',
    direction: 'asc',
  });

  const months = Number(filters.months ?? 3);
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  const issueType = (filters.issue_type as string) ?? '';
  
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

  const availableIssueTypes = useMemo(() => {
    if (meta && Array.isArray(meta.available_issue_types)) {
      return meta.available_issue_types as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handleTimePeriodChange = useCallback(
    (value: number) => {
      setFilters((prev) => ({
        ...prev,
        months: value,
      }));
    },
    [setFilters]
  );

  const handleTeamGroupChange = useCallback(
    (value: string | null, type: 'group' | 'team', name: string) => {
      if (value === null) {
        setFilters((prev) => ({
          ...prev,
          team_name: null,
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

  const handleIssueTypeChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        issue_type: value || null,
      }));
    },
    [setFilters]
  );

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const getJiraSearchLink = useCallback((keys: string[], jiraUrl: string) => {
    if (!keys || keys.length === 0) {
      return '#';
    }
    const keysParam = keys.join(',');
    const jql = encodeURIComponent(`key IN (${keysParam})`);
    return `${jiraUrl}/issues/?jql=${jql}`;
  }, []);

  const columns: Column<ClosedSprint>[] = useMemo(() => {
    if (!data.length) return [];

    const firstSprint = data[0];
    const hasCompleteDate = 'sprint_official_end_date' in firstSprint && firstSprint.sprint_official_end_date != null;
    const jiraUrl = getCleanJiraUrl();
    
    // Get all keys, filter and sort them
    const allKeys = Object.keys(firstSprint)
      .filter((key) => {
        // Hide sprint_id column
        if (key === 'sprint_id') {
          return false;
        }
        // Hide sprint_official_start_date column and any start date variations
        if (key === 'sprint_official_start_date' || 
            key === 'start_date' ||
            key.toLowerCase().includes('start_date') ||
            (key.toLowerCase().includes('start') && key.toLowerCase().includes('date'))) {
          return false;
        }
        // Hide columns with "keys" in the name
        if (key.includes('keys')) {
          return false;
        }
        // Hide bugs_planned_plus_added column
        if (key === 'bugs_planned_plus_added') {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Define column order priority
        const getOrder = (key: string): number => {
          if (key === 'team_name') return 1;
          if (key === 'sprint_name') return 2;
          if (key === 'sprint_official_end_date' || key === 'complete_date') return 3; // Before Completed %
          if (key === 'completed_percentage') return 4; // After Complete Date
          if (key === 'issues_at_start') return 5;
          if (key === 'issues_added') return 6;
          if (key === 'issues_done' || key === 'issues_completed_in_sprint') return 7;
          if (key === 'issues_remaining' || key === 'issues_not_completed') return 8;
          if (key === 'bugs_planned_plus_added') return 9;
          if (key === 'bug_resolved_during_sprint') return 10;
          if (key === 'sprint_predictability') return 11;
          if (key === 'avg_story_cycle_time') return 12;
          if (key === 'sprint_goal') return 999; // Last
          return 20; // Other columns in between
        };
        
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        
        return orderA - orderB;
      });
    
    return allKeys.map((key) => {
        // Default: convert snake_case to Title Case
        let label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        // Set compact multi-line labels for better space usage
        if (key === 'issues_completed_in_sprint' || key === 'issues_done') {
          label = 'Issues\nDone';
        } else if (key === 'total_issues_in_sprint') {
          label = 'Total\nIssues';
        } else if (key === 'issues_not_completed' || key === 'issues_remaining') {
          label = 'Issues Not\nDone';
        } else if (key === 'issues_at_start') {
          label = 'Issues At\nStart';
        } else if (key === 'issues_added') {
          label = 'Issues\nAdded';
        } else if (key === 'bugs_planned_plus_added') {
          label = 'Bugs Planned\nPlus Added';
        } else if (key === 'bug_resolved_during_sprint') {
          label = 'Bugs\nResolved';
        } else if (key === 'completed_percentage') {
          label = 'Completed\n%';
        } else if (key === 'sprint_predictability') {
          label = 'Predictability\n%';
        } else if (key === 'avg_story_cycle_time') {
          label = 'Avg Cycle\nTime';
        } else if (key === 'sprint_official_end_date' || key === 'complete_date') {
          label = 'Complete\nDate';
        } else if (key === 'team_name') {
          label = 'Team\nName';
        } else if (key === 'sprint_name') {
          label = 'Sprint\nName';
        } else if (key === 'sprint_goal') {
          label = 'Sprint\nGoal';
        } else {
          // For other labels, try to split on common words if they're long
          const words = label.split(' ');
          if (words.length > 2 && label.length > 12) {
            // Split into two lines: first half and second half
            const mid = Math.ceil(words.length / 2);
            label = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
          } else if (words.length === 2 && label.length > 10) {
            // Split two-word labels
            label = words[0] + '\n' + words[1];
          }
        }

        const keyStr = String(key);
        const isLeftAlign = key === 'team_name' || key === 'sprint_name' || key === 'sprint_goal';
        const isExpandable = key === 'sprint_goal';

        return {
          key,
          label,
          align: isLeftAlign ? 'left' : 'center',
          sortable: true,
          expandable: isExpandable,
          maxLength: isExpandable ? 100 : undefined, // Reduced to 100 to show "Read more" more often
          width: key === 'sprint_goal' ? '288px' : undefined, // 10% smaller than previous width (was 320px)
          render: (value: any, row: ClosedSprint) => {
            if (value === null || value === undefined) return '-';

            // Format sprint_goal - return as string for expandable cell to handle
            if (keyStr === 'sprint_goal' && typeof value === 'string') {
              return value; // DataTable's ExpandableCell will handle truncation and "Read more"
            }

            // Format dates
            if (keyStr.includes('date') && typeof value === 'string') {
              return formatDate(value);
            }

            // Format completed_percentage (rounded to integer)
            if (keyStr === 'completed_percentage') {
              const num = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
              const formatted = Math.round(num); // Round to integer
              return (
                <span
                  className={`font-semibold ${
                    num >= 80 ? 'text-green-600' : num >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  {formatted}%
                </span>
              );
            }

            // Format sprint_predictability as percentage (rounded to integer)
            if (keyStr === 'sprint_predictability') {
              const num = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
              const percent = num * 100;
              const formatted = Math.round(percent); // Already rounded to integer
              return (
                <span
                  className={`font-semibold ${
                    percent >= 80 ? 'text-green-600' : percent >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  {formatted}%
                </span>
              );
            }

            // Format avg_story_cycle_time
            if (keyStr === 'avg_story_cycle_time') {
              const num = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
              let color = 'text-gray-900';
              if (num > 15) {
                color = 'text-red-600';
              } else if (num >= 10) {
                color = 'text-yellow-600';
              } else if (num > 0) {
                color = 'text-green-600';
              }
              return (
                <span className={`text-sm font-semibold ${color}`}>{num.toFixed(1)}</span>
              );
            }

            // Check if this numeric field has a corresponding keys array for clickable links
            // Map field names to their keys array field names based on actual API response
            const keysFieldMap: Record<string, string> = {
              // Old field names (for backward compatibility)
              'issues_completed_in_sprint': 'completed_issue_keys',
              'total_issues_in_sprint': 'total_committed_issue_keys',
              'issues_not_completed': 'issues_not_completed_keys',
              // New field names from backend
              'issues_done': 'completed_issue_keys',
              'issues_remaining': 'issues_remaining_keys',
              'issues_at_start': 'issues_at_start_keys',
              'issues_added': 'issues_added_keys',
              'bugs_planned_plus_added': 'bugs_planned_plus_added_keys',
              'bug_resolved_during_sprint': 'bug_resolved_during_sprint_keys',
            };
            
            const keysFieldName = keysFieldMap[key];
            const keysArray = keysFieldName ? (row as any)[keysFieldName] : null;
            
            // If there's a corresponding keys array and value is a number, make it clickable
            if (Array.isArray(keysArray) && typeof value === 'number' && value > 0) {
              const keys = keysArray.filter((k: any) => k != null && k !== '');
              if (keys.length > 0) {
                const link = getJiraSearchLink(keys, jiraUrl);
                // Apply color coding - most are blue, but issues_remaining is red and bug_resolved is purple
                let colorClass = 'text-blue-600';
                if (keyStr === 'issues_not_completed' || keyStr === 'issues_remaining') {
                  colorClass = 'text-red-600';
                } else if (keyStr === 'bug_resolved_during_sprint') {
                  colorClass = 'text-purple-600';
                }
                
                return (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(link, '_blank', 'noopener,noreferrer');
                    }}
                    className={`text-sm font-bold ${colorClass} underline hover:opacity-80 cursor-pointer`}
                    title={keys.join(', ')}
                  >
                    {value}
                  </a>
                );
              }
            }

            // Fallback rendering for numeric values (when no keys array available)
            // Note: These should normally have keys arrays, but keeping as fallback
            if (keyStr === 'issues_completed_in_sprint' || keyStr === 'issues_done') {
              return <span className="text-blue-600 font-semibold">{value}</span>;
            }
            if (keyStr === 'issues_not_completed' || keyStr === 'issues_remaining') {
              return <span className="text-red-600 font-semibold">{value}</span>;
            }
            if (keyStr === 'total_issues_in_sprint') {
              return <span className="text-blue-600 font-semibold">{value}</span>;
            }
            if (keyStr === 'issues_at_start' || keyStr === 'issues_added') {
              return <span className="text-blue-600 font-semibold">{value}</span>;
            }
            if (keyStr === 'bug_resolved_during_sprint') {
              return <span className="text-purple-600 font-semibold">{value}</span>;
            }
            if (keyStr === 'bugs_planned_plus_added') {
              return <span className="text-blue-600 font-semibold">{value}</span>;
            }

            return value;
          },
        };
    });
  }, [data, formatDate, getJiraSearchLink]);

  const timePeriodOptions = [
    { value: 1, label: 'Last 1 month' },
    { value: 2, label: 'Last 2 months' },
    { value: 3, label: 'Last 3 months' },
    { value: 4, label: 'Last 4 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 9, label: 'Last 9 months' },
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
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {timePeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(e) => handleIssueTypeChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Issue Types</option>
          {availableIssueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
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
    
    if (issueType) {
      badges.push({
        label: 'Issue Type',
        value: issueType,
        filterKey: 'issue_type',
        isPinned: pinnedFilters.includes('issue_type'),
      });
    }
    
    return badges;
  }, [teamName, isGroup, months, issueType, pinnedFilters]);

  return (
    <ReportCard
      title="Closed Sprints"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {loading && (
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading sprints...</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 h-64">
          {error}
        </div>
      )}

      {!loading && !error && (
      <DataTable<ClosedSprint>
        data={data}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
          loading={false}
          error={undefined}
        emptyMessage="No sprints found matching the filter criteria."
        rowKey={(row) => row.sprint_id}
        striped
        hoverable
      />
      )}
    </ReportCard>
  );
};

export default ClosedSprintsView;

