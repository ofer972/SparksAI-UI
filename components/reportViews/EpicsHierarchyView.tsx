'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type { HierarchyItem } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import HierarchyTable from '../hierarchyTable/HierarchyTable';
import type { ColumnConfig } from '../hierarchyTable/types';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import MultiPIFilter from '../MultiPIFilter';
import IssueTypesHierarchyFilter from '../IssueTypesHierarchyFilter';

interface EpicsHierarchyResult {
  issues?: HierarchyItem[];
  count?: number;
  limit?: number;
}

interface EpicsHierarchyViewProps {
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

const DEFAULT_LIMIT = 500;

const EpicsHierarchyView: React.FC<EpicsHierarchyViewProps> = ({
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
  const [filterText, setFilterText] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const issues = Array.isArray(data?.issues) ? data!.issues : [];

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
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

  const filteredIssues = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return normalizedIssues;
    }
    return normalizedIssues.filter((issue) =>
      Object.values(issue).some((value) =>
        value !== null &&
        value !== undefined &&
        String(value).toLowerCase().includes(query)
      )
    );
  }, [normalizedIssues, filterText]);

  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  
  console.log('[EpicsHierarchy] Current filters:', { teamName, isGroup });
  
  // Look up ID from name to construct proper teamValue
  const teamValue = useMemo(() => {
    if (!teamName) {
      console.log('[EpicsHierarchy] No team name, returning null');
      return null;
    }
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      const value = group ? `group:${group.group_key}` : null;
      console.log(`[EpicsHierarchy] Looking for group "${teamName}":`, value);
      return value;
    } else {
      const team = teams.find(t => t.team_name === teamName);
      const value = team ? `team:${team.team_key}` : null;
      console.log(`[EpicsHierarchy] Looking for team "${teamName}":`, value);
      return value;
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
    setFilters((prev) => ({
      ...prev,
      pi: selectedPIs.length > 0 ? selectedPIs : null,
    }));
  }, [setFilters]);

  const handleTeamNameChange = useCallback((value: string | null, type: 'group' | 'team', name: string) => {
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
  }, [setFilters]);

  const handleHierarchyLevelChange = useCallback((level: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      hierarchy_level: level ?? null,
    }));
  }, [setFilters]);


  const filterRow = (
    <ReportFiltersRow>
      <ReportFilterField label="PIs">
        <MultiPIFilter
          selectedPIs={piNames}
          onPIsChange={handlePIsChange}
          maxSelections={100}
          autoSelectFirst={false}
          pis={availablePIs}
          />
      </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamNameChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Type Hierarchy Level">
        <IssueTypesHierarchyFilter
          value={hierarchyLevel}
          onChange={handleHierarchyLevelChange}
          placeholder="All issue types"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Search">
        <input
          type="text"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Search hierarchy..."
          className="w-48 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  const columns = useMemo<ColumnConfig[]>(() => {
    if (!normalizedIssues.length) {
      return [];
    }

    const firstRow = normalizedIssues[0];

    const columnsToShow: Array<{
      key: string;
      header: string;
      renderer?: 'link' | 'badge' | 'text';
      minWidth?: number;
      maxWidth?: number;
      size?: number;
    }> = [
      // Key (link)
      { key: 'Key', header: 'Key', renderer: 'link', minWidth: 69, maxWidth: 79, size: 74 },
      { key: 'key', header: 'Key', renderer: 'link', minWidth: 69, maxWidth: 79, size: 74 },
      // Type (badge)
      { key: 'Type', header: 'Type', renderer: 'badge', minWidth: 70, maxWidth: 80, size: 75 },
      { key: 'type', header: 'Type', renderer: 'badge', minWidth: 70, maxWidth: 80, size: 75 },
      // Quarter PI
      { key: 'quarter_pi', header: 'PI', minWidth: 48, maxWidth: 56, size: 52 },
      // Team Name - 5% smaller
      { key: 'Team Name', header: 'Team Name', minWidth: 57, maxWidth: 114, size: 76 },
      { key: 'team_name', header: 'Team Name', minWidth: 57, maxWidth: 114, size: 76 },
      // Summary
      { key: 'Issue Summary', header: 'Summary', renderer: 'text', minWidth: 200, size: 270 },
      { key: 'summary', header: 'Summary', renderer: 'text', minWidth: 200, size: 270 },
      // Status (badge)
      { key: 'Status', header: 'Status', renderer: 'badge', minWidth: 83, maxWidth: 93, size: 88 },
      { key: 'status', header: 'Status', renderer: 'badge', minWidth: 83, maxWidth: 93, size: 88 },
      // Progress% field
      { key: 'Progress%', header: 'Progress %', renderer: 'text', minWidth: 61, maxWidth: 71, size: 66 },
      { key: 'Progress (%)', header: 'Progress %', renderer: 'text', minWidth: 61, maxWidth: 71, size: 66 },
      { key: 'Epic Progress %', header: 'Progress %', renderer: 'text', minWidth: 61, maxWidth: 71, size: 66 },
      // Dependency
      { key: 'Dependency', header: 'Dependency', renderer: 'badge', minWidth: 58, maxWidth: 68, size: 63 },
      // Flagged Issues
      { key: '# Flagged Issues', header: 'Flagged Issues', renderer: 'text', minWidth: 58, maxWidth: 68, size: 63 },
    ];

    const addedHeaders = new Set<string>();
    const builtColumns: ColumnConfig[] = [];

    columnsToShow.forEach((colDef) => {
      if (addedHeaders.has(colDef.header)) {
        return;
      }

      const fieldKey = Object.prototype.hasOwnProperty.call(firstRow, colDef.key) ? colDef.key : undefined;

      if (fieldKey) {
        addedHeaders.add(colDef.header);
        builtColumns.push({
          id: colDef.key,
          header: colDef.header,
          accessorKey: fieldKey,
          renderer: colDef.renderer,
          minWidth: colDef.minWidth,
          maxWidth: colDef.maxWidth,
          size: colDef.size,
        });
      }
    });

    return builtColumns;
  }, [normalizedIssues]);

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
    
    if (isGroup) {
      badges.push({
        label: 'Team Type',
        value: 'Group',
        filterKey: 'isGroup',
        isPinned: pinnedFilters.includes('isGroup'),
      });
    }
    
    return badges;
  }, [piNames, teamName, hierarchyLevel, isGroup, pinnedFilters]);

  return (
    <ReportCard
      title="Epics Hierarchy"
      reportId={componentProps?.reportId}
      filters={filterRow}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
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
              <h3 className="text-xs font-medium text-red-800">Error loading data</h3>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <p className="mt-3 text-gray-600 text-sm">Loading hierarchy data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <HierarchyTable
          data={filteredIssues}
          columns={columns}
          defaultExpanded={false}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showControls={false}
        />
      )}
    </ReportCard>
  );
};

export default EpicsHierarchyView;

