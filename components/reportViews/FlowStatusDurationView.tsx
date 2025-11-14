'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import type {
  StatusDuration,
  IssueStatusDurationIssue,
  MonthlyStatusDurationDataset,
} from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getCleanJiraUrl } from '@/lib/config';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

ChartJS.defaults.set('plugins.datalabels', { display: false });

type ViewMode = 'total' | 'monthly';

type FlowStatusDurationResult = {
  summary?: StatusDuration[];
  monthly?: {
    labels: string[];
    datasets: MonthlyStatusDurationDataset[];
  };
  detail?: {
    issues?: IssueStatusDurationIssue[];
    count?: number;
    status_name?: string;
    year_month?: string | null;
    months?: number | null;
  } | null;
  view_mode?: ViewMode;
};

interface FlowStatusDurationViewProps {
  data: FlowStatusDurationResult | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
}

const MONTHLY_COLORS = [
  'rgba(17, 24, 39, 0.8)',
  'rgba(59, 130, 246, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(234, 179, 8, 0.8)',
  'rgba(245, 158, 11, 0.8)',
];

const MONTHLY_BORDER_COLORS = [
  'rgba(17, 24, 39, 1)',
  'rgba(59, 130, 246, 1)',
  'rgba(168, 85, 247, 1)',
  'rgba(34, 197, 94, 1)',
  'rgba(234, 179, 8, 1)',
  'rgba(245, 158, 11, 1)',
];

