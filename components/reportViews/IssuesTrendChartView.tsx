'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { IssuesTrendDataPoint } from '@/lib/api';
import { getIssueTypes } from '@/lib/issueTypes';
import { format, parseISO } from 'date-fns';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface IssuesTrendChartViewProps {
  data: IssuesTrendDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  componentProps?: Record<string, any>;
}

const IssuesTrendChartView: React.FC<IssuesTrendChartViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  componentProps,
}) => {
  const issueType = (filters.issue_type as string) ?? 'Bug';
  const months = Number(filters.months ?? 6);

  const availableIssueTypes = useMemo(() => getIssueTypes(), []);

  const chartData = useMemo(() => {
    if (!data.length) return null;

    const monthlyData: Record<string, { created: number; resolved: number; open: number }> =
      {};

    data.forEach((point) => {
      const month = point.report_month;
      if (!monthlyData[month]) {
        monthlyData[month] = { created: 0, resolved: 0, open: 0 };
      }
      monthlyData[month].created += point.issues_created;
      monthlyData[month].resolved += point.issues_resolved;
      monthlyData[month].open = point.cumulative_open_issues;
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    const labels = sortedMonths.map((month) => format(parseISO(month), 'MMM yyyy'));
    const createdData = sortedMonths.map((month) => monthlyData[month].created);
    const resolvedData = sortedMonths.map((month) => monthlyData[month].resolved);
    const openData = sortedMonths.map((month) => monthlyData[month].open);

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Issues Created',
          data: createdData,
          backgroundColor: 'rgba(204, 0, 0, 0.6)',
          borderColor: '#cc0000',
          borderWidth: 1,
          maxBarThickness: 36,
          order: 2,
        },
        {
          type: 'bar' as const,
          label: 'Issues Resolved',
          data: resolvedData,
          backgroundColor: 'rgba(0, 153, 0, 0.6)',
          borderColor: '#009900',
          borderWidth: 1,
          maxBarThickness: 36,
          order: 3,
        },
        {
          type: 'line' as const,
          label: 'Issues Left Open (Trend)',
          data: openData,
          borderColor: '#4169E1',
          backgroundColor: '#4169E1',
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointHoverRadius: 8,
          pointBackgroundColor: '#4169E1',
          pointBorderColor: '#4169E1',
          pointHoverBackgroundColor: '#4169E1',
          pointHoverBorderColor: '#4169E1',
          pointHoverBorderWidth: 2,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => {
    if (!chartData || !chartData.datasets) {
      return {};
    }

    const createdData =
      chartData.datasets.find((d) => d.label === 'Issues Created')?.data || [];
    const resolvedData =
      chartData.datasets.find((d) => d.label === 'Issues Resolved')?.data || [];
    const allBarData = [
      ...(Array.isArray(createdData) ? createdData : []),
      ...(Array.isArray(resolvedData) ? resolvedData : []),
    ];
    const maxCreatedResolved = allBarData.length > 0 ? Math.max(...allBarData) : 0;
    const suggestedMaxLeft =
      maxCreatedResolved > 0 ? Math.ceil(maxCreatedResolved) + 2 : undefined;

    const rightYMax =
      chartData.datasets.find((d) => d.label === 'Issues Left Open (Trend)')?.data ||
      [];
    const maxOpenIssues = Math.max(...(Array.isArray(rightYMax) ? rightYMax : []));
    const suggestedMaxRight =
      maxOpenIssues > 0 ? Math.ceil(maxOpenIssues * 1.15) : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      maxBarThickness: 36,
      categoryPercentage: 0.5,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 12,
            boxWidth: 12,
            boxHeight: 12,
            font: {
              size: 9,
            },
          },
          padding: {
            top: 0,
            bottom: 5,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title(context: any) {
              return context[0].label;
            },
            label(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              switch (label) {
                case 'Issues Created':
                  return `🔴 Issues Created: ${value}`;
                case 'Issues Resolved':
                  return `🟢 Issues Resolved: ${value}`;
                case 'Issues Left Open (Trend)':
                  return `🔵 Issues Left Open: ${value}`;
                default:
                  return `${label}: ${value}`;
              }
            },
          },
        },
        datalabels: {
          display: () => true,
          color(context: any) {
            const datasetLabel = context.dataset.label || '';
            return datasetLabel === 'Issues Left Open (Trend)' ? '#4169E1' : '#000';
          },
          font(context: any) {
            const datasetLabel = context.dataset.label || '';
            if (datasetLabel === 'Issues Left Open (Trend)') {
              return { size: 14, weight: 'bold' as const };
            }
            return { size: 12, weight: 'bold' as const };
          },
          formatter(value: number) {
            return value != null && value > 0 ? value : '';
          },
          anchor(context: any) {
            const datasetLabel = context.dataset.label || '';
            return datasetLabel === 'Issues Left Open (Trend)'
              ? ('center' as const)
              : ('end' as const);
          },
          align(context: any) {
            const datasetLabel = context.dataset.label || '';
            return datasetLabel === 'Issues Left Open (Trend)'
              ? ('bottom' as const)
              : ('end' as const);
          },
          offset(context: any) {
            const datasetLabel = context.dataset.label || '';
            return datasetLabel === 'Issues Left Open (Trend)' ? -25 : -5;
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Month',
            font: {
              size: 10,
              weight: 'bold' as const,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: '# of Issues',
            font: {
              size: 10,
              weight: 'bold' as const,
            },
          },
          beginAtZero: true,
          max: suggestedMaxLeft,
          ticks: {
            stepSize: 1,
            callback(value: any) {
              if (value % 1 === 0) {
                return value;
              }
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: '# of Issues',
            font: {
              size: 10,
              weight: 'bold' as const,
            },
            color: '#4169E1',
          },
          beginAtZero: true,
          max: suggestedMaxRight,
          ticks: {
            color: '#4169E1',
            stepSize: 1,
            callback(value: any) {
              if (value % 1 === 0) {
                return value;
              }
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };
  }, [chartData]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              issue_type: e.target.value,
            }))
          }
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {availableIssueTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Months">
        <select
          value={months}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              months: Number(e.target.value),
            }))
          }
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="1">1 Month</option>
          <option value="2">2 Months</option>
          <option value="3">3 Months</option>
          <option value="4">4 Months</option>
          <option value="6">6 Months</option>
          <option value="9">9 Months</option>
          <option value="12">12 Months</option>
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  return (
    <ReportCard 
      title="Bugs Created and Resolved Over Time" 
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

      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading trend chart...</div>
          </div>
        </div>
      )}

      {!loading && !error && (!chartData || !chartData.labels || !chartData.datasets || !chartData.labels.length) && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">No data available</div>
        </div>
      )}

      {!loading && !error && chartData && chartData.labels && chartData.datasets && chartData.labels.length > 0 && (
        <div className="overflow-x-auto h-full" style={{ minHeight: '425px' }}>
          <div className="relative w-full h-full">
            <Chart type="bar" data={chartData} options={options} plugins={[ChartDataLabels]} />
          </div>
        </div>
      )}
    </ReportCard>
  );
};

export default IssuesTrendChartView;

