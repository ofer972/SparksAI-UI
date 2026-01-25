'use client';

import { ReactNode } from 'react';
import MetricCard from './metrics/shared/MetricCard';
import PRWorkflowFilters from './PRWorkflowFilters';
import { Repository } from '@/components/github/metrics/shared/types';

interface PRWorkflowMetricCardProps {
  title: string;
  metricName: string;
  tier: string;
  tierLabel: string;
  repositories: Repository[];
  githubRepoIds: number[];
  months: number;
  prState: string;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onMonthsChange: (months: number) => void;
  onPrStateChange: (state: string) => void;
  filterBadges: Array<{ label: string; value: string }>;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  loadingText?: string;
  summaryContent: ReactNode;
  children: ReactNode; // FULLY CUSTOMIZABLE - supports click handlers, refs, etc.
}

/**
 * PR Workflow Metric Card - Wrapper around unified MetricCard
 * Maintains backward compatibility while using shared component
 */
export default function PRWorkflowMetricCard({
  title,
  metricName,
  tier,
  tierLabel,
  repositories,
  githubRepoIds,
  months,
  prState,
  onGithubRepoIdsChange,
  onMonthsChange,
  onPrStateChange,
  filterBadges,
  onRefresh,
  loading,
  error,
  loadingText = 'Loading data...',
  summaryContent,
  children,
}: PRWorkflowMetricCardProps) {
  return (
    <MetricCard
      title={title}
      metricName={metricName}
      tier={tier}
      tierLabel={tierLabel}
      filterBadges={filterBadges}
      onRefresh={onRefresh}
      loading={loading}
      error={error}
      loadingText={loadingText}
      summaryContent={summaryContent}
      filters={
        <PRWorkflowFilters
          githubRepoIds={githubRepoIds}
          months={months}
          prState={prState}
          onGithubRepoIdsChange={onGithubRepoIdsChange}
          onMonthsChange={onMonthsChange}
          onPrStateChange={onPrStateChange}
          availableRepositories={repositories}
        />
      }
    >
      {children}
    </MetricCard>
  );
}

