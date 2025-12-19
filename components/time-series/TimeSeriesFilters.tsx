'use client';

import React from 'react';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import MultiIssueTypeFilter from '../MultiIssueTypeFilter';

export interface TimeSeriesFiltersProps {
  // Backend filters
  months: number;
  teamName: string | null; // Value format: "group:ID" or "team:ID" or null
  onMonthsChange: (months: number) => void;
  onTeamChange: (value: string | null, type: 'group' | 'team', name: string) => void;

  // Client-side filters
  selectedIssueTypes: string[];
  availableIssueTypes: string[];
  onIssueTypesChange: (types: string[]) => void;
  aggregate: boolean;
  onAggregateChange: (checked: boolean) => void;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (value: 'day' | 'week' | 'month') => void;
  chartType: 'line' | 'bar';
  onChartTypeChange: (value: 'line' | 'bar') => void;
}

const timePeriodOptions = [
  { value: 1, label: 'Last Month' },
  { value: 2, label: 'Last 2 Months' },
  { value: 3, label: 'Last 3 Months' },
  { value: 4, label: 'Last 4 Months' },
  { value: 6, label: 'Last 6 Months' },
  { value: 9, label: 'Last 9 Months' },
];

export default function TimeSeriesFilters({
  months,
  teamName,
  onMonthsChange,
  onTeamChange,
  selectedIssueTypes,
  availableIssueTypes,
  onIssueTypesChange,
  aggregate,
  onAggregateChange,
  groupBy,
  onGroupByChange,
  chartType,
  onChartTypeChange,
}: TimeSeriesFiltersProps) {
  return (
    <ReportFiltersRow>
      <ReportFilterField label="Time Period">
        <select
          value={months}
          onChange={(e) => onMonthsChange(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {timePeriodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamName}
          onChange={onTeamChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Types">
        <MultiIssueTypeFilter
          selectedTypes={selectedIssueTypes}
          onTypesChange={onIssueTypesChange}
          availableTypes={availableIssueTypes}
          placeholder="Select issue types"
        />
      </ReportFilterField>

      <ReportFilterField label="Aggregate">
        <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={aggregate}
            onChange={(e) => onAggregateChange(e.target.checked)}
            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Aggregate</span>
        </label>
      </ReportFilterField>

      <ReportFilterField label="Group By">
        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as 'day' | 'week' | 'month')}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="day">Per Day</option>
          <option value="week">Per Week</option>
          <option value="month">Per Month</option>
        </select>
      </ReportFilterField>

      <ReportFilterField label="Chart Type">
        <select
          value={chartType}
          onChange={(e) => onChartTypeChange(e.target.value as 'line' | 'bar')}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="line">Line Chart</option>
          <option value="bar">Bar Chart</option>
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );
}

