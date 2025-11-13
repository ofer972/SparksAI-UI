'use client';

import React, { useMemo } from 'react';
import type { SprintPredictabilityItem } from '@/lib/config';
import { getCleanJiraUrl } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';

interface SprintPredictabilityViewProps {
  data: SprintPredictabilityItem[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
}

const getJiraSearchLink = (keys: string[], jiraUrl: string) => {
  if (!keys || keys.length === 0) {
    return '#';
  }
  const keysParam = keys.join(',');
  const jql = encodeURIComponent(`key IN (${keysParam})`);
  return `${jiraUrl}/issues/?jql=${jql}`;
};

const buildColumns = (jiraUrl: string): Column<SprintPredictabilityItem>[] => [
  {
    key: 'sprint_name',
    label: 'Sprint Name',
    align: 'left',
  },
  {
    key: 'sprint_official_end_date',
    label: 'End Date',
    render: (value) => {
      if (!value) {
        return <span className="text-sm text-gray-500">-</span>;
      }
      const date = new Date(value);
      return (
        <span className="text-sm text-gray-700">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      );
    },
  },
  {
    key: 'sprint_predictability',
    label: 'Predictability %',
    render: (value) => {
      const percent = typeof value === 'number' ? value * 100 : 0;
      const formatted = percent.toFixed(1);
      const isGreen = percent >= 75;
      return (
        <span className={`text-sm font-semibold ${isGreen ? 'text-green-600' : 'text-gray-900'}`}>
          {formatted}%
        </span>
      );
    },
  },
  {
    key: 'avg_story_cycle_time',
    label: 'Avg Cycle Time',
    render: (value) => {
      const num = typeof value === 'number' ? value : 0;
      let color = 'text-gray-900';
      if (num > 15) {
        color = 'text-red-600';
      } else if (num >= 10) {
        color = 'text-yellow-600';
      } else if (num > 0) {
        color = 'text-green-600';
      }
      return (
        <span className={`text-sm font-semibold ${color}`}>{num.toFixed(1)}</span>
      );
    },
  },
  {
    key: 'completed_issue_keys',
    label: 'Completed',
    render: (_value, row) => {
      const issues = row.completed_issue_keys ?? [];
      if (issues.length === 0) {
        return <span className="text-sm text-gray-500">0</span>;
      }
      const link = getJiraSearchLink(issues, jiraUrl);
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          title={issues.join(', ')}
        >
          {issues.length}
        </a>
      );
    },
  },
  {
    key: 'total_committed_issue_keys',
    label: 'Committed',
    render: (_value, row) => {
      const issues = row.total_committed_issue_keys ?? [];
      if (issues.length === 0) {
        return <span className="text-sm text-gray-500">0</span>;
      }
      const link = getJiraSearchLink(issues, jiraUrl);
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          title={issues.join(', ')}
        >
          {issues.length}
        </a>
      );
    },
  },
  {
    key: 'issues_not_completed_keys',
    label: 'Not Completed',
    render: (_value, row) => {
      const issues = row.issues_not_completed_keys ?? [];
      if (issues.length === 0) {
        return <span className="text-sm text-gray-500">0</span>;
      }
      const link = getJiraSearchLink(issues, jiraUrl);
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-red-600 hover:text-red-800 hover:underline"
          title={issues.join(', ')}
        >
          {issues.length}
        </a>
      );
    },
  },
];

const SprintPredictabilityView: React.FC<SprintPredictabilityViewProps> = ({
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
      title="Sprint Predictability" 
      reportId={componentProps?.reportId}
      filters={filtersContent} 
      onRefresh={refresh}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <DataTable<SprintPredictabilityItem>
          data={rows}
          columns={columns}
          loading={loading}
          emptyMessage="No sprint predictability data available."
          rowKey={(row, index) => `${row.sprint_name || 'sprint'}-${index}`}
        />
      )}
    </ReportCard>
  );
};

export default SprintPredictabilityView;
