'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import type { BurndownDataPoint } from '@/lib/api';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { ApiService } from '@/lib/api';
import BurndownViewBase from './BurndownViewBase';
import ReportFilterField from '../reporting/ReportFilterField';

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
  const issueType = (filters.issue_type as string) ?? 'all';
  const sprintName = (filters.sprint_name as string) ?? '';
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  const apiService = React.useMemo(() => new ApiService(), []);

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

  const sprintOptions: Array<{ value: string; label: string }> = useMemo(() => {
    // Use meta.available_sprints from backend (team-specific)
    if (Array.isArray(meta?.available_sprints)) {
      return meta!.available_sprints.map((name: string) => ({
        value: name,
        label: name,
      }));
    }
    return [];
  }, [meta?.available_sprints, teamName, isGroup]);

  const hasAutoSelectedRef = useRef(false);
  const prevTeamGroupRef = useRef<{ teamName: string; isGroup: boolean } | null>(null);

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

  // Clear sprint selection only when team/group actually changes (reset to "Current Sprint")
  useEffect(() => {
    const currentTeamGroup = { teamName: teamName || '', isGroup: isGroup || false };
    const prevTeamGroup = prevTeamGroupRef.current;

    // Only clear sprint_name if team/group actually changed
    if (prevTeamGroup !== null) {
      const teamChanged = prevTeamGroup.teamName !== currentTeamGroup.teamName;
      const groupChanged = prevTeamGroup.isGroup !== currentTeamGroup.isGroup;
      
      if (teamChanged || groupChanged) {
        setFilters((prev) => ({
          ...prev,
          sprint_name: '', // Empty string represents "Current Sprint"
        }));
      }
    }

    // Update ref for next comparison
    prevTeamGroupRef.current = currentTeamGroup;
  }, [teamName, isGroup, setFilters]);

  // Custom filters for Sprint Burndown
  const customFilters = [
    {
      type: 'issueType' as const,
      component: (
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
      ),
    },
    ...(sprintOptions.length > 0 ? [{
      type: 'other' as const,
      component: (
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
      ),
    }] : []),
  ];

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
    }
  }, [meta]);

  // Fetch function factory for dialog
  const fetchBurndownIssuesFactory = useCallback((selectedDate: string, selectedMetricType: string) => {
    return async () => {
      if (!meta?.sprint_id) {
        return { success: false, message: 'Sprint ID not available' };
      }

      return await apiService.getBurndownIssues(
        selectedDate,
        meta.sprint_id,
        selectedMetricType,
        teamName || undefined,
        isGroup,
        issueType !== 'all' ? issueType : undefined
      );
    };
  }, [meta?.sprint_id, teamName, isGroup, issueType, apiService]);

  // Date display for Sprint
  const dateDisplay = (meta?.start_date || meta?.end_date) ? (
    <div className="mt-2 text-xs text-gray-500 text-center">
      {meta?.start_date && meta?.end_date && (
        <span>
          Dates: {meta.start_date} – {meta.end_date}
        </span>
      )}
    </div>
  ) : undefined;

  return (
    <BurndownViewBase
      data={data}
      loading={loading}
      error={error}
      filters={filters}
      setFilters={setFilters}
      refresh={refresh}
      meta={meta}
      componentProps={componentProps}
      togglePin={togglePin}
      pinnedFilters={pinnedFilters}
      title="Sprint Burndown"
      customFilters={customFilters}
      filterBadges={filterBadges}
      chartTitle={meta?.sprint_name ? `Sprint Burndown: ${meta.sprint_name}` : undefined}
      dateDisplay={dateDisplay}
      onChartClick={handleChartClick}
      fetchIssuesFunctionFactory={fetchBurndownIssuesFactory}
    />
  );
};

export default SprintBurndownView;
