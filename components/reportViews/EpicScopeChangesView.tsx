'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import MultiPIFilter from '../MultiPIFilter';
import StackedGroupedBarChart, {
  StackedGroupedBarChartData,
} from '../StackedGroupedBarChart';
import { ScopeChangesDataPoint } from '@/lib/api';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

const epicScopeColors = {
  'Epics Planned': '#0066cc',
  'Epics Added': '#800080',
  'Epics Completed': '#009900',
  'Epics Not Completed': '#ff8c00',
  'Epics Removed': '#00ffff',
};

export interface EpicScopeChangesViewProps {
  data: ScopeChangesDataPoint[];
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

type ScopeMetricKey = `${string}|${string}`;

const arraysEqual = (a: string[], b: string[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

const parseIssueKeys = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((key) => (typeof key === 'string' ? key.trim() : String(key).trim()))
      .filter((key) => key.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }
  return [];
};

const EpicScopeChangesView: React.FC<EpicScopeChangesViewProps> = ({
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
  const piNames = Array.isArray(filters.pi_names) ? filters.pi_names : [];
  const [selectedPIs, setSelectedPIs] = useState<string[]>(piNames);
  const autoSelectFirst =
    componentProps && typeof componentProps.autoSelectFirst === 'boolean'
      ? componentProps.autoSelectFirst
      : true;
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

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

  const hasAutoSelectedRef = useRef(false);

  React.useEffect(() => {
    if (!arraysEqual(piNames, selectedPIs)) {
      setSelectedPIs(piNames);
    }
  }, [piNames, selectedPIs]);

  const aggregatedData = useMemo((): StackedGroupedBarChartData[] => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const map = new Map<ScopeMetricKey, {
      quarter: string;
      metricName: string;
      value: number;
      issueKeys: Set<string>;
    }>();

    data.forEach((item) => {
      const quarter = item['Quarter Name'];
      const metricName = item['Metric Name'];
      const rawIssueKeys = item['Epic Keys'] ?? item['Issue Keys'] ?? item.epic_keys ?? item.issue_keys ?? item.epicKeys ?? item.issueKeys ?? '';
      const issueKeys = parseIssueKeys(rawIssueKeys);
      const value = Number(item.Value) || 0;
      const key: ScopeMetricKey = `${quarter}|${metricName}`;

      if (!map.has(key)) {
        map.set(key, {
          quarter,
          metricName,
          value,
          issueKeys: new Set(issueKeys),
        });
      } else {
        const existing = map.get(key)!;
        existing.value += value;
        issueKeys.forEach((issueKey) => existing.issueKeys.add(issueKey));
      }
    });

    return Array.from(map.values()).map((entry) => ({
      quarter: entry.quarter,
      stackGroup: 'aggregate',
      metricName: entry.metricName,
      value: entry.value,
      issueKeys: Array.from(entry.issueKeys),
    }));
  }, [data]);

  const handlePIsChange = useCallback(
    (values: string[]) => {
      if (arraysEqual(values, selectedPIs)) {
        return;
      }
      setSelectedPIs(values);
      setFilters((prev) => {
        const nextPiNames = values;
        const prevPiNames = Array.isArray(prev.pi_names) ? prev.pi_names : [];
        if (arraysEqual(nextPiNames, prevPiNames)) {
          return prev;
        }
        return {
          ...prev,
          pi_names: nextPiNames,
        };
      });
    },
    [selectedPIs, setFilters]
  );

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

  // Auto-select all PIs if none selected
  useEffect(() => {
    // Skip if still loading or no available PIs
    if (loading || availablePIs.length === 0) {
      return;
    }

    // Auto-select all PIs if no PI is selected and we haven't auto-selected yet
    if (piNames.length === 0 && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handlePIsChange(availablePIs); // Select ALL PIs
    }
  }, [availablePIs, piNames.length, loading, handlePIsChange]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="PI Selection">
        <MultiPIFilter
          selectedPIs={selectedPIs}
          onPIsChange={handlePIsChange}
          maxSelections={100}
          autoSelectFirst={false}
          pis={availablePIs}
        />
      </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (selectedPIs.length > 0) {
      badges.push({
        label: 'PIs',
        value: `${selectedPIs.length} selected`,
        filterKey: 'pi_names',
        isPinned: pinnedFilters.includes('pi_names'),
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
  }, [selectedPIs.length, teamName, isGroup, pinnedFilters]);

  const showChart = !loading && !error && selectedPIs.length > 0 && aggregatedData.length > 0;

  return (
    <ReportCard
      title="Epic Scope Changes"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
    >
      <div className="h-full w-full flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600">Loading scope changes...</div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && selectedPIs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select at least one PI to view scope changes.
          </div>
        )}

        {showChart && (
          <div className="w-full h-full flex-1 relative min-h-[350px]">
            <StackedGroupedBarChart
              data={aggregatedData}
              title="Epic Scope Changes"
              yAxisLabel="# of Epics"
              xAxisLabel=""
              colorScheme={epicScopeColors}
              jiraUrl={meta?.jira_url}
              loading={false}
              error={null}
            />
          </div>
        )}

        {!loading && !error && selectedPIs.length > 0 && aggregatedData.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No scope changes found for the selected quarters.
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default EpicScopeChangesView;

