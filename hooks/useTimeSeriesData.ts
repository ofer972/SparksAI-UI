import { useMemo, useCallback } from 'react';

export interface TimeSeriesDataPoint {
  snapshot_day: string;
  issuetype: string;
  [valueField: string]: string | number; // Dynamic value field (work_in_progress, cycle_time, etc.)
}

export interface GroupedDataPoint {
  period: string;
  issuetype: string;
  value: number;
}

export interface UseTimeSeriesDataParams {
  data: TimeSeriesDataPoint[];
  groupBy: 'day' | 'week' | 'month';
  selectedIssueTypes: string[];
  aggregate: boolean;
  valueField: string; // 'work_in_progress' | 'avg_cycle_time' | etc.
  calculationType?: 'average' | 'weighted'; // Default: 'average'
  countField?: string; // Required for 'weighted' calculation (e.g., 'issue_count')
}

export interface UseTimeSeriesDataResult {
  filteredData: TimeSeriesDataPoint[];
  groupedData: GroupedDataPoint[];
  chartPeriods: string[];
  formatPeriodLabel: (period: string) => string;
}

export function useTimeSeriesData({
  data,
  groupBy,
  selectedIssueTypes,
  aggregate,
  valueField,
  calculationType = 'average',
  countField,
}: UseTimeSeriesDataParams): UseTimeSeriesDataResult {
  const filteredData = useMemo(() => {
    if (selectedIssueTypes.length === 0) return data;
    return data.filter(d => selectedIssueTypes.includes(d.issuetype));
  }, [data, selectedIssueTypes]);

  const groupByKey = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    if (groupBy === 'day') {
      return dateStr;
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return dateStr;
  }, [groupBy]);

  const groupedData = useMemo(() => {
    if (!filteredData.length) return [];

    if (calculationType === 'weighted' && countField) {
      // Weighted average calculation (for cycle time)
      if (aggregate) {
        // When aggregating, combine all issue types per period
        const grouped = new Map<string, Array<{ value: number; count: number }>>();

        filteredData.forEach(point => {
          const periodKey = groupByKey(point.snapshot_day);
          const value = point[valueField] as number;
          const count = point[countField] as number;

          if (!grouped.has(periodKey)) {
            grouped.set(periodKey, []);
          }
          grouped.get(periodKey)!.push({ value, count });
        });

        const result: GroupedDataPoint[] = [];
        grouped.forEach((dataPoints, period) => {
          if (groupBy === 'day') {
            // For day, calculate weighted average across all issue types
            const totalValueCount = dataPoints.reduce((sum, dp) => sum + dp.value * dp.count, 0);
            const totalCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
            const weightedAvg = totalCount > 0 ? totalValueCount / totalCount : 0;
            result.push({
              period,
              issuetype: 'Aggregated',
              value: Math.round(weightedAvg * 100) / 100,
            });
          } else {
            // Weighted average: (sum of value × count) / (sum of count)
            const totalValueCount = dataPoints.reduce((sum, dp) => sum + dp.value * dp.count, 0);
            const totalCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
            const weightedAvg = totalCount > 0 ? totalValueCount / totalCount : 0;
            result.push({
              period,
              issuetype: 'Aggregated',
              value: Math.round(weightedAvg * 100) / 100,
            });
          }
        });

        return result;
      } else {
        // When not aggregating, keep issue types separate
        const grouped = new Map<string, Map<string, Array<{ value: number; count: number }>>>();

        filteredData.forEach(point => {
          const periodKey = groupByKey(point.snapshot_day);
          const value = point[valueField] as number;
          const count = point[countField] as number;

          if (!grouped.has(periodKey)) {
            grouped.set(periodKey, new Map());
          }
          const periodData = grouped.get(periodKey)!;
          if (!periodData.has(point.issuetype)) {
            periodData.set(point.issuetype, []);
          }
          periodData.get(point.issuetype)!.push({ value, count });
        });

        const result: GroupedDataPoint[] = [];
        grouped.forEach((typeData, period) => {
          typeData.forEach((dataPoints, type) => {
            if (groupBy === 'day') {
              // For day, use the value as-is (already averaged for that day)
              result.push({
                period,
                issuetype: type,
                value: Math.round(dataPoints[0].value * 100) / 100,
              });
            } else {
              // Weighted average: (sum of value × count) / (sum of count)
              const totalValueCount = dataPoints.reduce((sum, dp) => sum + dp.value * dp.count, 0);
              const totalCount = dataPoints.reduce((sum, dp) => sum + dp.count, 0);
              const weightedAvg = totalCount > 0 ? totalValueCount / totalCount : 0;
              result.push({
                period,
                issuetype: type,
                value: Math.round(weightedAvg * 100) / 100,
              });
            }
          });
        });

        return result;
      }
    } else {
      // Simple average calculation (for WIP) - aggregation happens in useTimeSeriesChartData
      const grouped = new Map<string, Map<string, number[]>>();

      filteredData.forEach(point => {
        const periodKey = groupByKey(point.snapshot_day);
        const value = point[valueField] as number;

        if (!grouped.has(periodKey)) {
          grouped.set(periodKey, new Map());
        }
        const periodData = grouped.get(periodKey)!;
        if (!periodData.has(point.issuetype)) {
          periodData.set(point.issuetype, []);
        }
        periodData.get(point.issuetype)!.push(value);
      });

      const result: GroupedDataPoint[] = [];
      grouped.forEach((typeData, period) => {
        typeData.forEach((values, type) => {
          const avg = groupBy === 'day'
            ? values[0]
            : values.reduce((sum, v) => sum + v, 0) / values.length;
          result.push({
            period,
            issuetype: type,
            value: Math.round(avg * 100) / 100,
          });
        });
      });

      return result;
    }
  }, [filteredData, groupBy, groupByKey, valueField, calculationType, countField, aggregate]);

  const chartPeriods = useMemo(() => {
    if (!groupedData.length) return [];
    return Array.from(new Set(groupedData.map(d => d.period)))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [groupedData]);

  const formatPeriodLabel = useCallback((period: string): string => {
    const d = new Date(period);
    if (groupBy === 'day') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'week') {
      const weekEnd = new Date(d);
      weekEnd.setDate(d.getDate() + 6);
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (groupBy === 'month') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return period;
  }, [groupBy]);

  return {
    filteredData,
    groupedData,
    chartPeriods,
    formatPeriodLabel,
  };
}

