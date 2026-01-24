'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
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
    (filters.groupBy as 'day' | 'week' | 'month') ?? 'month'
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
      }
      if (filters.chartType && ['line', 'bar'].includes(filters.chartType)) {
        setChartType(filters.chartType as 'line' | 'bar');
      }
    }
  }, []); // Only run once on mount

  // Auto-select all issue types on initial load only
  const hasInitializedRef = React.useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && availableIssueTypes.length > 0) {
      hasInitializedRef.current = true;
      // Only set if not already set from filters (for initial load from saved state)
      if (!filters.selectedIssueTypes || !Array.isArray(filters.selectedIssueTypes) || filters.selectedIssueTypes.length === 0) {
        const newSelected = [...availableIssueTypes];
        setSelectedIssueTypes(newSelected);
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

  const chartOptions = useTimeSeriesChart({
    groupBy,
    chartType,
    chartPeriods,
    yAxisLabel: 'Cycle Time (days)',
    selectedIssueTypesCount: selectedIssueTypes.length || availableIssueTypes.length,
    aggregate,
    valueDecimals: 1,
    isDark,
  });

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
    const date = new Date(period);

    if (groupByType === 'day') {
      const dateStr = date.toISOString().split('T')[0];
      return { start: dateStr, end: dateStr };
    } else if (groupByType === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    } else {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      };
    }
  }, []);

  useEffect(() => {
    if (!chartData || !chartPeriods) return;

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

          if (aggregate) {
            clickedIssueTypes = [...availableIssueTypes];
          } else {
            if (chartType === 'bar' && selectedIssueTypes.length > 1) {
              const clickedDataset = chartData.datasets[datasetIndex];
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
  }, [chartData, chartPeriods, groupBy, aggregate, selectedIssueTypes, availableIssueTypes, chartType, calculatePeriodDates]);

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
          chartData={chartData}
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

