import { useMemo } from 'react';
import type { GroupedDataPoint } from './useTimeSeriesData';

const defaultColors = [
  '#0066cc', // Blue
  '#800080', // Purple
  '#00ff00', // Green
  '#ff8c00', // Orange
  '#00ffff', // Cyan
  '#ff0000', // Red
  '#ffc0cb', // Pink
  '#808080', // Gray
  '#ffff00', // Yellow
  '#0000ff', // Dark Blue
];

export interface UseTimeSeriesChartDataParams {
  groupedData: GroupedDataPoint[];
  chartPeriods: string[];
  selectedIssueTypes: string[];
  availableIssueTypes: string[];
  aggregate: boolean;
  chartType: 'line' | 'bar';
  formatPeriodLabel: (period: string) => string;
  aggregateLabel?: string;
}

export function useTimeSeriesChartData({
  groupedData,
  chartPeriods,
  selectedIssueTypes,
  availableIssueTypes,
  aggregate,
  chartType,
  formatPeriodLabel,
  aggregateLabel = 'Aggregated',
}: UseTimeSeriesChartDataParams) {
  return useMemo(() => {
    if (!groupedData.length || !chartPeriods.length) return null;

    const periods = chartPeriods;

    const findLastNonZeroIndex = (allData: (number | null)[][]): number => {
      for (let i = allData[0]?.length - 1 || 0; i >= 0; i--) {
        if (allData.some(data => data[i] !== null && data[i] !== 0)) {
          return i;
        }
      }
      return -1;
    };

    if (aggregate) {
      // Check if data is pre-aggregated (cycle time with weighted calculation)
      const hasAggregatedType = groupedData.some(d => d.issuetype === 'Aggregated');

      const aggregatedData = periods.map(period => {
        if (hasAggregatedType) {
          // Use pre-aggregated value (for cycle time)
          const periodData = groupedData.find(d => d.period === period && d.issuetype === 'Aggregated');
          return periodData ? periodData.value : 0;
        } else {
          // Sum all issue types (for WIP - original behavior)
          const periodData = groupedData.filter(d => d.period === period);
          return periodData.reduce((sum, d) => sum + d.value, 0);
        }
      });

      let lastIndex = aggregatedData.length - 1;
      while (lastIndex >= 0 && aggregatedData[lastIndex] === 0) lastIndex--;
      const endIndex = lastIndex + 1;

      const baseDataset = {
        label: aggregateLabel,
        data: aggregatedData.slice(0, endIndex),
        borderColor: '#0066cc',
        backgroundColor: chartType === 'bar' ? '#0066cc' : 'rgba(0, 102, 204, 0.1)',
        borderWidth: 2,
      };

      const labels = periods.slice(0, endIndex).map(formatPeriodLabel);
      if (chartType === 'line') {
        return {
          labels,
          datasets: [{
            ...baseDataset,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          }],
        };
      } else {
        return {
          labels,
          datasets: [{
            ...baseDataset,
            type: 'bar' as const,
          }],
        };
      }
    } else {
      const selectedTypes = selectedIssueTypes.length > 0 ? selectedIssueTypes : availableIssueTypes;
      const allDataPoints = selectedTypes.map(type => {
        const typeData = groupedData.filter(d => d.issuetype === type);
        return periods.map(period => {
          const point = typeData.find(d => d.period === period);
          return point ? point.value : null;
        });
      });

      const lastIndex = findLastNonZeroIndex(allDataPoints);
      const endIndex = lastIndex + 1;

      const labels = periods.slice(0, endIndex).map(formatPeriodLabel);
      if (chartType === 'bar' && selectedTypes.length > 1) {
        return {
          labels,
          datasets: selectedTypes.map((type, index) => ({
            label: type,
            data: allDataPoints[index].slice(0, endIndex).map(v => v ?? 0),
            backgroundColor: defaultColors[index % defaultColors.length],
            borderColor: defaultColors[index % defaultColors.length],
            borderWidth: 1,
            type: 'bar' as const,
            stack: 'stack1',
          })),
        };
      } else {
        return {
          labels,
          datasets: selectedTypes.map((type, index) => {
            const baseConfig = {
              label: type,
              data: allDataPoints[index].slice(0, endIndex),
              borderColor: defaultColors[index % defaultColors.length],
              backgroundColor: chartType === 'bar'
                ? defaultColors[index % defaultColors.length]
                : `${defaultColors[index % defaultColors.length]}40`,
              borderWidth: 2,
            };

            if (chartType === 'line') {
              return {
                ...baseConfig,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                spanGaps: true,
              };
            } else {
              return {
                ...baseConfig,
                type: 'bar' as const,
              };
            }
          }),
        };
      }
    }
  }, [groupedData, selectedIssueTypes, aggregate, availableIssueTypes, chartType, chartPeriods, formatPeriodLabel, aggregateLabel]);
}

