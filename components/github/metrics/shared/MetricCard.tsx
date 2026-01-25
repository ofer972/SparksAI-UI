'use client';

import { useState, ReactNode } from 'react';
import ReportCard from '@/components/reporting/ReportCard';
import DORATierBadge from '../../DORATierBadge';
import DORATierTooltip from '../../DORATierTooltip';
import { FilterBadge } from './types';

interface MetricCardProps {
  title: string;
  metricName: string; // e.g., "deployment_frequency", "pr_size", etc.
  tier: string;
  tierLabel: string;
  filterBadges: FilterBadge[];
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  loadingText?: string;
  summaryContent: ReactNode; // The metric value/display on the left side
  children: ReactNode; // The chart or other content below the summary - FULLY CUSTOMIZABLE
  filters?: ReactNode; // Custom filter component - maintains flexibility
}

/**
 * Unified MetricCard component for both DORA and PR Workflow metrics
 * 
 * Maintains 100% flexibility:
 * - `children` prop allows any chart/custom component
 * - `filters` prop allows any filter component
 * - Supports custom click handlers, refs, and all Chart.js features
 */
export default function MetricCard({
  title,
  metricName,
  tier,
  tierLabel,
  filterBadges,
  onRefresh,
  loading,
  error,
  loadingText = 'Loading data...',
  summaryContent,
  children,
  filters,
}: MetricCardProps) {
  const [showTierTooltip, setShowTierTooltip] = useState(false);

  return (
    <ReportCard
      title={title}
      filters={filters}
      filterBadges={filterBadges}
      onRefresh={onRefresh}
      hideCollapse={true}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">{loadingText}</div>
          </div>
        </div>
      )}

      {!loading && !error && summaryContent && (
        <div className="h-full flex flex-col relative -mt-2 min-h-0">
          {/* Tier Tooltip positioned just below the filters separator */}
          {showTierTooltip && (
            <div className="absolute left-0 top-0 z-50 mt-1">
              <DORATierTooltip 
                metric={metricName} 
                onClose={() => setShowTierTooltip(false)} 
              />
            </div>
          )}
          
          {/* Summary and Badge Row */}
          <div className="mb-2 flex items-center justify-between flex-shrink-0 pt-2">
            {summaryContent}
            <div className="relative">
              <DORATierBadge 
                tier={tier}
                tierLabel={tierLabel}
                onClick={() => setShowTierTooltip(!showTierTooltip)}
              />
            </div>
          </div>

          {/* Chart or other content - FULLY CUSTOMIZABLE */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      )}

      {!loading && !error && !summaryContent && (
        <div className="flex items-center justify-center h-64">
          <div className="text-content-muted">No data available</div>
        </div>
      )}
    </ReportCard>
  );
}

