'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
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
  const { groups, teams: allTeams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  
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
            data={Array.isArray(data) ? data : []}
            loading={loading}
            error={error}
          />
        </div>
        {(meta?.sprint_name || meta?.start_date || meta?.end_date) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {meta?.sprint_name && <span>Sprint: {meta.sprint_name}</span>}
            {meta?.start_date && meta?.end_date && (
              <span className="ml-2">
                Dates: {meta.start_date} – {meta.end_date}
              </span>
            )}
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default SprintBurndownView;

