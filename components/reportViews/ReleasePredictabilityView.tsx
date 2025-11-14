'use client';

import React, { useMemo } from 'react';
import type { ReleasePredictabilityItem } from '@/lib/config';
import { getCleanJiraUrl } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';

interface ReleasePredictabilityViewProps {
  data: ReleasePredictabilityItem[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
}

const buildColumns = (jiraUrl: string): Column<ReleasePredictabilityItem>[] => {
  const getPercentageClass = (value: number | undefined | null): string => {
    if (value === 100) {
      return 'text-green-600 font-semibold';
    }
    return 'text-gray-900';
  };

  return [
    {
      key: 'version_name',
      label: 'Version Name',
      align: 'left',
      render: (value, row) => {
        if (!value) {
          return <span className="text-sm text-gray-500">-</span>;
        }
        const projectKey = row.project_key;
        const handleClick = (event: React.MouseEvent) => {
          event.stopPropagation();
          if (projectKey) {
            const link = `${jiraUrl}/plugins/servlet/project-config/${projectKey}/administer-versions`;
            window.open(link, '_blank');
          }
        };
        return (
          <button
            type="button"
            onClick={handleClick}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {value}
          </button>
        );
      },
    },
    {
      key: 'project_key',
      label: 'Project Key',
    },
    {
      key: 'release_start_date',
      label: 'Release Start Date',
    },
    {
      key: 'release_date',
      label: 'Release Date',
    },
    {
      key: 'overall_progress',
      label: 'Overall Progress',
      render: (_value, row) => {
        const totalEpics = row.total_epics_in_scope ?? 0;
        const epicsCompleted = row.epics_completed ?? 0;
        const totalOther = row.total_other_issues_in_scope ?? 0;
        const otherCompleted = row.other_issues_completed ?? 0;
        const totalIssues = totalEpics + totalOther;
        const completedIssues = epicsCompleted + otherCompleted;
        const progressPercent = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;
        const formattedPercent = progressPercent.toFixed(1);

        return (
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 min-w-[45px] text-right">{formattedPercent}%</span>
          </div>
        );
      },
    },
    {
      key: 'total_epics_in_scope',
      label: 'Total Epics In Scope',
    },
    {
      key: 'epic_percent_completed',
      label: 'Epics % Completed',
      render: (value) => {
        if (value === undefined || value === null) {
          return <span className="text-sm text-gray-500">-</span>;
        }
        return (
          <span className={`text-sm ${getPercentageClass(Number(value))}`}>
            {Number(value).toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'total_other_issues_in_scope',
      label: 'Total Other Issues In Scope',
    },
    {
      key: 'other_issues_percent_completed',
      label: 'Other Issues % Completed',
      render: (value) => {
        if (value === undefined || value === null) {
          return <span className="text-sm text-gray-500">-</span>;
        }
        return (
          <span className={`text-sm ${getPercentageClass(Number(value))}`}>
            {Number(value).toFixed(1)}%
          </span>
        );
      },
    },
  ];
};

const ReleasePredictabilityView: React.FC<ReleasePredictabilityViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  componentProps,
}) => {
  const months = Number(filters.months ?? 3);
  const jiraUrl = getCleanJiraUrl();
  const rows = Array.isArray(data) ? data : [];

  const columns = useMemo(() => buildColumns(jiraUrl), [jiraUrl]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Months">
        <select
          value={months}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              months: Number(event.target.value),
            }))
          }
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[1, 2, 3, 4, 6, 9].map((option) => (
            <option key={option} value={option}>
              Last {option} month{option === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Rows">
        <span className="text-sm text-gray-700">{rows.length}</span>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  return (
    <ReportCard 
      title="Release Predictability" 
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
        <DataTable<ReleasePredictabilityItem>
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No release predictability data available."
          rowKey={(row, index) => `${row.version_name || 'release'}-${index}`}
        />
      )}
    </ReportCard>
  );
};

export default ReleasePredictabilityView;

