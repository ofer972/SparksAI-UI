'use client';

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { ApiService } from '@/lib/api';
import { PIMetricsSummaryData } from '@/lib/config';

interface PiStatusTodayRecord {
  progress_delta_pct?: number;
  progress_delta_pct_status?: string;
  total_issues?: number;
  remaining_epics?: number;
  ideal_remaining?: number;
  [key: string]: any;
}

interface WipData {
  count_in_progress?: number;
  count_in_progress_status?: string;
  total_epics?: number;
  in_progress_percentage?: number;
  [key: string]: any;
}

interface PIMetricsSummaryResult {
  status_today?: PiStatusTodayRecord[];
  wip?: WipData;
}

interface PIMetricsSummaryViewProps {
  data: { status_today: PIMetricsSummaryData[], wip: any } | null;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void; onAIChat?: () => void; readOnly?: boolean; hideHeader?: boolean; hideCollapse?: boolean };
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

interface MetricCardProps {
  title: string;
  description: string;
  value?: string | number;
  color?: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
  footer?: string;
}

const colorClassMap: Record<NonNullable<MetricCardProps['color']>, string> = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  gray: 'text-content-secondary',
  blue: 'text-brand',
};

const MetricCard: React.FC<MetricCardProps> = ({ title, description, value, color = 'gray', footer }) => {
  return (
    <div className="flex flex-col bg-surface border border-outline rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
        <p className="text-xs text-content-secondary">{description}</p>
      </div>
      <div className={`text-3xl font-bold ${colorClassMap[color]} min-h-[48px] flex items-center`}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {footer && <p className="text-xs text-content-tertiary">{footer}</p>}
    </div>
  );
};

const formatPercent = (value?: number | null | string) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    return undefined;
  }
  return `${num.toFixed(1)}%`;
};

const getStatusColor = (status?: string): MetricCardProps['color'] => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'green') return 'green';
  if (normalized === 'yellow') return 'yellow';
  if (normalized === 'red') return 'red';
  return 'gray';
};

const PIMetricsSummaryView: React.FC<PIMetricsSummaryViewProps> = ({
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
  const statusRecord = useMemo(
    () => (Array.isArray(data?.status_today) && data!.status_today.length > 0 ? data!.status_today[0] : null),
    [data?.status_today]
  );
  const wipRecord = data?.wip ?? null;

  const epicClosurePercent = statusRecord?.progress_delta_pct ?? statusRecord?.pi_delta_pct ?? null;
  const epicClosureStatus = statusRecord?.progress_delta_pct_status ?? statusRecord?.pi_delta_pct_status ?? undefined;
  const totalIssues = statusRecord?.total_issues ?? undefined;
  const remainingEpics = statusRecord?.remaining_epics ?? undefined;
  const idealRemaining = statusRecord?.ideal_remaining ?? undefined;

  const piName = (filters?.pi as string) ?? '';
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters?.team_name as string) ?? '';
  const isGroup = (filters?.isGroup as boolean) ?? false;
  const isDashboard = componentProps?.isDashboard;
  
  console.log('[PIMetricsSummary] Current filters:', { piName, teamName, isGroup });
  
  // Look up ID from name to construct proper teamValue
  const teamValue = useMemo(() => {
    if (!teamName) {
      console.log('[PIMetricsSummary] No team name, returning null');
      return null;
    }
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      const value = group ? `group:${group.group_key}` : null;
      console.log(`[PIMetricsSummary] Looking for group "${teamName}":`, value);
      return value;
    } else {
      const team = teams.find(t => t.team_name === teamName);
      const value = team ? `team:${team.team_key}` : null;
      console.log(`[PIMetricsSummary] Looking for team "${teamName}":`, value);
      return value;
    }
  }, [teamName, isGroup, groups, teams]);

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

  const availableIssueTypes = useMemo(() => {
    if (meta && Array.isArray(meta.available_issue_types)) {
      return meta.available_issue_types as string[];
      }
    return [];
  }, [meta]);

  const handleFilterChange = useCallback(
    (key: string, value: string | number | null) => {
      setFilters?.((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setFilters]
  );

  const filterRow = (
    <ReportFiltersRow>
      <ReportFilterField label="PI">
        <select
            value={piName}
          onChange={(event) => handleFilterChange('pi', event.target.value || null)}
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand min-w-[140px]"
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
          onChange={(value, type, name) => {
            if (value === null) {
              setFilters?.((prev) => ({
                ...prev,
                team_name: null,
                isGroup: false,
              }));
            } else {
              setFilters?.((prev) => ({
                ...prev,
                team_name: name,
                isGroup: type === 'group',
              }));
            }
          }}
          placeholder="Select team or group"
          allowClear={true}
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
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }
    
    return badges;
  }, [piName, teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard 
      title="PI Metrics Summary" 
      reportId={componentProps?.reportId}
      filters={filterRow} 
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
      readOnly={componentProps?.readOnly}
      hideHeader={componentProps?.hideHeader}
      hideCollapse={componentProps?.hideCollapse}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Epic Closure"
              description="Progress delta from plan"
              value={formatPercent(epicClosurePercent)}
              color={getStatusColor(epicClosureStatus)}
              footer={
                totalIssues !== undefined && remainingEpics !== undefined && idealRemaining !== undefined
                  ? `Total issues: ${totalIssues} • Remaining epics: ${remainingEpics} • Ideal remaining: ${idealRemaining}`
                  : undefined
              }
            />

            <MetricCard
              title="Dependencies"
              description="Top dependency signals"
              value="—"
              color="blue"
              footer="View detailed dependency report for specifics"
            />

            <MetricCard
              title="Avg Epic Cycle Time"
              description="Average cycle time of epics across PIs"
              value={wipRecord?.avg_cycle_time_all_pis_days ? `${wipRecord.avg_cycle_time_all_pis_days.toFixed(1)} days` : '—'}
              color="gray"
            />

            <MetricCard
              title="PI Predictability"
              description="Predictability across the last three PIs"
              value={formatPercent(wipRecord?.avg_pi_predictability)}
              color={getStatusColor(wipRecord?.avg_pi_predictability_status)}
            />

            <MetricCard
              title="In Progress Epics"
              description="Epics currently in progress"
              value={wipRecord?.count_in_progress ?? '—'}
              color={getStatusColor(wipRecord?.count_in_progress_status)}
              footer={
                wipRecord?.in_progress_percentage !== undefined
                  ? `In progress %: ${formatPercent(wipRecord.in_progress_percentage)}`
                  : undefined
              }
            />

            <MetricCard
              title="Total Epics"
              description="Total epics tracked in this PI"
              value={wipRecord?.total_epics ?? '—'}
              color="gray"
            />

            <MetricCard
              title="Remaining Epics"
              description="Epics left to complete"
              value={statusRecord?.remaining_epics ?? '—'}
              color="yellow"
            />

            <MetricCard
              title="Ideal Remaining"
              description="Ideal remaining epics at this point"
              value={statusRecord?.ideal_remaining ?? '—'}
              color="gray"
            />
          </div>

          {loading && (
            <div className="text-sm text-content-secondary">Loading metrics...</div>
          )}
        </div>
      )}
    </ReportCard>
  );
};

export default PIMetricsSummaryView;
