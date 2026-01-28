'use client';

import React, { useMemo, ReactNode } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';

export interface AuditBarChartViewProps<T> {
  // Report identity
  title: string;
  reportId: string;

  // Data
  data: T[] | null | undefined;
  loading: boolean;
  error: string | null;

  // Chart configuration
  dataKey: string;           // e.g., 'Unique Users', 'Request Count'
  indexKey: string;          // e.g., 'date', 'day', 'user_id'
  xAxisLabel: string;
  yAxisLabel: string;
  
  // Transform function to convert raw data item to chart format
  transformData: (item: T) => Record<string, any>;

  // Optional chart customization
  bottomMargin?: number;     // Default: 80
  tickRotation?: number;     // Default: -45
  colorScheme?: string;      // Default: 'nivo'

  // Filters
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;

  // Filter badges for display
  filterBadges?: Array<{ label: string; value: string }>;

  // Custom filter UI (rendered inside ReportFiltersRow)
  filterContent?: ReactNode;
}

function AuditBarChartView<T>({
  title,
  reportId,
  data,
  loading,
  error,
  dataKey,
  indexKey,
  xAxisLabel,
  yAxisLabel,
  transformData,
  bottomMargin = 80,
  tickRotation = -45,
  colorScheme = 'nivo',
  filters,
  setFilters,
  refresh,
  meta,
  filterBadges = [],
  filterContent,
}: AuditBarChartViewProps<T>) {
  // All hooks must be called before any conditional returns
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(transformData);
  }, [data, transformData]);

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-500">
          Error: {error}
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-content-muted">
          No data available
        </div>
      );
    }

    return (
      <div style={{ height: '400px' }}>
        <ResponsiveBar
          data={chartData}
          keys={[dataKey]}
          indexBy={indexKey}
          margin={{ top: 50, right: 50, bottom: bottomMargin, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: colorScheme as any }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: tickRotation,
            legend: xAxisLabel,
            legendPosition: 'middle',
            legendOffset: bottomMargin - 20,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: yAxisLabel,
            legendPosition: 'middle',
            legendOffset: -50,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    );
  };

  return (
    <ReportCard
      title={title}
      reportId={reportId}
      filterBadges={filterBadges}
      onRefresh={refresh}
      hideCollapse={true}
      filters={filterContent ? <ReportFiltersRow>{filterContent}</ReportFiltersRow> : undefined}
    >
      {renderContent()}
    </ReportCard>
  );
}

export default AuditBarChartView;
