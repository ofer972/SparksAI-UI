'use client';

import React, { useMemo, useState } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import { DataTable } from '../DataTable';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface FailedEndpoint {
  action: string;
  endpoint_path: string;
  status_code: number;
  severity: string;
  count: number;
  percentage: number;
}

interface AuditFailedEndpointsViewProps {
  data: FailedEndpoint[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'OK', label: 'OK' },
  { value: 'NONE', label: 'NONE' },
];

const AuditFailedEndpointsView: React.FC<AuditFailedEndpointsViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}) => {
  const months = (filters?.months as number) ?? 1;
  const severity = (filters?.severity as string) ?? '';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'count',
    direction: 'desc',
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    let filtered = data;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        (item.action || '').toLowerCase().includes(query) ||
        (item.endpoint_path || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof FailedEndpoint];
      const bVal = b[sortConfig.key as keyof FailedEndpoint];
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const columns = useMemo(
    () => [
      {
        key: 'action',
        label: 'Action',
        align: 'left' as const,
        sortable: true,
        width: '165px',
        render: (value: string) => value || '—',
      },
      {
        key: 'endpoint_path',
        label: 'Endpoint',
        align: 'left' as const,
        sortable: true,
        render: (value: string) => <div className="break-words whitespace-normal">{value || '—'}</div>,
      },
      {
        key: 'status_code',
        label: 'Code',
        align: 'center' as const,
        sortable: true,
        width: '70px',
      },
      {
        key: 'severity',
        label: 'Severity',
        align: 'center' as const,
        sortable: true,
        width: '90px',
      },
      {
        key: 'count',
        label: 'Count',
        align: 'center' as const,
        sortable: true,
        width: '60px',
      },
      {
        key: 'percentage',
        label: '%',
        align: 'center' as const,
        sortable: true,
        width: '70px',
        render: (value: number) => (value != null ? `${value.toFixed(1)}%` : '—'),
      },
    ],
    []
  );

  const filterBadges = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = [];
    if (months !== 1) {
      const period = TIME_PERIOD_OPTIONS.find((opt) => opt.value === months);
      if (period) {
        badges.push({
          label: 'Period',
          value: period.label,
        });
      }
    }
    if (severity) {
      const severityLabel = severityOptions.find((opt) => opt.value === severity)?.label || severity;
      badges.push({
        label: 'Severity',
        value: severityLabel,
      });
    }
    return badges;
  }, [months, severity]);

  if (error) {
    return (
      <ReportCard title="Failed Endpoints" reportId="audit-failed-endpoints" hideCollapse={true}>
        <div className="text-red-500 p-4">Error: {error}</div>
      </ReportCard>
    );
  }

  return (
    <ReportCard
      title="Failed Endpoints"
      reportId="audit-failed-endpoints"
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
        <ReportFilterField label="Severity">
          <select
            value={severity}
            onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {severityOptions.map((option) => (
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
            placeholder="Search action or endpoint..."
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
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          loading={loading}
          error={error}
          emptyMessage="No failed endpoints found"
          striped={true}
        />
      </div>
    </ReportCard>
  );
};

export default AuditFailedEndpointsView;
