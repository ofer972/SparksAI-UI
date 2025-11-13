'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { PIPredictabilityData } from '@/lib/config';
import DataTable, { Column, SortConfig } from '../DataTable';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import MultiPIFilter from '../MultiPIFilter';

export interface PIPredictabilityViewProps {
  data: PIPredictabilityData[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  componentProps?: { isDashboard?: boolean };
}

const PIPredictabilityView: React.FC<PIPredictabilityViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  componentProps,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const columns: Column<PIPredictabilityData>[] = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const firstRow = data[0];

    if (!firstRow || typeof firstRow !== 'object') {
      return [];
    }

    const preferredOrder = [
      'pi_name',
      'team_name',
      'pi_predictability_percentage',
      'avg_cycle_time_completed_epics_days',
      'total_issues_in_scope',
      'issues_completed_within_pi_dates',
    ];

    const filteredKeys = Object.keys(firstRow).filter((key) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      return (
        label !== 'Issues In Scope Keys' &&
        !key.toLowerCase().includes('issues_in_scope_keys') &&
        label !== 'Completed Issues Keys' &&
        !key.toLowerCase().includes('completed_issues_keys')
      );
    });

    const cols = filteredKeys.map((key) => {
      let label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      if (label === 'Pi Predictability Percentage') {
        label = 'PI Predictability (%)';
      }

      if (label === 'Avg Cycle Time Completed Epics Days') {
        label = 'Avg Cycle Time Completed Epics (Days)';
      }

      const order = preferredOrder.indexOf(key);
      const isLeftAlign = key === 'pi_name' || key === 'team_name';

      return {
        key,
        label,
        align: (isLeftAlign ? 'left' : 'center') as 'left' | 'center' | 'right',
        sortable: true,
        order,
        render: (value: any) => {
          if (value === null || value === undefined) return '-';

          if (key.includes('date') && typeof value === 'string') {
            return formatDate(value);
          }

          if (
            key === 'pi_predictability_percentage' ||
            key.includes('pi_predictability_percentage')
          ) {
            const num = Math.round(Number(value));
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

          if (
            key === 'avg_cycle_time_completed_epics_days' ||
            key.includes('avg_cycle_time_completed_epics_days')
          ) {
            const num = Number(value);
            const colorClass =
              num < 5
                ? 'text-gray-900'
                : num <= 50
                ? 'text-green-600'
                : num <= 95
                ? 'text-yellow-600'
                : 'text-red-600';
            return <span className={`font-semibold ${colorClass}`}>{num.toFixed(1)}</span>;
          }

          if (key.includes('percentage') || key.includes('predictability')) {
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

          if (typeof value === 'number') {
            return <span className="text-gray-900">{value}</span>;
          }

          return value;
        },
      };
    });

    cols.sort((a, b) => {
      const orderA = (a as any).order >= 0 ? (a as any).order : 999;
      const orderB = (b as any).order >= 0 ? (b as any).order : 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.label.localeCompare(b.label);
    });

    return cols.map(({ order, ...col }) => col);
  }, [data, formatDate]);

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

  const handlePIsChange = useCallback(
    (values: string[]) => {
      setFilters((prev) => ({
        ...prev,
        pi_names: values,
      }));
    },
    [setFilters]
  );

  const handleTeamNameChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        team_name: value.trim() || null,
      }));
    },
    [setFilters]
  );

  const filteredData = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      Object.values(row).some((value) =>
        value !== null &&
        value !== undefined &&
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, filterText]);

  const piNames = Array.isArray(filters.pi_names) ? filters.pi_names : [];
  const teamName = (filters.team_name as string) ?? '';
  const isDashboard = componentProps?.isDashboard;

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="PIs">
        {isDashboard ? (
          <span className="text-sm text-gray-700">{piNames.join(', ')}</span>
        ) : (
          <MultiPIFilter
            selectedPIs={piNames}
            onPIsChange={handlePIsChange}
            maxSelections={4}
            autoSelectFirst={true}
          />
        )}
      </ReportFilterField>
      {!isDashboard && (
        <ReportFilterField label="Team Name">
          <input
            type="text"
            value={teamName}
            onChange={(event) => handleTeamNameChange(event.target.value)}
            placeholder="All teams"
            className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </ReportFilterField>
      )}
      <ReportFilterField label="Search">
        <input
          type="text"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter by PI, team, or predictability..."
          className="w-56 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  return (
    <ReportCard title="PI Predictability" filters={filtersContent} onRefresh={refresh}>
      <DataTable<PIPredictabilityData>
        data={filteredData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        loading={loading}
        error={error || undefined}
        emptyMessage={error ? undefined : 'No data found matching the filter criteria.'}
        rowKey={(row, index) => `${row.pi_name || 'pi'}-${row.team_name || 'team'}-${index}`}
        striped
        hoverable
      />
    </ReportCard>
  );
};

export default PIPredictabilityView;

