'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type { HierarchyItem } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import HierarchyTable from '../hierarchyTable/HierarchyTable';
import type { ColumnConfig } from '../hierarchyTable/types';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import MultiPIFilter from '../MultiPIFilter';

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
      parent: issue['Parent Key'] || issue.parent || null,
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

  const teamName = (filters.team_name as string) ?? '';
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
  const limitInput = Math.min(Number(filters.limit ?? DEFAULT_LIMIT), 1000);

  const handlePIsChange = useCallback((selectedPIs: string[]) => {
    setFilters((prev) => ({
      ...prev,
      pi: selectedPIs.length > 0 ? selectedPIs : null,
    }));
  }, [setFilters]);

  const handleTeamNameChange = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      team_name: value || null,
    }));
  }, [setFilters]);

  // Build tree to get all parent keys for expand/collapse all
  const allParentKeys = useMemo(() => {
    const keys: string[] = [];
    const hasChildren = new Set<string>();
    
    normalizedIssues.forEach((issue) => {
      if (issue.parent) {
        hasChildren.add(issue.parent);
      }
    });
    
    normalizedIssues.forEach((issue) => {
      if (issue.key && hasChildren.has(issue.key)) {
        keys.push(issue.key);
      }
    });
    
    return keys;
  }, [normalizedIssues]);

  const toggleAllExpanded = useCallback(() => {
    const hasExpanded = Object.keys(expanded).length > 0 && Object.values(expanded).some((v) => v);
    
    if (hasExpanded) {
      // Collapse all
      setExpanded({});
    } else {
      // Expand all
      const newExpanded: Record<string, boolean> = {};
      allParentKeys.forEach((key) => {
        newExpanded[key] = true;
      });
      setExpanded(newExpanded);
    }
  }, [expanded, allParentKeys]);

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

      <ReportFilterField label="Team">
        <select
          value={teamName}
          onChange={(event) => handleTeamNameChange(event.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">All Teams</option>
          {availableTeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Limit">
          <input
            type="number"
          min={100}
            max={1000}
          value={limitInput}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              limit: Math.min(Math.max(Number(event.target.value) || DEFAULT_LIMIT, 100), 1000),
            }))
          }
          className="w-24 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      <ReportFilterField label="Hierarchy">
        <button
          type="button"
          onClick={toggleAllExpanded}
          className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.keys(expanded).length > 0 && Object.values(expanded).some((v) => v) ? 'Collapse All' : 'Expand All'}
        </button>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  const columns = useMemo<ColumnConfig[]>(() => {
    if (!normalizedIssues.length) {
      return [];
    }
    const firstRow = normalizedIssues[0];
    const allKeys = Object.keys(firstRow);

    // Define only the columns to show (in order)
    const columnsToShow = [
      { key: 'Key', header: 'Key', renderer: 'link' as const, minWidth: 120 },
      { key: 'Type', header: 'Type', minWidth: 100 },
      { key: 'Issue Summary', header: 'Summary', minWidth: 250 },
      { key: 'Status', header: 'Status', minWidth: 120 },
      { key: 'Status of Epic', header: 'Status of Epic', minWidth: 140 },
      { key: 'Epic Progress %', header: 'Epic Progress', minWidth: 120 },
      { key: 'Dependency', header: 'Dependency', minWidth: 80 },
      { key: 'Team Name', header: 'Team Name', minWidth: 150 },
      { key: 'quarter_pi', header: 'Quarter PI', minWidth: 100 },
      { key: '# Flagged Issues', header: 'Flagged Issues', minWidth: 100 },
    ];

    // Create columns only for the specified fields that exist in the data
    const orderedColumns: ColumnConfig[] = [];
    
    columnsToShow.forEach((colDef) => {
      if (allKeys.includes(colDef.key)) {
        const config: ColumnConfig = {
          id: colDef.key,
          header: colDef.header,
          accessorKey: colDef.key,
          minWidth: colDef.minWidth,
        };

        if (colDef.renderer) {
          config.renderer = colDef.renderer;
        }

        orderedColumns.push(config);
      }
    });

    return orderedColumns;
  }, [normalizedIssues]);

  return (
    <ReportCard
      title="Epics Hierarchy"
      reportId={componentProps?.reportId}
      filters={filterRow}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {loading && (
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading epics hierarchy...</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 h-64">
          {error}
        </div>
      )}

      {!loading && !error && columns.length > 0 && (
        <div className="h-full px-4 py-3">
          <HierarchyTable
          data={filteredIssues}
            columns={columns}
            defaultExpanded={false}
            expanded={expanded}
            onExpandedChange={setExpanded}
            showControls={false}
          />
        </div>
      )}

      {!loading && !error && normalizedIssues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No epics found for the selected filters.
        </div>
      )}
    </ReportCard>
  );
};

export default EpicsHierarchyView;

