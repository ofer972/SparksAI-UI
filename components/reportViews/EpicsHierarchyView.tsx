'use client';

import React, { useMemo, useCallback, useState } from 'react';
import type { HierarchyItem } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import DataTable from '../DataTable';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

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
  componentProps,
}) => {
  const [filterText, setFilterText] = useState('');

  const issues = Array.isArray(data?.issues) ? data!.issues : [];

  const filteredIssues = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return issues;
    }
    return issues.filter((issue) =>
      Object.values(issue).some((value) =>
        value !== null &&
        value !== undefined &&
        String(value).toLowerCase().includes(query)
      )
    );
  }, [issues, filterText]);

  const teamInput = (filters.team_name as string) ?? '';
  const piInput = (filters.pi as string) ?? '';
  const limitInput = Math.min(Number(filters.limit ?? DEFAULT_LIMIT), 1000);

  const filterRow = (
    <ReportFiltersRow>
      <ReportFilterField label="PI">
          <input
            type="text"
          value={piInput}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              pi: event.target.value.trim() || null,
            }))
          }
          placeholder="e.g. 2025-Q1"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
      </ReportFilterField>

      <ReportFilterField label="Team">
          <input
            type="text"
          value={teamInput}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              team_name: event.target.value.trim() || null,
            }))
          }
          placeholder="All teams"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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
    </ReportFiltersRow>
  );

  const autoColumns = useMemo(() => {
    if (!issues.length) {
      return [];
    }
    const firstRow = issues[0];
    return Object.keys(firstRow).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    }));
  }, [issues]);

  return (
    <ReportCard
      title="Epics Hierarchy"
      reportId={componentProps?.reportId}
      filters={filterRow}
      onRefresh={refresh}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable<HierarchyItem>
          data={filteredIssues}
          columns={autoColumns.length ? autoColumns : undefined}
          loading={loading}
          error={undefined}
          emptyMessage="No epics found for the selected filters."
          rowKey={(row, index) => row.key ?? index}
      />
      )}
    </ReportCard>
  );
};

export default EpicsHierarchyView;