const FlowStatusDurationView: React.FC<FlowStatusDurationViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  componentProps,
}) => {
  const issueType = (filters.issue_type as string) ?? '';
  const teamName = (filters.team_name as string) ?? '';
  const months = Number(filters.months ?? 3);
  const viewMode = (filters.view_mode as ViewMode) ?? 'total';

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStatus, setDetailStatus] = useState<string>('');
  const [detailYearMonth, setDetailYearMonth] = useState<string | undefined>();

  const summaryData = Array.isArray(data?.summary)
    ? data!.summary.filter((item) => (item.avg_duration_days ?? 0) > 0)
    : [];

  const summaryChartData = useMemo(() => {
    return {
      labels: summaryData.map((item) => item.status_name ?? 'Unknown'),
      datasets: [
        {
          label: 'Average Days',
          data: summaryData.map((item) => Number(item.avg_duration_days ?? 0)),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [summaryData]);

  const monthlyData = data?.monthly;

  const monthlyChartData = useMemo(() => {
    if (!monthlyData || !Array.isArray(monthlyData.datasets)) {
      return { labels: [], datasets: [] };
    }

    const filteredStatuses = monthlyData.datasets.filter((dataset) =>
      dataset.data?.some((value) => value > 0)
    );

    const statusLabels = filteredStatuses.map((dataset) => dataset.label ?? 'Status');

    const datasets = (monthlyData.labels ?? []).map((monthLabel, monthIndex) => ({
      label: monthLabel,
      data: filteredStatuses.map((dataset) => dataset.data?.[monthIndex] ?? 0),
      backgroundColor: MONTHLY_COLORS[monthIndex % MONTHLY_COLORS.length],
      borderColor: MONTHLY_BORDER_COLORS[monthIndex % MONTHLY_COLORS.length],
      borderWidth: 1,
      barThickness: 'flex' as const,
      maxBarThickness: 50,
    }));

    return {
      labels: statusLabels,
      datasets,
    };
  }, [monthlyData]);

  const handleViewModeChange = (mode: ViewMode) => {
    setFilters((prev) => ({
      ...prev,
      view_mode: mode,
    }));
  };

  const handleBarClick = useCallback(
    (statusName: string, yearMonth?: string) => {
      if (!statusName) {
        return;
      }
      setDetailStatus(statusName);
      setDetailYearMonth(yearMonth);
      setDetailOpen(true);
      setFilters((prev) => ({
        ...prev,
        detail_status: statusName,
        detail_year_month: yearMonth ?? null,
        detail_months: months,
      }));
    },
    [months, setFilters]
  );

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailStatus('');
    setDetailYearMonth(undefined);
    setFilters((prev) => {
      const clone = { ...prev };
      delete clone.detail_status;
      delete clone.detail_year_month;
      delete clone.detail_months;
      return clone;
    });
  };

  const detailIssues = data?.detail?.issues ?? [];

  useEffect(() => {
    if (data?.detail?.issues && data.detail.issues.length > 0) {
      setDetailOpen(true);
    }
  }, [data?.detail?.issues]);

  const chartData = viewMode === 'monthly' ? monthlyChartData : summaryChartData;

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      barPercentage: viewMode === 'monthly' ? 1.0 : 0.8,
      categoryPercentage: viewMode === 'monthly' ? 1.0 : 0.8,
      onClick: (_event: any, elements: any[]) => {
        if (elements.length > 0) {
          const element = elements[0];
          const statusIndex = element.index;
          const statusName = chartData.labels?.[statusIndex];
          if (!statusName) {
            return;
          }
          let yearMonth: string | undefined;
          if (viewMode === 'monthly') {
            const monthIndex = element.datasetIndex;
            yearMonth = monthlyData?.labels?.[monthIndex];
          }
          handleBarClick(statusName, yearMonth);
        }
      },
      onHover: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          event.native?.target?.style && (event.native.target.style.cursor = 'pointer');
        } else if (event.native?.target?.style) {
          event.native.target.style.cursor = 'default';
        }
      },
      plugins: {
        legend: {
          display: viewMode === 'monthly',
          position: 'top' as const,
        },
        title: {
          display: true,
          text:
            viewMode === 'monthly'
              ? 'Flow Status Duration by Month (click a bar for details)'
              : 'Average Time in Status (click a bar for details)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        datalabels: {
          anchor: 'end' as const,
          align: 'top' as const,
          color: '#111827',
          formatter: (value: number) => (value > 0 ? value.toFixed(1) : ''),
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          padding: {
            top: 2,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const base = `${Number(context.parsed.y ?? 0).toFixed(1)} days`;
              if (viewMode === 'monthly') {
                return `${context.dataset.label}: ${base} (click for issues)`;
              }
              return `${base} (click for issues)`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Average Days',
          },
        },
      },
    }),
    [chartData.labels, handleBarClick, monthlyData?.labels, viewMode]
  );

  const jiraUrl = getCleanJiraUrl();

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Team">
        <input
          type="text"
          value={teamName}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              team_name: event.target.value.trim() || null,
            }))
          }
          placeholder="All teams"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <input
          type="text"
          value={issueType}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              issue_type: event.target.value.trim() || null,
            }))
          }
          placeholder="All issue types"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>

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

      <ReportFilterField label="View Mode">
        <select
          value={viewMode}
          onChange={(event) => handleViewModeChange(event.target.value as ViewMode)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="total">Total</option>
          <option value="monthly">Monthly</option>
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  const detailColumns: Column<IssueStatusDurationIssue>[] = useMemo(
    () => [
      {
        key: 'issue_key',
        label: 'Issue Key',
        render: (value: any) => (
          <a
            href={`${jiraUrl}/browse/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        ),
      },
      {
        key: 'summary',
        label: 'Summary',
        align: 'left' as const,
      },
      {
        key: 'duration_days',
        label: 'Duration (days)',
        render: (value: any) => Number(value ?? 0).toFixed(1),
      },
      {
        key: 'time_entered',
        label: 'Entered',
      },
      {
        key: 'time_exited',
        label: 'Exited',
      },
    ],
    [jiraUrl]
  );

  return (
    <ReportCard 
      title="Flow Status Duration" 
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
        <div className="space-y-4 h-full flex flex-col">
          <div className="border border-gray-200 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Average Duration by Status
            </h3>
            <div className="relative flex-1 h-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {detailOpen && detailIssues.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-md font-semibold text-gray-900">
                    {detailStatus} Issues
                  </h3>
                  {detailYearMonth && (
                    <p className="text-xs text-gray-600">
                      Month: {detailYearMonth}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Close
                </button>
              </div>
              <DataTable<IssueStatusDurationIssue>
                data={detailIssues}
                columns={detailColumns}
                loading={loading}
                emptyMessage="No issues found for this status."
                rowKey={(row, index) => `${row.issue_key || 'issue'}-${index}`}
              />
            </div>
          )}
        </div>
      )}
    </ReportCard>
  );
};

export default FlowStatusDurationView;

