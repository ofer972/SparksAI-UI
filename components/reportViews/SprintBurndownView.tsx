'use client';

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import BurndownChart from '../BurndownChart';
import type { BurndownDataPoint } from '@/lib/api';
import type {
  ReportFiltersUpdater,
} from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { ApiService } from '@/lib/api';
import type { BurndownIssue } from '@/lib/config';
import IssuesDialog from './IssuesDialog';
import DataTable, { Column } from '../DataTable';
import { API_CONFIG } from '@/lib/config';

interface SprintBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const ISSUE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Issues' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Story', label: 'Story' },
  { value: 'Task', label: 'Task' },
];

const SprintBurndownView: React.FC<SprintBurndownViewProps> = ({
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
  // Data should already be extracted as array from the registry mapProps
  const burndownData = React.useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const issueType = (filters.issue_type as string) ?? 'all';
  const sprintName = (filters.sprint_name as string) ?? '';
  const { groups, teams: allTeams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMetricType, setSelectedMetricType] = useState<string | null>(null);
  const apiService = React.useMemo(() => new ApiService(), []);
  
  // Look up ID from name to construct proper teamValue
  const teamValue = useMemo(() => {
    if (!teamName) return null;
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      return group ? `group:${group.group_key}` : null;
    } else {
      const team = allTeams.find(t => t.team_name === teamName);
      return team ? `team:${team.team_key}` : null;
    }
  }, [teamName, isGroup, groups, allTeams]);

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

  const sprintOptions: Array<{ value: string; label: string }> = useMemo(() => {
    if (Array.isArray(componentProps?.sprintOptions)) {
      return componentProps!.sprintOptions;
    }
    if (Array.isArray(meta?.available_sprints)) {
      return meta!.available_sprints.map((name: string) => ({
        value: name,
        label: name,
      }));
    }
    return [];
  }, [componentProps?.sprintOptions, meta?.available_sprints]);

  const hasAutoSelectedRef = useRef(false);

  const handleIssueTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      issue_type: value,
    }));
  };

  const handleTeamNameChange = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      team_name: value || null,
    }));
  }, [setFilters]);

  const handleSprintChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      sprint_name: value || null,
    }));
    if (typeof componentProps?.onSprintChange === 'function') {
      componentProps.onSprintChange(value);
    }
  };

  // Auto-select first team if none selected
  useEffect(() => {
    // Skip if still loading or no available teams
    if (loading || availableTeams.length === 0) {
      return;
    }

    // Auto-select the first team if no team is selected and we haven't auto-selected yet
    if (!teamName && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handleTeamNameChange(availableTeams[0]);
    }
  }, [availableTeams, teamName, handleTeamNameChange, loading]);

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
          onChange={(event) => handleIssueTypeChange(event.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ISSUE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      {sprintOptions.length > 0 && (
        <ReportFilterField label="Sprint">
          <select
            value={sprintName}
            onChange={(event) => handleSprintChange(event.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {sprintOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
      )}
    </ReportFiltersRow>
  );

  const currentSprintName = componentProps?.currentSprintName as string | undefined;

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
    
    if (issueType && issueType !== 'all') {
      badges.push({
        label: 'Issue Type',
        value: issueType,
        filterKey: 'issue_type',
        isPinned: pinnedFilters.includes('issue_type'),
      });
    }
    
    if (sprintName) {
      badges.push({
        label: 'Sprint',
        value: sprintName,
        filterKey: 'sprint_name',
        isPinned: pinnedFilters.includes('sprint_name'),
      });
    } else {
      badges.push({
        label: 'Sprint',
        value: 'Current Sprint',
        filterKey: 'sprint_name',
        isPinned: pinnedFilters.includes('sprint_name'),
      });
    }
    
    return badges;
  }, [teamName, isGroup, issueType, sprintName, pinnedFilters]);

  // Handle chart click
  const handleChartClick = useCallback((clickData: { date: string; metricType: string; dataIndex: number }) => {
    const sprintId = meta?.sprint_id;
    if (!sprintId) {
      console.warn('Sprint ID not available in meta');
      return;
    }
    
    setSelectedDate(clickData.date);
    setSelectedMetricType(clickData.metricType);
    setIsDialogOpen(true);
  }, [meta]);

  // Fetch function for dialog
  const fetchBurndownIssues = useCallback(async () => {
    if (!selectedDate || !selectedMetricType || !meta?.sprint_id) {
      return { success: false, message: 'Missing required parameters' };
    }

    return await apiService.getBurndownIssues(
      selectedDate,
      meta.sprint_id,
      selectedMetricType,
      teamName || undefined,
      isGroup,
      issueType !== 'all' ? issueType : undefined
    );
  }, [selectedDate, selectedMetricType, meta?.sprint_id, teamName, isGroup, issueType, apiService]);

  // Format metric type for display
  const formatMetricType = (metricType: string): string => {
    const labels: Record<string, string> = {
      'actual_remaining': 'Actual Remaining',
      'total_scope': 'Total Scope',
      'wip_in_progress': 'Work In Progress',
      'issues_completed': 'Issues Completed',
      'issues_removed': 'Issues Removed',
    };
    return labels[metricType] || metricType;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Dialog title
  const dialogTitle = useMemo(() => {
    if (!selectedDate || !selectedMetricType) return 'Issues';
    return `${formatMetricType(selectedMetricType)} - ${formatDate(selectedDate)}`;
  }, [selectedDate, selectedMetricType]);

  // Columns for burndown issues
  const burndownIssueColumns: Column<BurndownIssue>[] = useMemo(() => [
    {
      key: 'issue_key',
      label: 'ISSUE KEY',
      width: '12%',
    },
    {
      key: 'summary',
      label: 'SUMMARY',
      align: 'left',
      maxLength: 80,
    },
    {
      key: 'team_name',
      label: 'TEAM',
      width: '15%',
    },
    {
      key: 'metric_category',
      label: 'CATEGORY',
      width: '12%',
    },
  ], []);

  return (
    <ReportCard 
      title="Sprint Burndown" 
      reportId={componentProps?.reportId} 
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      <div className="w-full h-full flex flex-col">
        <div className="relative flex-1 min-h-[350px]">
          <BurndownChart
            data={burndownData}
            loading={loading}
            error={error}
            title={meta?.sprint_name ? `Sprint Burndown: ${meta.sprint_name}` : undefined}
            onChartClick={handleChartClick}
          />
        </div>
        {(meta?.start_date || meta?.end_date) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {meta?.start_date && meta?.end_date && (
              <span>
                Dates: {meta.start_date} – {meta.end_date}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Issues Dialog */}
      <IssuesDialog<BurndownIssue>
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedDate(null);
          setSelectedMetricType(null);
        }}
        title={dialogTitle}
        columns={burndownIssueColumns}
        fetchFunction={fetchBurndownIssues}
        jiraUrl={API_CONFIG.jiraUrl}
        emptyMessage="No issues found for the selected criteria."
        rowKey={(row, index) => `${row.issue_key}-${index}`}
      />
    </ReportCard>
  );
};

export default SprintBurndownView;

