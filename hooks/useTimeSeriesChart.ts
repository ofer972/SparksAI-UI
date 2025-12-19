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
}

export function useTimeSeriesChart({
  groupBy,
  chartType,
  chartPeriods,
  yAxisLabel,
  selectedIssueTypesCount,
  aggregate,
  valueDecimals = 0,
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
          },
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
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
          color: '#000000',
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
            display: true,
            text: 'Date',
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          stacked: chartType === 'bar' && selectedIssueTypesCount > 1 && !aggregate,
          title: {
            display: true,
            text: yAxisLabel,
          },
          ticks: {
            stepSize: 1,
          },
        },
      },
      elements: {
        point: {
          radius: 0,
        },
      },
    };
  }, [chartType, groupBy, chartPeriods, selectedIssueTypesCount, aggregate, yAxisLabel, valueDecimals]);
}

