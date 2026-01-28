'use client';

import React, { useMemo, useCallback } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditBarChartView from './AuditBarChartView';
import ReportFilterField from '../reporting/ReportFilterField';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface MostActiveUser {
  user_id: string;
  request_count: number;
  percentage: number;
}

interface AuditMostActiveUsersViewProps {
  data: MostActiveUser[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const AuditMostActiveUsersView: React.FC<AuditMostActiveUsersViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
}) => {
  const months = (filters?.months as number) ?? 1;

  const handleMonthsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, months: Number(e.target.value) }));
    },
    [setFilters]
  );

  // Transform data for chart
  const transformData = useCallback((item: MostActiveUser) => ({
    user_id: item.user_id,
    'Request Count': item.request_count,
  }), []);

  // Generate filter badges
  const filterBadges = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = [];
    if (months) {
      const period = TIME_PERIOD_OPTIONS.find((opt) => opt.value === months);
      if (period) {
        badges.push({ label: 'Period', value: period.label });
      }
    }
    return badges;
  }, [months]);

  // Filter content
  const filterContent = (
    <ReportFilterField label="Time Period">
      <select
        value={months}
        onChange={handleMonthsChange}
        className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {TIME_PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ReportFilterField>
  );

  return (
    <AuditBarChartView<MostActiveUser>
      title="Most Active Users"
      reportId="audit-most-active-users"
      data={data}
      loading={loading}
      error={error}
      dataKey="Request Count"
      indexKey="user_id"
      xAxisLabel="User ID"
      yAxisLabel="Request Count"
      transformData={transformData}
      bottomMargin={120}
      tickRotation={-45}
      filters={filters}
      setFilters={setFilters}
      refresh={refresh}
      meta={meta}
      filterBadges={filterBadges}
      filterContent={filterContent}
    />
  );
};

export default AuditMostActiveUsersView;
