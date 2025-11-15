'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ClosedSprint } from '@/lib/config';
import DataTable, { Column, SortConfig } from '../DataTable';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

export interface ClosedSprintsViewProps {
  data: ClosedSprint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
}

const ClosedSprintsView: React.FC<ClosedSprintsViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });

  const months = Number(filters.months ?? 3);
  const teamName = (filters.team_name as string) ?? '';

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handleTimePeriodChange = useCallback(
    (value: number) => {
      setFilters((prev) => ({
        ...prev,
        months: value,
      }));
    },
    [setFilters]
  );

  const handleTeamNameChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        team_name: value || null,
      }));
    },
    [setFilters]
  );

  // Auto-select first team if none selected
  useEffect(() => {
    if (loading || availableTeams.length === 0) {
      return;
    }

    if (!teamName && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handleTeamNameChange(availableTeams[0]);
    }
  }, [availableTeams, teamName, loading, handleTeamNameChange]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const columns: Column<ClosedSprint>[] = useMemo(() => {
    if (!data.length) return [];

    const firstSprint = data[0];
    return Object.keys(firstSprint).map((key) => {
      let label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      if (
        key === 'completion_percentage' ||
        key === 'completed_percentage' ||
        key === 'completion' ||
        (key.includes('completion') && key.includes('percentage'))
      ) {
        label = 'Completed (%)';
      }

      const keyStr = String(key);
      const isLeftAlign = key === 'sprint_name' || key === 'sprint_goal';
      const isExpandable = keyStr === 'sprint_goal';

      return {
        key,
        label,
        align: isLeftAlign ? 'left' : 'center',
        sortable: true,
        expandable: isExpandable,
        maxLength: isExpandable ? 150 : undefined,
        render: (value: any) => {
          if (value === null || value === undefined) return '-';

          if (keyStr.includes('date') && typeof value === 'string') {
            return formatDate(value);
          }

          if (keyStr === 'sprint_goal' && typeof value === 'string') {
            return value;
          }

          if (
            keyStr === 'completion_percentage' ||
            keyStr === 'completed_percentage' ||
            keyStr === 'completion' ||
            (keyStr.includes('completion') && keyStr.includes('percentage'))
          ) {
            const num = Math.round(Number(value));
            return (
              <span
                className={`font-bold ${
                  num >= 75 ? 'text-green-600' : num >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {num}%
              </span>
            );
          }

          if (keyStr.includes('predictability')) {
            const num = Number(value);
            return (
              <span
                className={`font-semibold ${
                  num >= 80 ? 'text-green-600' : num >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {num}%
              </span>
            );
          }

          if (keyStr.includes('issues_done')) {
            return <span className="text-green-600 font-semibold">{value}</span>;
          }
          if (keyStr.includes('issues_remaining')) {
            return <span className="text-red-600 font-semibold">{value}</span>;
          }
          if (keyStr.includes('issues_')) {
            return <span className="text-gray-700">{value}</span>;
          }

          if (keyStr === 'velocity') {
            return <span className="text-gray-900 font-semibold">{value}</span>;
          }

          return value;
        },
      };
    });
  }, [data, formatDate]);

  const timePeriodOptions = [
    { value: 1, label: 'Last 1 month' },
    { value: 2, label: 'Last 2 months' },
    { value: 3, label: 'Last 3 months' },
    { value: 4, label: 'Last 4 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 9, label: 'Last 9 months' },
  ];

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team">
        <select
          value={teamName}
          onChange={(e) => handleTeamNameChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">Select Team</option>
          {availableTeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Time Period">
        <select
          value={months}
          onChange={(e) => handleTimePeriodChange(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {timePeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  return (
    <ReportCard
      title="Closed Sprints"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {loading && (
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading sprints...</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 h-64">
          {error}
        </div>
      )}

      {!loading && !error && (
        <DataTable<ClosedSprint>
          data={data}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          loading={false}
          error={undefined}
          emptyMessage="No sprints found matching the filter criteria."
          rowKey={(row) => row.sprint_id}
          striped
          hoverable
        />
      )}
    </ReportCard>
  );
};

export default ClosedSprintsView;

