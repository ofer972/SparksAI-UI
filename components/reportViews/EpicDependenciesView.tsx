'use client';

import React, { useMemo, useCallback } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';
import MultiPIFilter from '../MultiPIFilter';

interface EpicDependencyItem {
  [key: string]: any;
}

interface EpicDependenciesResult {
  inbound?: EpicDependencyItem[];
  outbound?: EpicDependencyItem[];
}

interface EpicDependenciesViewProps {
  data: EpicDependenciesResult | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
}

const buildColumns = (rows: EpicDependencyItem[] = []): Column<EpicDependencyItem>[] => {
  if (rows.length === 0) {
    return [];
  }

  return Object.keys(rows[0]).map((key) => ({
    key,
    label: key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    align: 'left' as const,
    sortable: true,
    render: (value: any) => {
      if (value === null || value === undefined || value === '') {
        return <span className="text-xs text-gray-500">-</span>;
      }
      if (typeof value === 'number') {
        return (
          <span className="text-xs text-gray-800">
            {Number.isInteger(value) ? value : value.toFixed(2)}
          </span>
        );
      }
      return <span className="text-xs text-gray-800">{String(value)}</span>;
    },
  }));
};

const EpicDependenciesView: React.FC<EpicDependenciesViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
}) => {
  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

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

  const handlePIsChange = useCallback((selectedPIs: string[]) => {
    setFilters((prev) => ({
      ...prev,
      pi: selectedPIs.length > 0 ? selectedPIs : null,
    }));
  }, [setFilters]);

  const outbound = Array.isArray(data?.outbound) ? data!.outbound : [];
  const inbound = Array.isArray(data?.inbound) ? data!.inbound : [];

  const outboundColumns = useMemo(() => buildColumns(outbound), [outbound]);
  const inboundColumns = useMemo(() => buildColumns(inbound), [inbound]);

  const filtersContent = (
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
    </ReportFiltersRow>
  );

  return (
    <ReportCard 
      title="Epic Dependencies" 
      reportId={componentProps?.reportId}
      filters={filtersContent} 
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
          <div className="border border-gray-200 rounded-lg p-4 flex flex-col">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex-shrink-0">Outbound Dependency Metrics</h3>
            <div className="flex-1 min-h-0">
            <DataTable<EpicDependencyItem>
              data={outbound}
              columns={outboundColumns.length ? outboundColumns : undefined}
              loading={loading}
              emptyMessage="No outbound dependencies found."
            />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 flex flex-col">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex-shrink-0">Inbound Dependency Load</h3>
            <div className="flex-1 min-h-0">
            <DataTable<EpicDependencyItem>
              data={inbound}
              columns={inboundColumns.length ? inboundColumns : undefined}
              loading={loading}
              emptyMessage="No inbound dependencies found."
            />
            </div>
          </div>
        </div>
      )}
    </ReportCard>
  );
};

export default EpicDependenciesView;

