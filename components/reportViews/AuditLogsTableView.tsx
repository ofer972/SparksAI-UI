'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import { DataTable } from '../DataTable';
import { ApiService } from '@/lib/api';
import AuditLogDetailModal from './AuditLogDetailModal';

interface AuditLog {
  id: number;
  user_id?: string;
  severity: string;
  endpoint_path: string;
  action?: string;
  http_method: string;
  status_code: number;
  created_at: string;
  tokens_used?: number;
  response_time_seconds: number;
  body_raw?: string;
  [key: string]: any;
}

interface AuditLogsTableViewProps {
  data: AuditLog[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

interface FilterValues {
  http_methods: string[];
  status_codes: number[];
  severities: string[];
  user_ids: string[];
  actions: string[];
}

const AuditLogsTableView: React.FC<AuditLogsTableViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    http_methods: [],
    status_codes: [],
    severities: [],
    user_ids: [],
    actions: [],
  });
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Create columns with action button
  const columns = useMemo(() => [
    { key: 'id', label: 'ID', align: 'center' as const, width: '60px' },
    { key: 'created_at', label: 'Created At', align: 'left' as const, width: '180px', render: (value: string) => value ? new Date(value).toLocaleString() : '—' },
    { key: 'user_id', label: 'User ID', align: 'left' as const, width: '150px', render: (value: string) => value || '—' },
    { key: 'http_method', label: 'Method', align: 'center' as const, width: '100px' },
    { key: 'action', label: 'Action', align: 'left' as const, width: '120px', render: (value: string) => value || '—' },
    { key: 'status_code', label: 'Status', align: 'center' as const, width: '70px' },
    { key: 'severity', label: 'Severity', align: 'center' as const, width: '90px' },
    { key: 'tokens_used', label: 'Tokens', align: 'center' as const, width: '80px', render: (value: number) => value != null ? value.toString() : '—' },
    { key: 'response_time_seconds', label: 'Response Time', align: 'center' as const, width: '110px', render: (value: number) => value != null ? `${value.toFixed(2)}s` : '—' },
    { 
      key: 'actions', 
      label: '', 
      align: 'center' as const, 
      width: '60px', 
      sortable: false,
      render: (_value: any, row: AuditLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="text-content-tertiary hover:text-brand focus:outline-none"
          title="View details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )
    },
  ], []);

  // Load filter values on mount
  useEffect(() => {
    const loadFilterValues = async () => {
      try {
        const apiService = new ApiService();
        const values = await apiService.getAuditLogsFilterValues();
        console.log('[AuditLogsTableView] Loaded filter values:', values);
        setFilterValues(values);
      } catch (err) {
        console.error('Failed to load filter values:', err);
        // Set empty arrays on error so UI doesn't break
        setFilterValues({
          http_methods: [],
          status_codes: [],
          severities: [],
          user_ids: [],
          actions: [],
        });
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterValues();
  }, []);

  // Set default date_from to today if not set (format: YYYY-MM-DD)
  useEffect(() => {
    if (!filters.date_from) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      setFilters((prev) => ({ ...prev, date_from: todayStr }));
    }
  }, [filters.date_from, setFilters]);

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
      Object.values(item).some((val) =>
        String(val || '').toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

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

  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string }[] = [];
    if (filters.user_id) badges.push({ label: 'User', value: filters.user_id });
    if (filters.severity) badges.push({ label: 'Severity', value: filters.severity });
    if (filters.action) badges.push({ label: 'Action', value: filters.action });
    if (filters.http_method) badges.push({ label: 'Method', value: filters.http_method });
    if (filters.status_code) badges.push({ label: 'Status', value: String(filters.status_code) });
    if (filters.date_from) badges.push({ label: 'From Date', value: filters.date_from });
    if (filters.min_tokens) badges.push({ label: 'Min Tokens', value: String(filters.min_tokens) });
    if (filters.limit) badges.push({ label: 'Limit', value: String(filters.limit) });
    if (searchQuery) badges.push({ label: 'Search', value: searchQuery });
    return badges;
  }, [filters, searchQuery]);

  if (loading || loadingFilters) {
    return (
      <ReportCard
        title="Audit Logs"
        reportId="audit-logs"
        filterBadges={filterBadges}
        onRefresh={refresh}
        hideCollapse={true}
      >
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading audit logs...</div>
          </div>
        </div>
      </ReportCard>
    );
  }

  return (
    <>
      <ReportCard
        title="Audit Logs"
        reportId="audit-logs"
        filterBadges={filterBadges}
        onRefresh={refresh}
        hideCollapse={true}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">User ID</label>
              <select
                value={filters.user_id || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value || undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Users</option>
                {filterValues.user_ids.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value || undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Severities</option>
                {filterValues.severities.map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value || undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Actions</option>
                {filterValues.actions.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">HTTP Method</label>
              <select
                value={filters.http_method || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, http_method: e.target.value || undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Methods</option>
                {filterValues.http_methods.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Status Code</label>
              <select
                value={filters.status_code || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, status_code: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Status Codes</option>
                {filterValues.status_codes.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value || undefined }))}
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Min Tokens</label>
              <input
                type="number"
                value={filters.min_tokens || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, min_tokens: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="≥"
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Limit</label>
              <input
                type="number"
                value={filters.limit || 100}
                onChange={(e) => setFilters((prev) => ({ ...prev, limit: e.target.value ? parseInt(e.target.value) : 100 }))}
                min="1"
                max="500"
                className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit logs..."
              className="w-full px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="mt-4 audit-table-wrapper h-full flex flex-col">
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
            emptyMessage="No audit logs found"
            striped={true}
          />
        </div>
      </ReportCard>

      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
};

export default AuditLogsTableView;

