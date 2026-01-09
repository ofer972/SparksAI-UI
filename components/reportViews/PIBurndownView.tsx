'use client';

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import BurndownChart from '../BurndownChart';
import type { BurndownDataPoint } from '@/lib/api';
import type {
  ReportFiltersUpdater,
} from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { getIssueTypes } from '@/lib/issueTypes';
import { ApiService } from '@/lib/api';
import type { BurndownIssue } from '@/lib/config';
import IssuesDialog from './IssuesDialog';
import DataTable, { Column } from '../DataTable';
import { API_CONFIG } from '@/lib/config';

interface PIBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void; onAIChat?: () => void };
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const PIBurndownView: React.FC<PIBurndownViewProps> = ({
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
}) => {
  const issueType = (filters.issue_type as string) ?? 'Epic';
  const project = (filters.project as string) ?? '';
  const piName = (filters.pi as string) ?? '';
  const isDashboard = componentProps?.isDashboard;
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;

  const issueTypeOptions = useMemo(() => getIssueTypes(), []);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMetricType, setSelectedMetricType] = useState<string | null>(null);
  const apiService = React.useMemo(() => new ApiService(), []);

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

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, [setFilters]);

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

  // Auto-select current PI if available and no PI is selected
  useEffect(() => {
    // Skip if still loading or no available PIs
    if (loading || availablePIs.length === 0) {
      return;
    }

    // Auto-select the first PI (most recent) if no PI is selected and we haven't auto-selected yet
    if (!piName && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handleFilterChange('pi', availablePIs[0]); // Select the first (most recent) PI
    }
  }, [availablePIs, piName, handleFilterChange, loading]);

  const filtersContent = (
    <ReportFiltersRow>
        <ReportFilterField label="PI">
        <select
          value={piName}
          onChange={(event) => handleFilterChange('pi', event.target.value || null)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">Select PI</option>
          {availablePIs.map((pi) => (
            <option key={pi} value={pi}>
              {pi}
            </option>
          ))}
        </select>
        </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <select
          value={issueType}
          onChange={(event) => handleFilterChange('issue_type', event.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {issueTypeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Project">
        <input
          type="text"
          value={project}
          onChange={(event) => handleFilterChange('project', event.target.value.trim() || null)}
          placeholder="All projects"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (piName) {
      badges.push({
        label: 'PI',
        value: piName,
        filterKey: 'pi',
        isPinned: pinnedFilters.includes('pi'),
      });
    }
    
    if (issueType) {
      badges.push({
        label: 'Issue Type',
        value: issueType,
        filterKey: 'issue_type',
        isPinned: pinnedFilters.includes('issue_type'),
      });
    }
    
    if (project) {
      badges.push({
        label: 'Project',
        value: project,
        filterKey: 'project',
        isPinned: pinnedFilters.includes('project'),
      });
    }
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }
    
    return badges;
  }, [piName, issueType, project, teamName, isGroup, pinnedFilters]);

  // Handle chart click
  const handleChartClick = useCallback((clickData: { date: string; metricType: string; dataIndex: number }) => {
    const pi = meta?.pi || piName;
    if (!pi) {
      console.warn('PI name not available in meta or filters');
      return;
    }
    
    setSelectedDate(clickData.date);
    setSelectedMetricType(clickData.metricType);
    setIsDialogOpen(true);
  }, [meta, piName]);

  // Fetch function for dialog
  const fetchPIBurndownIssues = useCallback(async () => {
    if (!selectedDate || !selectedMetricType) {
      return { success: false, message: 'Missing required parameters' };
    }

    const pi = meta?.pi || piName;
    if (!pi) {
      return { success: false, message: 'PI name not available' };
    }

    return await apiService.getPIBurndownIssues(
      selectedDate,
      pi,
      selectedMetricType,
      teamName || undefined,
      isGroup,
      issueType !== 'all' ? issueType : undefined
    );
  }, [selectedDate, selectedMetricType, meta?.pi, piName, teamName, isGroup, issueType, apiService]);

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

  return (
    <ReportCard 
      title="PI Burndown" 
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
            data={Array.isArray(data) ? data : []}
            loading={loading}
            error={error}
            title={meta?.pi ? `PI Burndown: ${meta.pi}` : undefined}
            onChartClick={handleChartClick}
          />
        </div>
        {Array.isArray(data) && data.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            <span>
              Dates of the PI: {data[0].snapshot_date} – {data[data.length - 1].snapshot_date}
            </span>
          </div>
        )}
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
        fetchFunction={fetchPIBurndownIssues}
        jiraUrl={API_CONFIG.jiraUrl}
        emptyMessage="No issues found for the selected criteria."
        rowKey={(row, index) => `${row.issue_key}-${index}`}
      />
    </ReportCard>
  );
};

export default PIBurndownView;

