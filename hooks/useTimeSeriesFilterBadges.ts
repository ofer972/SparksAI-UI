import { useMemo } from 'react';

const timePeriodOptions = [
  { value: 1, label: 'Last Month' },
  { value: 2, label: 'Last 2 Months' },
  { value: 3, label: 'Last 3 Months' },
  { value: 4, label: 'Last 4 Months' },
  { value: 6, label: 'Last 6 Months' },
  { value: 9, label: 'Last 9 Months' },
];

export interface UseTimeSeriesFilterBadgesParams {
  filters: {
    months: number;
    team_name: string | null;
    isGroup: boolean;
  };
  selectedIssueTypes: string[];
  aggregate: boolean;
  groupBy: 'day' | 'week' | 'month';
  chartType: 'line' | 'bar';
}

export function useTimeSeriesFilterBadges({
  filters,
  selectedIssueTypes,
  aggregate,
  groupBy,
  chartType,
}: UseTimeSeriesFilterBadgesParams) {
  return useMemo(() => {
    const badges: { label: string; value: string }[] = [];

    if (filters.months) {
      const option = timePeriodOptions.find(o => o.value === filters.months);
      if (option) {
        badges.push({ label: 'Time Period', value: option.label });
      }
    }

    if (filters.team_name) {
      badges.push({
        label: filters.isGroup ? 'Group' : 'Team',
        value: filters.team_name,
      });
    }

    if (selectedIssueTypes.length > 0) {
      if (selectedIssueTypes.length === 1) {
        badges.push({ label: 'Issue Type', value: selectedIssueTypes[0] });
      } else {
        badges.push({ label: 'Issue Types', value: `${selectedIssueTypes.length} selected` });
      }
    }

    if (aggregate) {
      badges.push({ label: 'View', value: 'Aggregated' });
    }

    const groupByLabels: Record<string, string> = {
      day: 'Per Day',
      week: 'Per Week',
      month: 'Per Month',
    };
    badges.push({ label: 'Group By', value: groupByLabels[groupBy] || groupBy });

    badges.push({ label: 'Chart Type', value: chartType === 'line' ? 'Line Chart' : 'Bar Chart' });

    return badges;
  }, [filters, selectedIssueTypes, aggregate, groupBy, chartType]);
}

