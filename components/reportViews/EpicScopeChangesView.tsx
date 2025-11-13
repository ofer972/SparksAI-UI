'use client';

import React, { useMemo, useState, useCallback } from 'react';
import MultiPIFilter from '../MultiPIFilter';
import StackedGroupedBarChart, {
  StackedGroupedBarChartData,
} from '../StackedGroupedBarChart';
import { ScopeChangesDataPoint } from '@/lib/api';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

const epicScopeColors = {
  'Issues Planned': '#0066cc',
  'Issues Added': '#800080',
  'Issues Completed': '#009900',
  'Issues Not Completed': '#ff8c00',
  'Issues Removed': '#00ffff',
};

export interface EpicScopeChangesViewProps {
  data: ScopeChangesDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  componentProps?: Record<string, any>;
}

type ScopeMetricKey = `${string}|${string}`;

const arraysEqual = (a: string[], b: string[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const parseIssueKeys = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((key) => (typeof key === 'string' ? key.trim() : String(key).trim()))
      .filter((key) => key.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }
  return [];
};

const EpicScopeChangesView: React.FC<EpicScopeChangesViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  componentProps,
}) => {
  const quarters = Array.isArray(filters.quarters) ? filters.quarters : [];
  const [selectedPIs, setSelectedPIs] = useState<string[]>(quarters);
  const autoSelectFirst =
    componentProps && typeof componentProps.autoSelectFirst === 'boolean'
      ? componentProps.autoSelectFirst
      : true;

  React.useEffect(() => {
    if (!arraysEqual(quarters, selectedPIs)) {
      setSelectedPIs(quarters);
    }
  }, [quarters, selectedPIs]);

  const aggregatedData = useMemo((): StackedGroupedBarChartData[] => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const map = new Map<ScopeMetricKey, {
      quarter: string;
      metricName: string;
      value: number;
      issueKeys: Set<string>;
    }>();

    data.forEach((item) => {
      const quarter = item['Quarter Name'];
      const metricName = item['Metric Name'];
      const rawIssueKeys = item['Issue Keys'] ?? item.issue_keys ?? item.issueKeys ?? '';
      const issueKeys = parseIssueKeys(rawIssueKeys);
      const value = Number(item.Value) || 0;
      const key: ScopeMetricKey = `${quarter}|${metricName}`;

      if (!map.has(key)) {
        map.set(key, {
          quarter,
          metricName,
          value,
          issueKeys: new Set(issueKeys),
        });
      } else {
        const existing = map.get(key)!;
        existing.value += value;
        issueKeys.forEach((issueKey) => existing.issueKeys.add(issueKey));
      }
    });

    return Array.from(map.values()).map((entry) => ({
      quarter: entry.quarter,
      stackGroup: 'aggregate',
      metricName: entry.metricName,
      value: entry.value,
      issueKeys: Array.from(entry.issueKeys),
    }));
  }, [data]);

  const handlePIsChange = useCallback(
    (values: string[]) => {
      if (arraysEqual(values, selectedPIs)) {
        return;
      }
      setSelectedPIs(values);
      setFilters((prev) => {
        const nextQuarters = values;
        const prevQuarters = Array.isArray(prev.quarters) ? prev.quarters : [];
        if (arraysEqual(nextQuarters, prevQuarters)) {
          return prev;
        }
        return {
          ...prev,
          quarters: nextQuarters,
        };
      });
    },
    [selectedPIs, setFilters]
  );

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="PI Selection">
        <MultiPIFilter
          selectedPIs={selectedPIs}
          onPIsChange={handlePIsChange}
          maxSelections={4}
          autoSelectFirst={autoSelectFirst}
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  const showChart = !loading && !error && selectedPIs.length > 0 && aggregatedData.length > 0;

  return (
    <ReportCard
      title="Epic Scope Changes"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      onRefresh={refresh}
    >
      <div className="h-full w-full flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600">Loading scope changes...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && selectedPIs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select at least one PI to view scope changes.
          </div>
        )}

        {showChart && (
          <div className="w-full h-full flex-1 relative">
            <StackedGroupedBarChart
              data={aggregatedData}
              title="Epic Scope Changes"
              yAxisLabel="# of Epics"
              xAxisLabel="Quarter"
              colorScheme={epicScopeColors}
              loading={false}
              error={null}
            />
          </div>
        )}

        {!loading && !error && selectedPIs.length > 0 && aggregatedData.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No scope changes found for the selected quarters.
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default EpicScopeChangesView;

