'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { PIPredictabilityData } from '@/lib/config';
import DataTable, { Column, SortConfig } from '../DataTable';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import MultiPIFilter from '../MultiPIFilter';

export interface PIPredictabilityViewProps {
  data: PIPredictabilityData[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void };
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const PIPredictabilityView: React.FC<PIPredictabilityViewProps> = ({
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const columns: Column<PIPredictabilityData>[] = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const firstRow = data[0];

    if (!firstRow || typeof firstRow !== 'object') {
      return [];
    }

    const preferredOrder = [
      'pi_name',
      'team_name',
      'pi_predictability_percentage',
      'avg_cycle_time_completed_epics_days',
      'total_issues_in_scope',
      'issues_completed_within_pi_dates',
    ];

    const filteredKeys = Object.keys(firstRow).filter((key) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      return (
        label !== 'Issues In Scope Keys' &&
        !key.toLowerCase().includes('issues_in_scope_keys') &&
        label !== 'Completed Issues Keys' &&
        !key.toLowerCase().includes('completed_issues_keys')
      );
    });

    const cols = filteredKeys.map((key) => {
      let label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      if (label === 'Pi Predictability Percentage') {
        label = 'PI Predictability (%)';
      }

      if (label === 'Avg Cycle Time Completed Epics Days') {
        label = 'Avg Cycle Time Completed Epics (Days)';
      }

      const order = preferredOrder.indexOf(key);
      const isLeftAlign = key === 'pi_name' || key === 'team_name';

      return {
        key,
        label,
        align: (isLeftAlign ? 'left' : 'center') as 'left' | 'center' | 'right',
        sortable: true,
        order,
        render: (value: any) => {
          if (value === null || value === undefined) return '-';

          if (key.includes('date') && typeof value === 'string') {
            return formatDate(value);
          }

          if (
            key === 'pi_predictability_percentage' ||
            key.includes('pi_predictability_percentage')
          ) {
            const num = Math.round(Number(value));
            return (
              <span
                className={`font-semibold ${
                  num >= 80 ? 'text-green-600' : num >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {num}%
              </span>
            );
          }

          if (
            key === 'avg_cycle_time_completed_epics_days' ||
            key.includes('avg_cycle_time_completed_epics_days')
          ) {
            const num = Number(value);
            const colorClass =
              num < 5
                ? 'text-gray-900'
                : num <= 50
                ? 'text-green-600'
                : num <= 95
                ? 'text-yellow-600'
                : 'text-red-600';
            return <span className={`font-semibold ${colorClass}`}>{num.toFixed(1)}</span>;
          }

          if (key.includes('percentage') || key.includes('predictability')) {
            const num = Number(value);
            return (
              <span
                className={`font-semibold ${
                  num >= 80 ? 'text-green-600' : num >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {num}%
              </span>
            );
          }

          if (typeof value === 'number') {
            return <span className="text-gray-900">{value}</span>;
          }

          return value;
        },
      };
    });

    cols.sort((a, b) => {
      const orderA = (a as any).order >= 0 ? (a as any).order : 999;
      const orderB = (b as any).order >= 0 ? (b as any).order : 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.label.localeCompare(b.label);
    });

    return cols.map(({ order, ...col }) => col);
  }, [data, formatDate]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const handlePIsChange = useCallback(
    (values: string[]) => {
      setFilters((prev) => ({
        ...prev,
        pi_names: values,
      }));
    },
    [setFilters]
  );

  const handleTeamNameChange = useCallback(
    (value: string) => {
      setFilters((prev) => ({
        ...prev,
        team_name: value.trim() || null,
      }));
    },
    [setFilters]
  );

  const filteredData = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      Object.values(row).some((value) =>
        value !== null &&
        value !== undefined &&
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, filterText]);

  const piNames = Array.isArray(filters.pi_names) ? filters.pi_names : [];
  const { groups, teams } = useTeamsGroups();
  const teamName = (filters.team_name as string) ?? '';
  const isGroup = (filters.isGroup as boolean) ?? false;
  const isDashboard = componentProps?.isDashboard;
  
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

  const availableTeams = useMemo(() => {
    if (meta && Array.isArray(meta.available_teams)) {
      return meta.available_teams as string[];
    }
    return [];
  }, [meta]);

  const availablePIs = useMemo(() => {
    if (meta && Array.isArray(meta.available_pis)) {
      return meta.available_pis as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

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
  }, [availablePIs, piNames.length, handlePIsChange, loading]);

  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="PIs">
          <MultiPIFilter
            selectedPIs={piNames}
            onPIsChange={handlePIsChange}
          maxSelections={100}
          autoSelectFirst={false}
          pis={availablePIs}
          />
      </ReportFilterField>
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={(value, type, name) => {
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
          }}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>
      <ReportFilterField label="Search">
        <input
          type="text"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter by PI, team, or predictability..."
          className="w-56 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (piNames.length > 0) {
      badges.push({
        label: 'PIs',
        value: `${piNames.length} selected`,
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
  }, [piNames, teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard 
      title="PI Predictability"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
    >
      {loading && (
        <div className="flex-1 flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-gray-600">Loading PI predictability data...</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 h-64">
          {error}
        </div>
      )}

      {!loading && !error && (
      <DataTable<PIPredictabilityData>
        data={filteredData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
          loading={false}
          error={undefined}
          emptyMessage="No data found matching the filter criteria."
        rowKey={(row, index) => `${row.pi_name || 'pi'}-${row.team_name || 'team'}-${index}`}
        striped
        hoverable
      />
      )}
    </ReportCard>
  );
};

export default PIPredictabilityView;

