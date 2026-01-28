'use client';

import React, { useMemo, useState } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import { DataTable } from '../DataTable';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

export interface AuditTableColumn<T> {
  key: keyof T & string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface AuditTableReportProps<T> {
  // Configuration
  title: string;
  reportId: string;
  columns: AuditTableColumn<T>[];
  defaultSortKey: keyof T & string;
  defaultSortDirection?: 'asc' | 'desc';
  searchFields: (keyof T & string)[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  
  // Data props (from report system)
  data: T[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

function AuditTableReport<T extends Record<string, any>>({
  title,
  reportId,
  columns,
  defaultSortKey,
  defaultSortDirection = 'desc',
  searchFields,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}: AuditTableReportProps<T>) {
  const months = (filters?.months as number) ?? 1;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: defaultSortKey,
    direction: defaultSortDirection,
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) =>
        (String(item[field]) || '').toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery, searchFields]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // Convert columns to DataTable format
  const tableColumns = useMemo(
    () =>
      columns.map((col) => ({
        key: col.key,
        label: col.label,
        align: col.align || ('left' as const),
        sortable: col.sortable !== false,
        width: col.width,
        render: col.render || ((value: any) => value ?? '—'),
      })),
    [columns]
  );

  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string }[] = [];
    if (months) {
      const period = TIME_PERIOD_OPTIONS.find((opt) => opt.value === months);
      if (period) {
        badges.push({ label: 'Period', value: period.label });
      }
    }
    if (searchQuery) {
      badges.push({ label: 'Search', value: searchQuery });
    }
    return badges;
  }, [months, searchQuery]);

  if (loading) {
    return (
      <ReportCard
        title={title}
        reportId={reportId}
        filterBadges={filterBadges}
        onRefresh={refresh}
        hideCollapse={true}
      >
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading {title.toLowerCase()}...</div>
          </div>
        </div>
      </ReportCard>
    );
  }

  return (
    <ReportCard
      title={title}
      reportId={reportId}
      filterBadges={filterBadges}
      onRefresh={refresh}
      hideCollapse={true}
    >
      <ReportFiltersRow>
        <ReportFilterField label="Time Period">
          <select
            value={months}
            onChange={(e) => setFilters((prev) => ({ ...prev, months: Number(e.target.value) }))}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {TIME_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
        <ReportFilterField label="Search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </ReportFilterField>
      </ReportFiltersRow>

      <div className="audit-table-wrapper h-full flex flex-col">
        <style dangerouslySetInnerHTML={{
          __html: `
            .audit-table-wrapper table {
              table-layout: fixed !important;
            }
            .audit-table-wrapper table td {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          `
        }} />
        <DataTable
          data={sortedData}
          columns={tableColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
          loading={loading}
          error={error}
          emptyMessage={emptyMessage}
          striped={true}
        />
      </div>
    </ReportCard>
  );
}

export default AuditTableReport;

