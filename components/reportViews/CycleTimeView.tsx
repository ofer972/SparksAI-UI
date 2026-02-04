'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  LineController,
  BarElement,
  BarController,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import ReportCard from '../reporting/ReportCard';
import TimeSeriesFilters from '../time-series/TimeSeriesFilters';
import TimeSeriesChartContainer from '../time-series/TimeSeriesChartContainer';
import CycleTimeIssuesDialog from './CycleTimeIssuesDialog';
import { useTimeSeriesData } from '@/hooks/useTimeSeriesData';
import { useTimeSeriesChart } from '@/hooks/useTimeSeriesChart';
import { useTimeSeriesChartData } from '@/hooks/useTimeSeriesChartData';
import { useTimeSeriesFilterBadges } from '@/hooks/useTimeSeriesFilterBadges';
import type { CycleTimeDataPoint } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  LineController,
  BarElement,
  BarController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface CycleTimeViewProps {
  data: CycleTimeDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

export default function CycleTimeView({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
  togglePin,
  pinnedFilters = [],
}: CycleTimeViewProps) {
  const { groups, teams } = useTeamsGroups();
  const months = Number(filters.months ?? 6);
  const teamName = (filters?.team_name as string) ?? null;
  const isGroup = (filters?.isGroup as boolean) ?? false;

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  // Internal filters (client-side only)
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>(() => 
    (filters.selectedIssueTypes as string[]) ?? []
  );
  const [aggregate, setAggregate] = useState<boolean>(() => 
    (filters?.aggregate as boolean) ?? false
  );
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>(() => 
    (filters.groupBy as 'day' | 'week' | 'month') ?? 'week'
  );
  const [chartType, setChartType] = useState<'line' | 'bar'>(() => 
    (filters.chartType as 'line' | 'bar') ?? 'bar'
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogPeriodStart, setDialogPeriodStart] = useState<string>('');
  const [dialogPeriodEnd, setDialogPeriodEnd] = useState<string>('');
  const [dialogIssueTypes, setDialogIssueTypes] = useState<string[]>([]);
  const chartRef = React.useRef<any>(null);

  // Look up ID from name to construct proper teamValue for TeamGroupFilter
  const teamValue = useMemo(() => {
    if (!teamName) return null;
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      return group ? `group:${group.group_key}` : null;
    } else {
      const team = teams.find(t => t.team_name === teamName);
      return team ? `team:${team.team_key}` : null;
    }
  }, [teamName, isGroup, groups, teams]);

  const availableIssueTypes = useMemo(() => {
    if (meta?.available_issue_types && Array.isArray(meta.available_issue_types) && meta.available_issue_types.length > 0) {
      return [...meta.available_issue_types].sort();
    }
    const types = Array.from(new Set(data.map(d => d.issuetype))).sort();
    return types;
  }, [meta?.available_issue_types, data]);

  // Sync internal filters from props only on mount (when loaded from saved state)
  const hasSyncedRef = React.useRef(false);
  useEffect(() => {
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      // Only sync on initial mount from saved filters
      if (filters.selectedIssueTypes && Array.isArray(filters.selectedIssueTypes)) {
        setSelectedIssueTypes(filters.selectedIssueTypes);
      }
      if (typeof filters.aggregate === 'boolean') {
        setAggregate(filters.aggregate);
      }
      if (filters.groupBy && ['day', 'week', 'month'].includes(filters.groupBy)) {
        setGroupBy(filters.groupBy as 'day' | 'week' | 'month');
      } else {
        setGroupBy('week'); // Default to week if not set
      }
      if (filters.chartType && ['line', 'bar'].includes(filters.chartType)) {
        setChartType(filters.chartType as 'line' | 'bar');
      }
    }
  }, []); // Only run once on mount

  // Auto-select Bug and Story issue types on initial load only
  const hasInitializedRef = React.useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && availableIssueTypes.length > 0) {
      hasInitializedRef.current = true;
      // Only set if not already set from filters (for initial load from saved state)
      if (!filters.selectedIssueTypes || !Array.isArray(filters.selectedIssueTypes) || filters.selectedIssueTypes.length === 0) {
        const defaultTypes = availableIssueTypes.filter(type => type === 'Bug' || type === 'Story');
        setSelectedIssueTypes(defaultTypes);
        // Not calling setFilters to avoid triggering backend refetch
      } else {
        // Use existing from filters (for initial load from saved state)
        setSelectedIssueTypes(filters.selectedIssueTypes);
      }
    }
  }, [availableIssueTypes, filters.selectedIssueTypes]);

  const { groupedData, chartPeriods, formatPeriodLabel } = useTimeSeriesData({
    data,
    groupBy,
    selectedIssueTypes,
    aggregate,
    valueField: 'avg_cycle_time',
    calculationType: 'weighted',
    countField: 'issue_count',
  });

  // Calculate overall weighted average cycle time
  const overallAverage = useMemo(() => {
    if (!data || data.length === 0) return 0;
    
    // Filter by selected issue types if any are selected
    const filteredData = selectedIssueTypes.length > 0
      ? data.filter(d => selectedIssueTypes.includes(d.issuetype))
      : data;
    
    if (filteredData.length === 0) return 0;
    
    // Calculate weighted average: (sum of avg_cycle_time × issue_count) / (sum of issue_count)
    const totalValueCount = filteredData.reduce((sum, point) => {
      const value = point.avg_cycle_time as number;
      const count = point.issue_count as number;
      return sum + (value * count);
    }, 0);
    
    const totalCount = filteredData.reduce((sum, point) => {
      return sum + (point.issue_count as number);
    }, 0);
    
    return totalCount > 0 ? totalValueCount / totalCount : 0;
  }, [data, selectedIssueTypes]);

  const chartData = useTimeSeriesChartData({
    groupedData,
    chartPeriods,
    selectedIssueTypes,
    availableIssueTypes,
    aggregate,
    chartType,
    formatPeriodLabel,
    aggregateLabel: 'Aggregated Cycle Time',
  });

  // Add overall average line to chart data
  const chartDataWithAverage = useMemo(() => {
    if (!chartData || !chartPeriods || chartPeriods.length === 0) return chartData;
    
    const averageValue = Math.round(overallAverage * 10) / 10; // Round to 1 decimal place
    const averageData = chartPeriods.map(() => averageValue);
    
    // Find the last non-zero index from existing datasets
    const existingDatasets = chartData.datasets || [];
    let lastIndex = averageData.length - 1;
    if (existingDatasets.length > 0 && existingDatasets[0].data) {
      const firstDatasetData = existingDatasets[0].data as (number | null)[];
      for (let i = firstDatasetData.length - 1; i >= 0; i--) {
        if (firstDatasetData[i] !== null && firstDatasetData[i] !== 0) {
          lastIndex = i;
          break;
        }
      }
    }
    
    // Use white/light color for dark mode, black for light mode
    const lineColor = isDark ? '#ffffff' : '#000000';
    
    const averageDataset = {
      type: 'line' as const,
      label: `Average Cycle Time (${averageValue.toFixed(1)}d)`,
      data: averageData.slice(0, lastIndex + 1),
      borderColor: lineColor,
      backgroundColor: lineColor,
      borderWidth: 2,
      borderDash: [5, 5], // Dashed line pattern
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHoverBorderWidth: 0,
      fill: false,
      tension: 0,
      order: -1, // Draw line on top (lower order = higher z-index)
      yAxisID: 'y',
      z: 10, // Additional z-index to ensure it's on top
      datalabels: {
        display: false, // Hide numbers on the line - only show in legend
      },
    } as any;
    
    return {
      ...chartData,
      datasets: [...chartData.datasets, averageDataset],
    };
  }, [chartData, chartPeriods, overallAverage, isDark]);

  const baseChartOptions = useTimeSeriesChart({
    groupBy,
    chartType,
    chartPeriods,
    yAxisLabel: 'Cycle Time (days)',
    selectedIssueTypesCount: selectedIssueTypes.length || availableIssueTypes.length,
    aggregate,
    valueDecimals: 1,
    isDark,
  });

  // Extend chart options to hide data labels on average line (number only in legend)
  const chartOptions = useMemo(() => {
    return {
      ...baseChartOptions,
      plugins: {
        ...baseChartOptions.plugins,
        datalabels: {
          ...baseChartOptions.plugins?.datalabels,
          // Hide data labels for average line dataset - number only appears in legend
          filter: (context: any) => {
            if (context.dataset.label && context.dataset.label.includes('Average Cycle Time')) {
              return false;
            }
            // For other datasets, use the default display setting
            return baseChartOptions.plugins?.datalabels?.display ?? true;
          },
        },
      },
    };
  }, [baseChartOptions]);

  const handleTimePeriodChange = useCallback((months: number) => {
    setFilters?.(prev => ({ ...prev, months }));
  }, [setFilters]);

  const handleTeamChange = useCallback((value: string | null, type: 'group' | 'team', name: string) => {
    if (value === null) {
      setFilters?.(prev => ({
        ...prev,
        team_name: null,
        isGroup: false,
      }));
    } else {
      setFilters?.(prev => ({
        ...prev,
        team_name: name,  // Use 'name', not 'value'
        isGroup: type === 'group',
      }));
    }
  }, [setFilters]);

  // NOTE: Internal filters (selectedIssueTypes, aggregate, groupBy, chartType) are kept in local state only
  // and are NOT saved/restored with the dashboard. Calling setFilters for these filters causes unnecessary
  // backend API calls since these are client-side-only filters. This prevents those unnecessary calls.
  // To enable saving these filters, ReportRenderer/buildFilterCacheKey needs to be modified to exclude
  // internal filters from cache key calculation while still saving them.
  const handleIssueTypesChange = useCallback((types: string[]) => {
    setSelectedIssueTypes(types);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handleAggregateChange = useCallback((checked: boolean) => {
    setAggregate(checked);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handleGroupByChange = useCallback((value: 'day' | 'week' | 'month') => {
    setGroupBy(value);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const handleChartTypeChange = useCallback((value: 'line' | 'bar') => {
    setChartType(value);
    // Not calling setFilters to avoid triggering backend refetch
  }, []);

  const filterBadges = useTimeSeriesFilterBadges({
    filters: {
      months,
      team_name: teamName,
      isGroup,
    },
    selectedIssueTypes,
    aggregate,
    groupBy,
    chartType,
  });

  // Convert filter badges to match ReportCard format
  // Map badge labels to actual filter keys used in the filters object
  const reportFilterBadges = useMemo(() => {
    const filterKeyMap: Record<string, string> = {
      'Time Period': 'months',
      'Team': 'team_name',
      'Group': 'team_name', // Same key for team/group
      'Issue Type': 'selectedIssueTypes',
      'Issue Types': 'selectedIssueTypes',
      'View': 'aggregate',
      'Group By': 'groupBy',
      'Chart Type': 'chartType',
    };

    return filterBadges.map(badge => {
      const filterKey = filterKeyMap[badge.label] || badge.label.toLowerCase().replace(/\s+/g, '_');
      return {
        label: badge.label,
        value: badge.value,
        filterKey,
        isPinned: pinnedFilters.includes(filterKey),
      };
    });
  }, [filterBadges, pinnedFilters]);

  const calculatePeriodDates = useCallback((period: string, groupByType: 'day' | 'week' | 'month'): { start: string; end: string } => {
    if (groupByType === 'day') {
      const date = new Date(period);
      const dateStr = date.toISOString().split('T')[0];
      return { start: dateStr, end: dateStr };
    } else if (groupByType === 'week') {
      const date = new Date(period);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    } else {
      // For month mode, period is already in "YYYY-MM-01" format
      // Parse directly from string to avoid timezone issues
      const [year, month] = period.split('-').map(Number);
      // Format dates directly without timezone conversion
      const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;
      // Get last day of month: new Date(year, month, 0) gives last day of (month-1)
      const lastDay = new Date(year, month, 0).getDate();
      const monthEndStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start: monthStartStr,
        end: monthEndStr,
      };
    }
  }, []);

  useEffect(() => {
    if (!chartDataWithAverage || !chartPeriods) return;

    let canvas: HTMLCanvasElement | null = null;
    let cleanup: (() => void) | null = null;

    // Wait a bit for chart to render
    const timeoutId = setTimeout(() => {
      const chart = chartRef.current;
      if (!chart) {
        return;
      }

      canvas = chart.canvas;
      if (!canvas) {
        return;
      }

      const handleClick = (event: MouseEvent) => {
        try {
          const elements = chart.getElementsAtEventForMode(
            event,
            'nearest',
            { intersect: true },
            false
          );

          if (!elements || elements.length === 0) return;

          const clickedElement = elements[0];
          const periodIndex = clickedElement.index;
          const datasetIndex = clickedElement.datasetIndex;

          if (periodIndex < 0 || periodIndex >= chartPeriods.length) return;

          const period = chartPeriods[periodIndex];
          const { start, end } = calculatePeriodDates(period, groupBy);

          let clickedIssueTypes: string[] = [];

          // Skip clicks on the average line (it's the last dataset)
          const clickedDataset = chartDataWithAverage?.datasets?.[datasetIndex];
          if (clickedDataset?.label?.includes('Average Cycle Time')) {
            return; // Don't open dialog for average line clicks
          }

          if (aggregate) {
            clickedIssueTypes = [...availableIssueTypes];
          } else {
            if (chartType === 'bar' && selectedIssueTypes.length > 1) {
              const datasetLabel = clickedDataset?.label;
              if (datasetLabel && selectedIssueTypes.includes(datasetLabel)) {
                clickedIssueTypes = [datasetLabel];
              } else {
                clickedIssueTypes = selectedIssueTypes.length > 0 ? selectedIssueTypes : availableIssueTypes;
              }
            } else {
              clickedIssueTypes = selectedIssueTypes.length > 0 ? selectedIssueTypes : availableIssueTypes;
            }
          }

          if (clickedIssueTypes.length > 0) {
            setDialogPeriodStart(start);
            setDialogPeriodEnd(end);
            setDialogIssueTypes(clickedIssueTypes);
            setIsDialogOpen(true);
          }
        } catch (error) {
          console.error('Error handling chart click:', error);
        }
      };

      canvas.addEventListener('click', handleClick);
      cleanup = () => {
        canvas?.removeEventListener('click', handleClick);
      };
    }, 100); // Small delay to ensure chart is rendered

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) {
        cleanup();
      }
    };
  }, [chartDataWithAverage, chartPeriods, groupBy, aggregate, selectedIssueTypes, availableIssueTypes, chartType, calculatePeriodDates]);

  return (
    <>
      <ReportCard
        title="Cycle Time"
        reportId={componentProps?.reportId}
        filters={
          <TimeSeriesFilters
            months={months}
            teamName={teamValue}
            onMonthsChange={handleTimePeriodChange}
            onTeamChange={handleTeamChange}
            selectedIssueTypes={selectedIssueTypes}
            availableIssueTypes={availableIssueTypes}
            onIssueTypesChange={handleIssueTypesChange}
            aggregate={aggregate}
            onAggregateChange={handleAggregateChange}
            groupBy={groupBy}
            onGroupByChange={handleGroupByChange}
            chartType={chartType}
            onChartTypeChange={handleChartTypeChange}
          />
        }
        filterBadges={reportFilterBadges}
        onTogglePin={togglePin}
        onRefresh={refresh}
        onClose={componentProps?.onClose}
        onAIChat={componentProps?.onAIChat}
        readOnly={componentProps?.readOnly}
        hideHeader={componentProps?.hideHeader}
        hideCollapse={componentProps?.hideCollapse}
        defaultCollapsed={false}
      >
        <TimeSeriesChartContainer
          loading={loading}
          error={error}
          chartData={chartDataWithAverage}
          chartType={chartType}
          chartOptions={chartOptions}
          loadingMessage="Loading cycle time data..."
          chartRef={chartRef}
        />
      </ReportCard>
      <CycleTimeIssuesDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        periodStart={dialogPeriodStart}
        periodEnd={dialogPeriodEnd}
        issuetypes={dialogIssueTypes}
        jiraUrl={meta?.jira_url}
        groupBy={groupBy}
        teamName={teamName}
        isGroup={isGroup}
      />
    </>
  );
}

