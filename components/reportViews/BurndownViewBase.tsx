'use client';

import React, { useMemo, useCallback, useState, ReactNode } from 'react';
import BurndownChart from '../BurndownChart';
import type { BurndownDataPoint } from '@/lib/api';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { ApiService } from '@/lib/api';
import type { BurndownIssue } from '@/lib/config';
import IssuesDialog from './IssuesDialog';
import DataTable, { Column } from '../DataTable';
import { API_CONFIG } from '@/lib/config';

export type FilterType = 'pi' | 'team' | 'issueType' | 'other';

export interface FilterItem {
  type: FilterType;
  component: ReactNode;
}

export interface BurndownViewBaseProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  // Configuration
  title: string;
  customFilters: FilterItem[]; // Array of filter items with type and component
  filterBadges: Array<{ label: string; value: string; filterKey: string; isPinned: boolean }>;
  chartTitle?: string;
  dateDisplay?: ReactNode; // Custom date display component
  onChartClick: (clickData: { date: string; metricType: string; dataIndex: number }) => void;
  fetchIssuesFunctionFactory: (selectedDate: string, selectedMetricType: string) => () => Promise<{ success: boolean; data?: { issues: BurndownIssue[] }; message?: string }>;
}

const BurndownViewBase: React.FC<BurndownViewBaseProps> = ({
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
  title,
  customFilters,
  filterBadges,
  chartTitle,
  dateDisplay,
  onChartClick,
  fetchIssuesFunctionFactory,
}) => {
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMetricType, setSelectedMetricType] = useState<string | null>(null);

  // Look up ID from name to construct proper teamValue
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

  const handleTeamGroupChange = useCallback(
    (value: string | null, type: 'group' | 'team', name: string) => {
      if (value === null) {
        setFilters((prev) => ({
          ...prev,
          team_name: null,
          isGroup: false,
        }));
      } else {
        setFilters((prev) => ({
          ...prev,
          team_name: name,
          isGroup: type === 'group',
        }));
      }
    },
    [setFilters]
  );

  // Team/Group filter component
  const teamGroupFilter: FilterItem = {
    type: 'team',
    component: (
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>
    ),
  };

  // Sort filters: PI → team → issueType → other
  const sortedFilters = useMemo(() => {
    const hasPI = customFilters.some(f => f.type === 'pi');
    const hasTeam = customFilters.some(f => f.type === 'team');
    
    const filters = [...customFilters];
    if (!hasTeam) {
      filters.push(teamGroupFilter);
    }

    return filters.sort((a, b) => {
      const getOrder = (type: FilterType): number => {
        if (type === 'pi') return 0;
        if (type === 'team') return hasPI ? 1 : 0;
        if (type === 'issueType') return hasPI ? 2 : 1;
        return 999;
      };
      return getOrder(a.type) - getOrder(b.type);
    });
  }, [customFilters, teamGroupFilter]);

  // Format metric type for display
  const formatMetricType = (metricType: string): string => {
    const labels: Record<string, string> = {
      'actual_remaining': 'Actual Remaining',
      'total_scope': 'Total Scope',
      'wip_in_progress': 'Work In Progress',
      'issues_completed': 'Issues Completed',
      'issues_removed': 'Issues Removed',
    };
    return labels[metricType] || metricType;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Dialog title
  const dialogTitle = useMemo(() => {
    if (!selectedDate || !selectedMetricType) return 'Issues';
    return `${formatMetricType(selectedMetricType)} - ${formatDate(selectedDate)}`;
  }, [selectedDate, selectedMetricType]);

  // Columns for burndown issues
  const burndownIssueColumns: Column<BurndownIssue>[] = useMemo(() => [
    {
      key: 'issue_key',
      label: 'ISSUE KEY',
      width: '12%',
    },
    {
      key: 'summary',
      label: 'SUMMARY',
      align: 'left',
      maxLength: 80,
    },
    {
      key: 'team_name',
      label: 'TEAM',
      width: '15%',
    },
    {
      key: 'metric_category',
      label: 'CATEGORY',
      width: '12%',
    },
  ], []);

  // Enhanced chart click handler that opens dialog
  const handleChartClickWithDialog = useCallback((clickData: { date: string; metricType: string; dataIndex: number }) => {
    setSelectedDate(clickData.date);
    setSelectedMetricType(clickData.metricType);
    setIsDialogOpen(true);
    onChartClick(clickData);
  }, [onChartClick]);

  // Create fetch function with current selectedDate and selectedMetricType
  const fetchIssuesFunction = useMemo(() => {
    if (!selectedDate || !selectedMetricType) {
      return async () => ({ success: false, message: 'Missing required parameters' });
    }
    return fetchIssuesFunctionFactory(selectedDate, selectedMetricType);
  }, [selectedDate, selectedMetricType, fetchIssuesFunctionFactory]);

  const burndownData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const filtersContent = (
    <ReportFiltersRow>
      {sortedFilters.map((filter, index) => (
        <React.Fragment key={index}>
          {filter.component}
        </React.Fragment>
      ))}
    </ReportFiltersRow>
  );

  return (
    <ReportCard 
      title={title} 
      reportId={componentProps?.reportId} 
      filters={filtersContent} 
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      <div className="w-full h-full flex flex-col">
        <div className="relative flex-1 min-h-[350px]">
          <BurndownChart
            data={burndownData}
            loading={loading}
            error={error}
            title={chartTitle}
            onChartClick={handleChartClickWithDialog}
          />
        </div>
        {dateDisplay}
      </div>
      
      {/* Issues Dialog */}
      <IssuesDialog<BurndownIssue>
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedDate(null);
          setSelectedMetricType(null);
        }}
        title={dialogTitle}
        columns={burndownIssueColumns}
        fetchFunction={fetchIssuesFunction}
        jiraUrl={API_CONFIG.jiraUrl}
        emptyMessage="No issues found for the selected criteria."
        rowKey={(row, index) => `${row.issue_key}-${index}`}
      />
    </ReportCard>
  );
};

export default BurndownViewBase;

