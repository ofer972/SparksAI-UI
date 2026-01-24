import { useMemo } from 'react';
import type { ChartOptions } from 'chart.js';

export interface UseTimeSeriesChartParams {
  groupBy: 'day' | 'week' | 'month';
  chartType: 'line' | 'bar';
  chartPeriods: string[];
  yAxisLabel: string;
  selectedIssueTypesCount: number;
  aggregate: boolean;
  valueDecimals?: number; // Number of decimal places (default: 0 for integers)
  isDark?: boolean; // Dark mode flag
}

export function useTimeSeriesChart({
  groupBy,
  chartType,
  chartPeriods,
  yAxisLabel,
  selectedIssueTypesCount,
  aggregate,
  valueDecimals = 0,
  isDark = false,
}: UseTimeSeriesChartParams): ChartOptions<'line' | 'bar'> {
  return useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            color: isDark ? '#cbd5e1' : '#374151',
          },
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: isDark ? '#475569' : '#333',
          borderWidth: 1,
          callbacks: {
            title: (context: any) => {
              const index = context[0].dataIndex;
              const period = chartPeriods[index];
              if (!period) return '';
              const date = new Date(period);
              if (groupBy === 'day') {
                return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              } else if (groupBy === 'week') {
                const weekEnd = new Date(date);
                weekEnd.setDate(date.getDate() + 6);
                return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
              } else if (groupBy === 'month') {
                return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long'
                });
              }
              return period;
            },
            label: (context: any) => {
              const value = context.parsed.y;
              if (value === null || value === undefined) return '';
              const formattedValue = valueDecimals > 0
                ? value.toFixed(valueDecimals)
                : value.toString();
              return `${context.dataset.label}: ${formattedValue}`;
            },
          },
        },
        datalabels: {
          display: chartType === 'bar',
          color: isDark ? '#f1f5f9' : '#000000',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          formatter: function(value: number) {
            if (value === undefined || value === null || isNaN(value) || value === 0) {
              return '';
            }
            return valueDecimals > 0
              ? value.toFixed(valueDecimals)
              : Math.round(value).toString();
          },
          anchor: 'center' as const,
          align: 'center' as const,
        },
      },
      scales: {
        x: {
          type: 'category' as const,
          title: {
            display: false,
            text: 'Date',
            color: isDark ? '#cbd5e1' : '#374151',
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            color: isDark ? '#cbd5e1' : '#374151',
          },
          grid: {
            color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          beginAtZero: true,
          stacked: chartType === 'bar' && selectedIssueTypesCount > 1 && !aggregate,
          title: {
            display: true,
            text: yAxisLabel,
            color: isDark ? '#cbd5e1' : '#374151',
          },
          ticks: {
            stepSize: 1,
            color: isDark ? '#cbd5e1' : '#374151',
          },
          grid: {
            color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      elements: {
        point: {
          radius: 0,
        },
      },
    };
  }, [chartType, groupBy, chartPeriods, selectedIssueTypesCount, aggregate, yAxisLabel, valueDecimals, isDark]);
}

