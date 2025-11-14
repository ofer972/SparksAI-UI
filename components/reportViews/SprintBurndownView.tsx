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

interface SprintBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: Record<string, any>;
}

const ISSUE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Issues' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Story', label: 'Story' },
  { value: 'Task', label: 'Task' },
];

const SprintBurndownView: React.FC<SprintBurndownViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
}) => {
  const issueType = (filters.issue_type as string) ?? 'all';
  const sprintName = (filters.sprint_name as string) ?? '';
  const teamName = (filters.team_name as string) ?? '';

  const sprintOptions: Array<{ value: string; label: string }> = useMemo(() => {
    if (Array.isArray(componentProps?.sprintOptions)) {
      return componentProps!.sprintOptions;
    }
    if (Array.isArray(meta?.available_sprints)) {
      return meta!.available_sprints.map((name: string) => ({
        value: name,
        label: name,
      }));
    }
    return [];
  }, [componentProps?.sprintOptions, meta?.available_sprints]);

  const handleIssueTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      issue_type: value,
    }));
  };

  const handleSprintChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      sprint_name: value || null,
    }));
    if (typeof componentProps?.onSprintChange === 'function') {
      componentProps.onSprintChange(value);
    }
  };

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team">
        <span className="text-sm text-gray-700">{teamName || 'Select a team'}</span>
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(event) => handleIssueTypeChange(event.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ISSUE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      {sprintOptions.length > 0 && (
        <ReportFilterField label="Sprint">
          <select
            value={sprintName}
            onChange={(event) => handleSprintChange(event.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Current Sprint</option>
            {sprintOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
      )}
    </ReportFiltersRow>
  );

  const currentSprintName = componentProps?.currentSprintName as string | undefined;

  return (
    <ReportCard 
      title="Sprint Burndown" 
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
        {(meta?.sprint_name || meta?.start_date || meta?.end_date) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {meta?.sprint_name && <span>Sprint: {meta.sprint_name}</span>}
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

export default SprintBurndownView;

