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
import { getIssueTypes } from '@/lib/issueTypes';

interface PIBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void; onAIChat?: () => void };
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const PIBurndownView: React.FC<PIBurndownViewProps> = ({
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
  const issueType = (filters.issue_type as string) ?? 'Epic';
  const project = (filters.project as string) ?? '';
  const piName = (filters.pi as string) ?? '';
  const isDashboard = componentProps?.isDashboard;
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;

  const issueTypeOptions = useMemo(() => getIssueTypes(), []);

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

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, [setFilters]);

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

  // Auto-select current PI if available and no PI is selected
  useEffect(() => {
    // Skip if still loading or no available PIs
    if (loading || availablePIs.length === 0) {
      return;
    }

    // Auto-select the first PI (most recent) if no PI is selected and we haven't auto-selected yet
    if (!piName && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handleFilterChange('pi', availablePIs[0]); // Select the first (most recent) PI
    }
  }, [availablePIs, piName, handleFilterChange, loading]);

  const filtersContent = (
    <ReportFiltersRow>
        <ReportFilterField label="PI">
        <select
          value={piName}
          onChange={(event) => handleFilterChange('pi', event.target.value || null)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">Select PI</option>
          {availablePIs.map((pi) => (
            <option key={pi} value={pi}>
              {pi}
            </option>
          ))}
        </select>
        </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(event) => handleFilterChange('issue_type', event.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {issueTypeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Project">
        <input
          type="text"
          value={project}
          onChange={(event) => handleFilterChange('project', event.target.value.trim() || null)}
          placeholder="All projects"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (piName) {
      badges.push({
        label: 'PI',
        value: piName,
        filterKey: 'pi',
        isPinned: pinnedFilters.includes('pi'),
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
    
    if (project) {
      badges.push({
        label: 'Project',
        value: project,
        filterKey: 'project',
        isPinned: pinnedFilters.includes('project'),
      });
    }
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }
    
    return badges;
  }, [piName, issueType, project, teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard 
      title="PI Burndown" 
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
        {(meta?.pi || meta?.start_date || meta?.end_date) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {meta?.pi && <span>PI: {meta.pi}</span>}
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

export default PIBurndownView;

