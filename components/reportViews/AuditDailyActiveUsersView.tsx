'use client';

import React, { useMemo, useCallback } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditBarChartView from './AuditBarChartView';
import ReportFilterField from '../reporting/ReportFilterField';

interface DailyActiveUser {
  date: string;
  day: number;
  unique_users: number;
}

interface AuditDailyActiveUsersViewProps {
  data: DailyActiveUser[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

// Generate month options for last 12 months
const generateMonthOptions = () => {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    options.push({ value, label });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

const AuditDailyActiveUsersView: React.FC<AuditDailyActiveUsersViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
}) => {
  // Default to current month
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  
  const month = (filters?.month as string) ?? currentMonth;

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, month: e.target.value }));
    },
    [setFilters]
  );

  // Transform data for chart
  const transformData = useCallback((item: DailyActiveUser) => ({
    day: String(item.day),
    'Unique Users': item.unique_users,
  }), []);

  // Generate filter badges
  const filterBadges = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = [];
    if (month) {
      const monthOption = MONTH_OPTIONS.find((opt) => opt.value === month);
      if (monthOption) {
        badges.push({ label: 'Month', value: monthOption.label });
      }
    }
    return badges;
  }, [month]);

  // Filter content
  const filterContent = (
    <ReportFilterField label="Month">
      <select
        value={month}
        onChange={handleMonthChange}
        className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {MONTH_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ReportFilterField>
  );

  return (
    <AuditBarChartView<DailyActiveUser>
      title="Daily Active Users"
      reportId="audit-daily-active-users"
      data={data}
      loading={loading}
      error={error}
      dataKey="Unique Users"
      indexKey="day"
      xAxisLabel="Day of Month"
      yAxisLabel="Unique Users"
      transformData={transformData}
      bottomMargin={60}
      tickRotation={0}
      filters={filters}
      setFilters={setFilters}
      refresh={refresh}
      meta={meta}
      filterBadges={filterBadges}
      filterContent={filterContent}
    />
  );
};

export default AuditDailyActiveUsersView;

