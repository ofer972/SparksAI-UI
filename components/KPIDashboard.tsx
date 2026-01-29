'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReportPanel from '@/components/ReportPanel';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
  improved: boolean;
}

interface MetricResponse {
  metric_id: string;
  label: string;
  value: string;
  tier_status: 'elite' | 'high' | 'medium' | 'low';
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

export interface KPIDashboardProps {
  title: string;
  value: string;
  tierStatus?: 'elite' | 'high' | 'medium' | 'low';
  description?: string;
  trend?: Trend;
  reportIds: string[];
  initialFilters?: Record<string, any>;
  metric?: MetricResponse;
  onBack: () => void;
}

// DORA tier colors - same as KPICard
const tierColors = {
  elite: {
    valueText: 'text-green-600',
    badge: {
      background: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
    },
  },
  high: {
    valueText: 'text-blue-600',
    badge: {
      background: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
  },
  medium: {
    valueText: 'text-yellow-600',
    badge: {
      background: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
    },
  },
  low: {
    valueText: 'text-red-600',
    badge: {
      background: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
    },
  },
};

export default function KPIDashboard({
  title,
  value,
  tierStatus = 'low',
  description,
  trend,
  reportIds,
  initialFilters = {},
  metric,
  onBack,
}: KPIDashboardProps) {
  // Track each report's current filters
  const [reportFiltersState, setReportFiltersState] = useState<Record<string, Record<string, any>>>({});

  // Handler for when a report's filters change
  const handleReportFiltersChange = useCallback((reportId: string, index: number, filters: Record<string, any>) => {
    const key = `${reportId}-0-${index}`;
    setReportFiltersState(prev => ({
      ...prev,
      [key]: filters
    }));
  }, []);

  // Listen for data collection requests (for AI chat)
  useEffect(() => {
    const handleCollectData = () => {
      // Build the dashboard data structure
      const dashboardData = {
        layoutConfig: {
          rows: [{
            id: `kpi-row-${title.replace(/\s+/g, '-').toLowerCase()}`,
            reportIds: reportIds
          }]
        },
        topBarFilters: {
          selectedPI: initialFilters?.pi || '',
          selectedTeam: initialFilters?.team_name || '',
          selectedTreeType: initialFilters?.isGroup ? 'group' : 'team',
          selectedTreeValue: initialFilters?.isGroup 
            ? `group:${initialFilters?.team_name || ''}`
            : `team:${initialFilters?.team_name || ''}`
        },
        metric: metric,
        reportFilters: reportIds.reduce((acc: Record<string, any>, reportId: string, index: number) => {
          const key = `${reportId}-0-${index}`;
          // Use tracked filters from report components - they now properly set their defaults
          // via ReportPanel's setFilters callback
          const trackedFilters = reportFiltersState[key] || {};
          
          // Merge initial filters with tracked filters (tracked filters take precedence)
          const mergedFilters: Record<string, any> = {
            ...initialFilters,
            ...trackedFilters,
          };
          
          // Add human-readable filter labels for AI context
          // The actual filter values (months, githubRepoIds, prState, environment) are now properly
          // set by the report components themselves via ReportPanel's setFilters callback
          if (!mergedFilters.repositories && mergedFilters.githubRepoIds !== undefined) {
            // Convert empty array or undefined to "All" for display
            if (!mergedFilters.githubRepoIds || (Array.isArray(mergedFilters.githubRepoIds) && mergedFilters.githubRepoIds.length === 0)) {
              mergedFilters.repositories = 'All';
            }
          }
          if (mergedFilters.months !== undefined && !mergedFilters.time_period) {
            mergedFilters.time_period = `${mergedFilters.months} month${mergedFilters.months !== 1 ? 's' : ''}`;
          }
          // PR workflow specific: prState
          if (mergedFilters.prState !== undefined && !mergedFilters.pr_state) {
            mergedFilters.pr_state = mergedFilters.prState === 'all' ? 'All' : mergedFilters.prState;
          }
          // DORA specific: environment
          if (mergedFilters.environment !== undefined && !mergedFilters.environment_display) {
            mergedFilters.environment_display = mergedFilters.environment || 'All';
          }
          
          acc[key] = mergedFilters;
          return acc;
        }, {}),
        pinnedFilters: {}
      };

      console.log('[KPIDashboard] Emitting collected data:', dashboardData);
      window.dispatchEvent(new CustomEvent('kpi-dashboard-data-collected', { detail: dashboardData }));
    };

    window.addEventListener('collect-kpi-dashboard-data', handleCollectData);
    return () => {
      window.removeEventListener('collect-kpi-dashboard-data', handleCollectData);
    };
  }, [title, reportIds, initialFilters, reportFiltersState]);

  const colors = tierColors[tierStatus] || tierColors.low;
  const tierLabel = tierStatus.charAt(0).toUpperCase() + tierStatus.slice(1);

  // Trend arrow mapping - same as KPICard
  const getTrendArrow = (direction: string) => {
    const normalized = direction?.toLowerCase().trim();
    switch (normalized) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'flat':
        return '→';
      default:
        return '→';
    }
  };

  // Get trend color based on improved field - same as KPICard
  const getTrendColor = () => {
    if (!trend || !trend.direction) return colors.valueText;
    
    const normalized = trend.direction.toLowerCase().trim();
    
    if (normalized === 'flat') {
      return 'text-content-tertiary';
    }
    
    return trend.improved ? 'text-green-600' : 'text-red-600';
  };

  // Create rows of reports (1 per row) - same pattern as InsightDashboard
  const reportRows: string[][] = reportIds.map(id => [id]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Metric Header - Fixed at top */}
      <div className="flex-shrink-0">
        <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden">
          {/* Header with back button */}
          <div className="px-5 py-3 bg-gradient-to-r from-surface to-surface-elevated border-b border-outline">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Title and Description on same line */}
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-semibold text-content-primary">
                    {title}
                  </h1>
                  {description && (
                    <span className="text-sm text-content-tertiary">
                      {description}
                    </span>
                  )}
                </div>
                
