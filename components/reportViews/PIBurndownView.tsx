'use client';

import React, { useMemo } from 'react';
import BurndownChart from '../BurndownChart';
import type { BurndownDataPoint } from '@/lib/api';
import type {
  ReportFiltersUpdater,
} from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import { getIssueTypes } from '@/lib/issueTypes';

interface PIBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void };
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
}) => {
  const issueType = (filters.issue_type as string) ?? 'Epic';
  const project = (filters.project as string) ?? '';
  const piName = (filters.pi as string) ?? '';
  const isDashboard = componentProps?.isDashboard;

  const issueTypeOptions = useMemo(() => getIssueTypes(), []);

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const filtersContent = (
    <ReportFiltersRow>
      {!isDashboard && (
        <ReportFilterField label="PI">
          <span className="text-sm text-gray-700">{piName || 'Select a PI'}</span>
        </ReportFilterField>
      )}

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

  return (
    <ReportCard 
      title="PI Burndown" 
      reportId={componentProps?.reportId} 
      filters={filtersContent} 
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      <div className="w-full h-full flex flex-col">
        <div className="relative flex-1">
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

