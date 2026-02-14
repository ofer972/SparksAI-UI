'use client';

import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/api';
import KPICard from '@/components/KPICard';
import PRListReportDialog from './PRListReportDialog';
import KPIDashboard from '@/components/KPIDashboard';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import TeamGroupFilter from '@/components/filters/TeamGroupSelect';
import ReportFiltersRow from '@/components/reporting/ReportFiltersRow';
import ReportFilterField from '@/components/reporting/ReportFilterField';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
  improved: boolean; // true = good trend, false = bad trend (not used for "flat")
}

interface MetricResponse {
  metric_id: string;
  label: string;
  value: string;
  tier_status: 'elite' | 'high' | 'medium' | 'low';
  metric_type?: 'dora' | 'sprint' | 'pi';
  description: string;
  tooltip: string;
  trend?: Trend;
  action?: {
    type: 'table' | 'report';
    target_id?: string;
    report_ids?: string[];
    params?: {
      metric?: string;
      [key: string]: any;
    };
  };
}

export default function CoreKPIsTab() {
  const { preferences } = useUser();
  const { groups, teams } = useTeamsGroups();
  const [metrics, setMetrics] = useState<MetricResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    metric: string;
    title: string;
  } | null>(null);
  const [selectedKPIDashboard, setSelectedKPIDashboard] = useState<{
    title: string;
    value: string;
    tierStatus: 'elite' | 'high' | 'medium' | 'low';
    description: string;
    trend?: Trend;
    reportIds: string[];
    initialFilters?: Record<string, any>;
  } | null>(null);

  // Initialize with user's default team from profile
  useEffect(() => {
    if (preferences?.default_team_or_group && preferences.default_type) {
      let teamGroupName = preferences.default_team_or_group;
      // Clean if has old format
      if (teamGroupName.includes(':')) {
        teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
      }
      setTeamName(teamGroupName);
      setIsGroup(preferences.default_type === 'group');
    }
  }, [preferences]);

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

  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    setTeamName(name || null);
    setIsGroup(type === 'group');
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (teamName) {
          params.append('team_name', teamName);
          params.append('isGroup', isGroup.toString());
        }

        const url = `/api/v1/github-service/KPIs${params.toString() ? '?' + params.toString() : ''}`;
        const response = await authFetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = await response.json();
        setMetrics(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(errorMessage);
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [teamName, isGroup]);

  const handleKPIClick = (metric: MetricResponse) => {
    if (!metric.action) return;

    if (metric.action.type === 'table') {
      // Table type - open PR list dialog
      if (metric.action.params?.metric) {
        setSelectedMetric({
          metric: metric.action.params.metric,
          title: metric.label,
        });
      }
    } else if (metric.action.type === 'report') {
      // Report type - open KPI dashboard
      if (metric.action.report_ids && metric.action.report_ids.length > 0) {
        setSelectedKPIDashboard({
          title: metric.label,
          value: metric.value,
          tierStatus: metric.tier_status,
          description: metric.description,
          trend: metric.trend,
          reportIds: metric.action.report_ids,
          initialFilters: metric.action.params || {},
        });
      }
    }
  };

  const handleCloseDialog = () => {
    setSelectedMetric(null);
  };

  const handleCloseKPIDashboard = () => {
    setSelectedKPIDashboard(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">No metrics available.</div>
      </div>
    );
  }

  // If KPI dashboard is selected, show it instead of the KPI cards
  if (selectedKPIDashboard) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <KPIDashboard
          title={selectedKPIDashboard.title}
          value={selectedKPIDashboard.value}
          tierStatus={selectedKPIDashboard.tierStatus}
          description={selectedKPIDashboard.description}
          trend={selectedKPIDashboard.trend}
          reportIds={selectedKPIDashboard.reportIds}
          initialFilters={selectedKPIDashboard.initialFilters}
          onBack={handleCloseKPIDashboard}
        />
      </div>
    );
  }

  // Generate filter badges
  const filterBadges = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = [];
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
      });
    }
    return badges;
  }, [teamName, isGroup]);

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Team Filter */}
        <div className="px-4 pt-2 pb-2 border-b border-outline">
          <ReportFiltersRow>
            <ReportFilterField label="Team/Group">
              <TeamGroupFilter
                value={teamValue}
                onChange={handleTeamGroupChange}
                placeholder="Select team or group"
                allowClear={true}
                size="xs"
              />
            </ReportFilterField>
          </ReportFiltersRow>
          {/* Filter Badges */}
          {filterBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filterBadges.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-surface-elevated border border-outline text-content-secondary"
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-row gap-2 pb-2 pt-2 px-4">
            {metrics.map((metric) => (
              <KPICard
                key={metric.metric_id}
                metricId={metric.metric_id}
                label={metric.label}
                value={metric.value}
                tierStatus={metric.tier_status}
                metricType={metric.metric_type || null}
                description={metric.description}
                tooltip={metric.tooltip}
                trend={metric.trend}
                onClick={() => handleKPIClick(metric)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PR List Report Dialog */}
      {selectedMetric && (
        <PRListReportDialog
          isOpen={true}
          onClose={handleCloseDialog}
          metric={selectedMetric.metric}
          title={selectedMetric.title}
          team_name={teamName ?? undefined}
          isGroup={isGroup}
        />
      )}
    </>
  );
}

