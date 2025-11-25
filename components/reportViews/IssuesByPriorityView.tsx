'use client';

import React, { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { IssueByPriority } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

interface IssuesByPriorityResult {
  priority_summary?: IssueByPriority[];
}

interface IssuesByPriorityViewProps {
  data: IssuesByPriorityResult | null | undefined;
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

const IssuesByPriorityView: React.FC<IssuesByPriorityViewProps> = ({
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
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  const statusCategory = (filters.status_category as string) ?? '';
  const includeDone = Boolean(filters.include_done);
  
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

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

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

  const pieData = useMemo(() => {
    return prioritySummary.map((item, index) => ({
      id: item.priority ?? 'Unspecified',
      label: item.priority ?? 'Unspecified',
      value: item.issue_count ?? 0,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
    }));
  }, [prioritySummary]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={(value, type, name) => {
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
          }}
          placeholder="Select team or group"
          allowClear={true}
        />
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
  }, [teamName, isGroup, issueType, statusCategory, includeDone, pinnedFilters]);

  return (
    <ReportCard
      title="Issues by Priority"
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
            <div className="text-sm text-gray-600">Loading priority chart...</div>
          </div>
        </div>
      )}

      {!loading && !error && prioritySummary.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">No data available</div>
        </div>
      )}

      {!loading && !error && prioritySummary.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{issueTypePlural} by Priority</h3>
            <span className="text-sm text-gray-500">Total: {totalCount}</span>
          </div>
          <div className="relative w-full h-[280px] overflow-visible">
            <ResponsivePie
              data={pieData}
              margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
              innerRadius={0}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              borderWidth={2}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              colors={{ datum: 'data.color' }}
              enableArcLinkLabels={true}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#111827"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLinkLabel={(d) => {
                const percentage = totalCount > 0 ? ((d.value / totalCount) * 100).toFixed(1) : '0.0';
                return `${d.value} (${percentage}%)`;
              }}
              enableArcLabels={false}
              tooltip={({ datum }) => {
                const percentage = totalCount > 0 ? ((datum.value / totalCount) * 100).toFixed(1) : '0.0';
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-sm">
                    <p className="font-semibold text-gray-900 mb-1">{datum.label}</p>
                    <p className="text-gray-600">{datum.value} issues ({percentage}%)</p>
                  </div>
                );
              }}
              legends={[]}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
            {pieData.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ReportCard>
  );
};

export default IssuesByPriorityView;
