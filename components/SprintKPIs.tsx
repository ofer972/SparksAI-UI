'use client';

import { useState, useEffect } from 'react';
import { useSprintMetrics } from '@/hooks';
import KPICard from '@/components/KPICard';
import KPIDashboard from '@/components/KPIDashboard';

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
  tier_status: 'elite' | 'high' | 'medium' | 'low' | '';
  metric_type?: 'dora' | 'sprint' | 'pi';
  description: string;
  tooltip: string;
  trend?: Trend | null;
  chart_data?: {
    type: 'line' | 'progress';
    points?: Array<{
      sprint_id: string;
      value: number;
      date: string | null;
    }>;
    current?: number;
    total?: number;
    percentage?: number;
  } | null;
  alternative_text?: string | null;
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

export interface KPIDashboardData {
  title: string;
  value: string;
  tierStatus: 'elite' | 'high' | 'medium' | 'low' | '';
  description: string;
  trend?: Trend;
  reportIds: string[];
  initialFilters?: Record<string, any>;
  metric?: MetricResponse;
}

interface SprintKPIsProps {
  teamName: string;
  isGroup?: boolean;
  singleRowLayout?: boolean;
  onOpenKPIDashboard?: (data: KPIDashboardData) => void;
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
  selectedMetrics?: string[]; // Optional: Array of metric IDs to display
  layout?: 'normal' | 'wide';
  refreshKey?: number; // Trigger refetch with bypass_cache when this changes
}

export default function SprintKPIs({ 
  teamName,
  isGroup = false,
  singleRowLayout = false, 
  onOpenKPIDashboard,
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
  selectedMetrics,
  layout = 'normal',
  refreshKey,
}: SprintKPIsProps) {
  const { metrics, loading, error, refetch } = useSprintMetrics(teamName, isGroup, refreshKey);
  
  // Only use local state when no callback is provided (for backward compatibility)
  const [selectedKPIDashboard, setSelectedKPIDashboard] = useState<KPIDashboardData | null>(null);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log('[SprintKPIs] Refetching metrics with bypass_cache due to refreshKey change:', refreshKey);
      refetch(true);
    }
  }, [refreshKey, refetch]);

  // Handle opening KPI dashboard - called by KPICard when clicked
  const handleKPIClick = (kpiData: KPIDashboardData) => {
    // If callback is provided, use it to navigate to detail page
    // Otherwise fall back to local state (for backward compatibility)
    if (onOpenKPIDashboard) {
      onOpenKPIDashboard(kpiData);
    } else {
      setSelectedKPIDashboard(kpiData);
    }
  };

  const handleCloseKPIDashboard = () => {
    setSelectedKPIDashboard(null);
  };

  // If KPI dashboard is selected AND no callback is provided (backward compatibility mode),
  // show it inline instead of the KPI cards
  if (selectedKPIDashboard && !onOpenKPIDashboard) {
    return (
      <div className="h-full w-full">
        <KPIDashboard
          title={selectedKPIDashboard.title}
          value={selectedKPIDashboard.value}
          tierStatus={selectedKPIDashboard.tierStatus || 'medium'}
          description={selectedKPIDashboard.description}
          trend={selectedKPIDashboard.trend}
          reportIds={selectedKPIDashboard.reportIds}
          initialFilters={selectedKPIDashboard.initialFilters}
          onBack={handleCloseKPIDashboard}
        />
      </div>
    );
  }

  if (loading) {
    const loadingCount = selectedMetrics && selectedMetrics.length > 0 ? selectedMetrics.length : 5;

    return (
      <div className="w-full overflow-visible">
        {layout === 'wide' ? (
          <div className="grid gap-10 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {[...Array(loadingCount)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gradient-to-br from-surface to-surface-elevated rounded-lg border border-outline shadow-sm p-2 sm:p-3 flex flex-col items-center text-center animate-pulse"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 bg-surface-elevated rounded mb-1 sm:mb-2"></div>
                <div className="h-4 sm:h-5 w-12 sm:w-16 bg-gray-200 bg-surface-elevated rounded mb-1 sm:mb-1.5"></div>
                <div className="h-2 sm:h-3 w-16 sm:w-20 bg-gray-200 bg-surface-elevated rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex flex-wrap gap-2 ${singleRowLayout ? 'justify-start' : 'justify-center'}`}>
            {[...Array(loadingCount)].map((_, i) => (
              <div
                key={i}
                className="w-[170px] h-32 bg-gradient-to-br from-surface to-surface-elevated rounded-lg border border-outline shadow-sm p-2 sm:p-3 flex flex-col items-center text-center animate-pulse"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 bg-surface-elevated rounded mb-1 sm:mb-2"></div>
                <div className="h-4 sm:h-5 w-12 sm:w-16 bg-gray-200 bg-surface-elevated rounded mb-1 sm:mb-1.5"></div>
                <div className="h-2 sm:h-3 w-16 sm:w-20 bg-gray-200 bg-surface-elevated rounded"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-danger-text">Error: {error}</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-content-tertiary">No KPIs available.</div>
      </div>
    );
  }

  // Filter metrics if selectedMetrics prop is provided
  const displayMetrics = selectedMetrics 
    ? metrics.filter(m => selectedMetrics.includes(m.metric_id))
    : metrics;

  return (
    <>
      <div className="w-full overflow-visible">
        {layout === 'wide' ? (
          <div className="grid gap-10 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {displayMetrics.map((metric) => (
              <KPICard
                key={metric.metric_id}
                metricId={metric.metric_id}
                label={metric.label}
                value={metric.value}
                tierStatus={metric.tier_status || null}
                metricType={metric.metric_type || null}
                description={metric.description}
                tooltip={metric.tooltip}
                trend={metric.trend || null}
                chart_data={metric.chart_data || null}
                layout={layout}
                alternative_text={(metric as any).alternative_text || null}
                action={metric.action || null}
                onOpenDashboard={handleKPIClick}
                defaultTeamOrGroupName={defaultTeamOrGroupName}
                defaultTreeType={defaultTreeType}
                currentPIName={currentPIName}
              />
            ))}
          </div>
        ) : (
          <div className={`flex flex-wrap gap-2 ${singleRowLayout ? 'justify-start' : 'justify-center'}`}>
            {displayMetrics.map((metric) => (
              <KPICard
                key={metric.metric_id}
                metricId={metric.metric_id}
                label={metric.label}
                value={metric.value}
                tierStatus={metric.tier_status || null}
                metricType={metric.metric_type || null}
                description={metric.description}
                tooltip={metric.tooltip}
                trend={metric.trend || null}
                chart_data={metric.chart_data || null}
                layout={layout}
                alternative_text={(metric as any).alternative_text || null}
                action={metric.action || null}
                onOpenDashboard={handleKPIClick}
                defaultTeamOrGroupName={defaultTeamOrGroupName}
                defaultTreeType={defaultTreeType}
                currentPIName={currentPIName}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