                {/* Value */}
                <div className="mb-2">
                  <div className={`text-3xl font-bold ${colors.valueText}`}>
                    {value}
                  </div>
                </div>
                
                {/* Tier badge and Trend at bottom - matching card layout */}
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium border
                      ${colors.badge.background} ${colors.badge.text} ${colors.badge.border}
                    `}
                  >
                    {tierLabel.toUpperCase()}
                  </span>
                  {trend && trend.direction && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`font-bold leading-none ${getTrendColor()}`} style={{ fontSize: '1.215rem', lineHeight: '1' }}>
                        {getTrendArrow(trend.direction)}
                      </span>
                      <span className={`font-medium ${getTrendColor()}`}>{trend.percentage}%</span>
                      <span className="text-content-muted">{trend.label}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-strong text-content-secondary hover:bg-surface-elevated transition-colors text-sm font-medium flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Reports */}
      {reportRows.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pt-4">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-content-tertiary uppercase tracking-wider">Related Reports</h2>
          </div>
          <div className="space-y-6">
            {reportRows.map((row, rowIdx) => (
              <div 
                key={rowIdx}
                className="bg-surface rounded-2xl border border-outline shadow-sm overflow-hidden flex-shrink-0 flex flex-col" 
                style={{ height: '400px', minHeight: '400px' }}
              >
                {row.map((reportId, reportIndex) => {
                  return (
                    <div 
                      key={reportId}
                      className="h-full flex flex-col min-h-0"
                    >
                      <ReportPanel
                        reportId={reportId}
                        initialFilters={initialFilters}
                        controlledFilters={{}}
                        enabled={true}
                        componentProps={{
                          hideHeader: true,
                          isDashboard: true,
                        }}
                        onFiltersChange={(filters) => handleReportFiltersChange(reportId, rowIdx * row.length + reportIndex, filters)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No reports message */}
      {reportIds.length === 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto pt-4">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm p-6 text-center">
            <div className="text-content-tertiary text-sm">
              No related reports available for this metric.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

