'use client';

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
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
  componentProps?: { isDashboard?: boolean; reportId?: string; onClose?: () => void };
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
  gray: 'text-gray-600',
  blue: 'text-blue-600',
};

const MetricCard: React.FC<MetricCardProps> = ({ title, description, value, color = 'gray', footer }) => {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <div className={`text-3xl font-bold ${colorClassMap[color]} min-h-[48px] flex items-center`}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {footer && <p className="text-xs text-gray-500">{footer}</p>}
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
  componentProps,
}) => {
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
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

  const piName = (filters.pi as string) ?? '';
  const project = (filters.project as string) ?? '';
  const issueType = (filters.issue_type as string) ?? 'Epic';
  const teamName = (filters.team_name as string) ?? '';
  const gracePeriod = Number(filters.plan_grace_period ?? 5);
  const isDashboard = componentProps?.isDashboard;

  useEffect(() => {
    const apiService = new ApiService();
    const fetchPIs = async () => {
      try {
        const pis = await apiService.getPIs();
        if (pis?.pis?.length) {
          setAvailablePIs(pis.pis.map((pi: any) => pi.pi_name));
        }
      } catch (e) {
        console.error('Error fetching PIs:', e);
      }
    };
    if (!isDashboard) {
      fetchPIs();
    }
  }, [isDashboard]);

  const handleFilterChange = useCallback(
    (key: string, value: string | number | null) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setFilters]
  );

  const filterRow = (
    <ReportFiltersRow>
      <ReportFilterField label="PI">
        {isDashboard ? (
          <span className="text-sm text-gray-700">{piName}</span>
        ) : (
          <input
            type="text"
            value={piName}
            onChange={(event) => handleFilterChange('pi', event.target.value.trim() || null)}
            placeholder="e.g. Q32025"
            list="pi-names-list"
            className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
        {!isDashboard && availablePIs.length > 0 && (
          <datalist id="pi-names-list">
            {availablePIs.map((pi) => (
              <option key={pi} value={pi} />
            ))}
          </datalist>
        )}
      </ReportFilterField>

      <ReportFilterField label="Project">
        <input
          type="text"
          value={project}
          onChange={(event) => handleFilterChange('project', event.target.value.trim() || null)}
          placeholder="Project key"
          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>

      <ReportFilterField label="Issue Type">
        <input
          type="text"
          value={issueType}
          onChange={(event) => handleFilterChange('issue_type', event.target.value.trim() || 'Epic')}
          placeholder="Epic"
          className="w-32 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>

      <ReportFilterField label="Team">
        <span className="text-sm text-gray-700">{teamName || 'All Teams'}</span>
      </ReportFilterField>

      <ReportFilterField label="Grace Period (days)">
        <input
          type="number"
          min={0}
          value={gracePeriod}
          onChange={(event) => handleFilterChange('plan_grace_period', Number(event.target.value) || 5)}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  return (
    <ReportCard 
      title="PI Metrics Summary" 
      reportId={componentProps?.reportId}
      filters={filterRow} 
      onRefresh={refresh}
      onClose={componentProps?.onClose}
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
            <div className="text-sm text-gray-600">Loading metrics...</div>
          )}
        </div>
      )}
    </ReportCard>
  );
};

export default PIMetricsSummaryView;
