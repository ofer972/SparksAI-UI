'use client';

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { HierarchyItem } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import HierarchyGanttTable from '../hierarchyGanttTable/HierarchyGanttTable';
import type { ColumnConfig } from '../hierarchyTable/types';
import type { GanttConfig } from '../hierarchyGanttTable/types';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import MultiPIFilter from '../MultiPIFilter';
import IssueTypesHierarchyFilter from '../IssueTypesHierarchyFilter';
import { getCleanJiraUrl } from '@/lib/config';

interface EpicsHierarchyResult {
  issues?: HierarchyItem[];
  count?: number;
  limit?: number;
}

interface PIRoadmapViewProps {
  data: EpicsHierarchyResult | null | undefined;
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

const PIRoadmapView: React.FC<PIRoadmapViewProps> = ({
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
  console.log('[PIRoadmapView] setFilters:', typeof setFilters, setFilters);
  console.log('[PIRoadmapView] filters:', filters);
  console.log('[PIRoadmapView] props:', { hasSetFilters: !!setFilters, setFiltersType: typeof setFilters });
  
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const jiraUrl = useMemo(() => getCleanJiraUrl(), []);

  // Internal filters (client-side only) - following Cycle Time pattern
  const [ganttViewMode, setGanttViewMode] = useState<'month' | 'week' | 'sprint'>(() => 
    (filters.ganttViewMode as 'month' | 'week' | 'sprint') ?? 'month'
  );
  const [showMilestones, setShowMilestones] = useState<boolean>(() => 
    (filters.showMilestones as boolean) ?? false
  );
  const [showOnlyDeviations, setShowOnlyDeviations] = useState<boolean>(false);
  const [plannedOrAdded, setPlannedOrAdded] = useState<'all' | 'planned' | 'added'>('all');

  const issues = Array.isArray(data?.issues) ? data!.issues : [];

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  // Normalize the data to match HierarchyItem interface
  const normalizedIssues = useMemo<HierarchyItem[]>(() => {
    return issues.map((issue: any) => ({
      ...issue,
      key: issue.Key || issue.key,
      parent: issue['Parent Key'] || issue['Parent'] || issue.parent || null,
    }));
  }, [issues]);

  // Client-side filtering: deviation and planned/added filtering
  const filteredIssues = useMemo(() => {
    let filtered = normalizedIssues;
    
    // Apply "Show Only Deviations" filter
    if (showOnlyDeviations) {
      // Step 1: Find all deviated epic keys
      const deviatedEpicKeys = new Set<string>();
      filtered.forEach((issue: any) => {
        const issueType = issue.Type || issue.type;
        if (issueType === 'Epic') {
          const originalEndDate = issue['Original Epic End Date'];
          const endDate = issue['End Date'];
          const issueKey = issue.key || issue.Key;
          if (originalEndDate && originalEndDate !== endDate && issueKey) {
            deviatedEpicKeys.add(issueKey);
          }
        }
      });
      
      // Step 2: Keep deviated epics + their children (stories)
      filtered = filtered.filter((issue: any) => {
        const issueType = issue.Type || issue.type;
        const issueKey = issue.key || issue.Key;
        const parentKey = issue.parent || issue['Parent Key'];
        
        // Keep deviated epics
        if (issueType === 'Epic' && issueKey && deviatedEpicKeys.has(issueKey)) {
          return true;
        }
        
        // Keep stories whose parent is a deviated epic
        if (issueType !== 'Epic' && parentKey && deviatedEpicKeys.has(parentKey)) {
          return true;
        }
        
        // Filter out everything else (non-deviated epics, stories of non-deviated epics, parent items)
        return false;
      });
    }
    
    // Apply "Planned or Added" filter
    if (plannedOrAdded !== 'all') {
      // Step 1: Find all epic keys matching the filter value
      const matchingEpicKeys = new Set<string>();
      filtered.forEach((issue: any) => {
        const issueType = issue.Type || issue.type;
        if (issueType === 'Epic') {
          const plannedOrAddedValue = issue['Planned or Added'];
          const issueKey = issue.key || issue.Key;
          if (plannedOrAddedValue === plannedOrAdded && issueKey) {
            matchingEpicKeys.add(issueKey);
          }
        }
      });
      
      // Step 2: Keep matching epics + their children (stories)
      filtered = filtered.filter((issue: any) => {
        const issueType = issue.Type || issue.type;
        const issueKey = issue.key || issue.Key;
        const parentKey = issue.parent || issue['Parent Key'];
        
        // Keep matching epics
        if (issueType === 'Epic' && issueKey && matchingEpicKeys.has(issueKey)) {
          return true;
        }
        
        // Keep stories whose parent is a matching epic
        if (issueType !== 'Epic' && parentKey && matchingEpicKeys.has(parentKey)) {
          return true;
        }
        
        // Filter out everything else (non-matching epics, stories of non-matching epics, parent items)
        return false;
      });
    }
    
    return filtered;
  }, [normalizedIssues, showOnlyDeviations, plannedOrAdded]);

  const { groups, teams } = useTeamsGroups();
  const teamName = (filters?.team_name as string) ?? '';
  const isGroup = (filters?.isGroup as boolean) ?? false;

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

  const piNames = useMemo(() => {
    const pi = filters.pi;
    if (Array.isArray(pi)) {
      return pi;
    }
    if (typeof pi === 'string' && pi.trim()) {
      return [pi.trim()];
    }
    return [];
  }, [filters.pi]);

  const hierarchyLevel = useMemo(() => {
    const level = filters.hierarchy_level;
    if (typeof level === 'number') {
      return level;
    }
    if (typeof level === 'string') {
      const parsed = parseInt(level, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }, [filters.hierarchy_level]);

  const handlePIsChange = useCallback((selectedPIs: string[]) => {
    console.log('[PIRoadmapView] handlePIsChange called:', selectedPIs, 'setFilters:', typeof setFilters, setFilters);
    setFilters?.((prev) => {
      console.log('[PIRoadmapView] setFilters callback executing, prev:', prev);
      return {
        ...prev,
        pi: selectedPIs.length > 0 ? selectedPIs : null,
      };
    });
  }, [setFilters]);

  const handleTeamNameChange = useCallback((value: string | null, type: 'group' | 'team', name: string) => {
    if (value === null) {
      setFilters?.((prev) => ({
        ...prev,
        team_name: null,
        isGroup: false,
      }));
    } else {
      setFilters?.((prev) => ({
        ...prev,
        team_name: name,
        isGroup: type === 'group',
      }));
    }
  }, [setFilters]);

  const handleHierarchyLevelChange = useCallback((level: number | undefined) => {
    setFilters?.((prev) => ({
      ...prev,
      hierarchy_level: level ?? null,
    }));
  }, [setFilters]);

  // Sync internal filters from props only on mount (when loaded from saved state)
  const hasSyncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      // Only sync on initial mount from saved filters
      if (filters.ganttViewMode && ['month', 'week', 'sprint'].includes(filters.ganttViewMode as string)) {
        setGanttViewMode(filters.ganttViewMode as 'month' | 'week' | 'sprint');
      }
      if (typeof filters.showMilestones === 'boolean') {
        setShowMilestones(filters.showMilestones);
      }
    }
  }, []); // Only run once on mount

  // NOTE: Internal filters (ganttViewMode, showMilestones) are kept in local state only
  // and are NOT saved/restored with the dashboard. Calling setFilters for these filters causes unnecessary
  // backend API calls since these are client-side-only filters. This prevents those unnecessary calls.
  const handleGanttViewModeChange = useCallback((mode: 'month' | 'week' | 'sprint') => {
    setGanttViewMode(mode);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handleShowMilestonesChange = useCallback((show: boolean) => {
    setShowMilestones(show);
    // Automatically expand milestone when checked
    if (show) {
      setTimeout(() => {
        setExpanded((prev) => ({
          ...prev,
          'Milestone': true,
        }));
      }, 0);
    }
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handleShowOnlyDeviationsChange = useCallback((show: boolean) => {
    setShowOnlyDeviations(show);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handlePlannedOrAddedChange = useCallback((value: 'all' | 'planned' | 'added') => {
    setPlannedOrAdded(value);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  // Determine field names from the data for Gantt config
  const ganttConfig = useMemo<GanttConfig>(() => {
    if (filteredIssues.length === 0) {
      // Default fallback
      return {
        startDateField: 'Start Date',
        endDateField: 'End Date',
        progressField: 'Epic Progress %',
        statusCategoryField: 'Status Category',
        issueTypeField: 'Type',
      };
    }

    const firstItem = filteredIssues[0] as any;

    // Try to find date fields (prioritize "Start Date" and "End Date" from API response)
    const startDateField =
      firstItem['Start Date'] ? 'Start Date' :
      firstItem['Epic Start Date'] ? 'Epic Start Date' :
      firstItem['start_date'] ? 'start_date' :
      'Start Date';

    const endDateField =
      firstItem['End Date'] ? 'End Date' :
      firstItem['Epic End Date'] ? 'Epic End Date' :
      firstItem['Epic Target Completion Date'] ? 'Epic Target Completion Date' :
      firstItem['Target Completion Date'] ? 'Target Completion Date' :
      firstItem['end_date'] ? 'end_date' :
      'End Date';

    const PROGRESS_FIELD_NAME = 'Progress %';
    const progressField = firstItem[PROGRESS_FIELD_NAME] ? PROGRESS_FIELD_NAME : undefined;

    const statusCategoryField =
      firstItem['Status Category'] ? 'Status Category' :
      firstItem['status_category'] ? 'status_category' :
      undefined;

    const issueTypeField =
      firstItem['Type'] ? 'Type' :
      firstItem['type'] ? 'type' :
      undefined;

    return {
      startDateField,
      endDateField,
      progressField,
      statusCategoryField,
      issueTypeField,
    };
  }, [filteredIssues]);

  // Define columns for left panel (matching GanttChartTab style)
  const columns = useMemo<ColumnConfig[]>(() => {
    if (filteredIssues.length === 0) {
      return [];
    }

    const firstRow = filteredIssues[0] as any;
    const columnsToShow: ColumnConfig[] = [];

    // Key (link)
    if (firstRow.Key || firstRow.key) {
      columnsToShow.push({
        id: 'Key',
        header: 'Key',
        accessorKey: firstRow.Key ? 'Key' : 'key',
        renderer: 'link',
        minWidth: 69,
        maxWidth: 79,
        size: 74,
      });
    }

    // Type (badge) - after Key, before Summary
    if (firstRow.Type || firstRow.type) {
      columnsToShow.push({
        id: 'Type',
        header: 'Type',
        accessorKey: firstRow.Type ? 'Type' : 'type',
        renderer: 'badge',
        minWidth: 70,
        maxWidth: 80,
        size: 75,
      });
    }

    // Summary - fixed 250px width
    if (firstRow['Issue Summary'] || firstRow.summary || firstRow.Summary) {
      columnsToShow.push({
        id: 'Summary',
        header: 'Summary',
        accessorKey: firstRow['Issue Summary'] ? 'Issue Summary' : (firstRow.Summary ? 'Summary' : 'summary'),
        renderer: 'text',
        minWidth: 250,
        maxWidth: 250,
        size: 250,
      });
    }

    // Team Name - after Summary
    columnsToShow.push({
      id: 'Team Name',
      header: 'Team Name',
      accessorKey: 'Team Name',
      renderer: 'text',
      minWidth: 120,
      maxWidth: 150,
      size: 135,
    });

    // Quarter PI - after Team Name, only visible for Epic type
    columnsToShow.push({
      id: 'Quarter PI',
      header: 'Quarter PI',
      accessorKey: 'Quarter PI of Epic',
      renderer: 'text',
      minWidth: 100,
      maxWidth: 120,
      size: 110,
    });

    // Status (badge)
    if (firstRow.Status || firstRow.status) {
      columnsToShow.push({
        id: 'Status',
        header: 'Status',
        accessorKey: firstRow.Status ? 'Status' : 'status',
        renderer: 'badge',
        minWidth: 83,
        maxWidth: 93,
        size: 88,
      });
    }

    // Progress % - after Status
    // Check if the field exists (even if value is 0, null, or undefined)
    const PROGRESS_FIELD_NAME = 'Progress %';
    if (PROGRESS_FIELD_NAME in firstRow) {
      columnsToShow.push({
        id: PROGRESS_FIELD_NAME,
        header: 'Progress %',
        accessorKey: PROGRESS_FIELD_NAME,
        renderer: 'text',
        minWidth: 61,
        maxWidth: 71,
        size: 70,
      });
    }

    return columnsToShow;
  }, [filteredIssues]);

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];

    if (piNames.length > 0) {
      badges.push({
        label: 'PI',
        value: piNames.join(', '),
        filterKey: 'pi',
        isPinned: pinnedFilters.includes('pi'),
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

    if (hierarchyLevel !== undefined && hierarchyLevel !== null) {
      badges.push({
        label: 'Issue Type',
        value: `Level ${hierarchyLevel}`,
        filterKey: 'hierarchy_level',
        isPinned: pinnedFilters.includes('hierarchy_level'),
      });
    }

    // Timeline View badge
    const timelineViewLabels: Record<string, string> = {
      month: 'Months',
      week: 'Weeks',
      sprint: 'Sprints',
    };
    badges.push({
      label: 'Timeline View',
      value: timelineViewLabels[ganttViewMode] || ganttViewMode,
      filterKey: 'ganttViewMode',
      isPinned: pinnedFilters.includes('ganttViewMode'),
    });

    // Show Milestones badge (only if enabled)
    if (showMilestones) {
      badges.push({
        label: 'Milestones',
        value: 'Enabled',
        filterKey: 'showMilestones',
        isPinned: pinnedFilters.includes('showMilestones'),
      });
    }

    return badges;
  }, [piNames, teamName, hierarchyLevel, isGroup, pinnedFilters, ganttViewMode, showMilestones]);

  const filterRow = (
    <div className="flex flex-wrap items-center gap-9">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">PIs</span>
        <div>
          <MultiPIFilter
            selectedPIs={piNames}
            onPIsChange={handlePIsChange}
            maxSelections={100}
            autoSelectFirst={false}
            pis={availablePIs}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Team/Group</span>
        <div>
          <TeamGroupFilter
            value={teamValue}
            onChange={handleTeamNameChange}
            placeholder="Select team or group"
            allowClear={true}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Issue Type Hierarchy</span>
        <div>
          <IssueTypesHierarchyFilter
            value={hierarchyLevel}
            onChange={handleHierarchyLevelChange}
            placeholder="All issue types"
            allowClear={true}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Timeline View</span>
        <div>
          <select
            value={ganttViewMode}
            onChange={(e) => handleGanttViewModeChange(e.target.value as 'month' | 'week' | 'sprint')}
            className="px-2 py-1 border border-outline rounded text-xs bg-surface-elevated text-content-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="month">Months</option>
            <option value="week">Weeks</option>
            <option value="sprint">Sprints</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Show Milestones</span>
        <div>
          <label className="flex items-center gap-1 text-xs text-content-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showMilestones}
              onChange={(e) => handleShowMilestonesChange(e.target.checked)}
              className="w-3 h-3 text-brand border-outline rounded focus:ring-brand"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Show Only Deviations</span>
        <div>
          <label className="flex items-center gap-1 text-xs text-content-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDeviations}
              onChange={(e) => handleShowOnlyDeviationsChange(e.target.checked)}
              className="w-3 h-3 text-brand border-outline rounded focus:ring-brand"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-secondary font-medium whitespace-nowrap">Planned or Added</span>
        <div>
          <select
            value={plannedOrAdded}
            onChange={(e) => handlePlannedOrAddedChange(e.target.value as 'all' | 'planned' | 'added')}
            className="px-2 py-1 border border-outline rounded text-xs bg-surface-elevated text-content-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All</option>
            <option value="planned">Planned</option>
            <option value="added">Added</option>
          </select>
        </div>
      </div>

    </div>
  );

  // Extract sprints, PIs, and releases from result
  const sprints = useMemo(() => {
    if (data && typeof data === 'object' && 'sprints' in data) {
      return (data as any).sprints || [];
    }
    if (meta && Array.isArray(meta.sprints)) {
      return meta.sprints;
    }
    return [];
  }, [data, meta]);

  const pis = useMemo(() => {
    if (data && typeof data === 'object' && 'pis' in data) {
      return (data as any).pis || [];
    }
    if (meta && Array.isArray(meta.pis)) {
      return meta.pis;
    }
    return [];
  }, [data, meta]);

  const releases = useMemo(() => {
    if (data && typeof data === 'object' && 'releases' in data) {
      return (data as any).releases || [];
    }
    if (meta && Array.isArray(meta.releases)) {
      return meta.releases;
    }
    return [];
  }, [data, meta]);

  return (
    <ReportCard
      title="PI Roadmap"
      reportId={componentProps?.reportId}
      filters={filterRow}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
      readOnly={componentProps?.readOnly}
      hideHeader={componentProps?.hideHeader}
      hideCollapse={componentProps?.hideCollapse}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-3 bg-danger-bg border border-danger-border rounded-lg p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2">
              <h3 className="text-xs font-medium text-red-800 text-red-300">Error loading data</h3>
              <p className="mt-0.5 text-xs text-red-700 text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-surface rounded-lg shadow-sm p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand" />
          <p className="mt-3 text-content-tertiary text-sm">Loading roadmap data...</p>
        </div>
      )}

      {/* Bar Colors Legend - between filter area and Gantt chart */}
      {!loading && !error && ganttConfig && (
        <div className="flex items-center justify-center gap-3 py-2 text-xs flex-shrink-0">
          <span className="text-content-secondary font-medium">Bar Colors:</span>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: '#86efac' }}
              />
              <span className="text-content-primary">Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: '#60a5fa' }}
              />
              <span className="text-content-primary">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: '#6b7280' }}
              />
              <span className="text-content-primary">To Do</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                style={{
                  width: '0',
                  height: '0',
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '12px solid #dc2626',
                }}
              />
              <span className="text-content-primary">Original Epic End Date</span>
            </div>
            {showMilestones && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center" style={{ width: '20px', height: '12px' }}>
                    {/* Left marker */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      style={{ 
                        width: '2px', 
                        height: '8px', 
                        backgroundColor: '#c084fc' 
                      }}
                    />
                    {/* Horizontal line */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      style={{ 
                        width: '18px', 
                        height: '1px', 
                        backgroundColor: '#c084fc' 
                      }}
                    />
                    {/* Right marker */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2"
                      style={{ 
                        width: '2px', 
                        height: '8px', 
                        backgroundColor: '#c084fc' 
                      }}
                    />
                  </div>
                  <span className="text-content-primary">PI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5"
                    style={{ 
                      backgroundColor: '#06b6d4',
                      transform: 'rotate(45deg)',
                    }}
                  />
                  <span className="text-content-primary">Release</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      {!loading && !error && (
        <div className="h-full flex flex-col max-h-[600px]">
          <HierarchyGanttTable
            data={filteredIssues}
            columns={columns}
            mode="hierarchy-gantt"
            ganttConfig={ganttConfig}
            defaultExpanded={true}
            showControls={false}
            jiraUrl={jiraUrl || meta?.jira_url}
            sprints={sprints}
            pis={pis}
            releases={releases}
            expanded={expanded}
            onExpandedChange={setExpanded}
            ganttViewMode={ganttViewMode}
            onGanttViewModeChange={handleGanttViewModeChange}
            showMilestones={showMilestones}
            onShowMilestonesChange={handleShowMilestonesChange}
          />
        </div>
      )}
    </ReportCard>
  );
};

export default PIRoadmapView;

