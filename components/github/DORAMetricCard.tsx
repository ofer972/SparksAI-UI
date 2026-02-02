'use client';

import { ReactNode } from 'react';
import MetricCard from './metrics/shared/MetricCard';
import DORAFilters from './DORAFilters';
import { Repository } from '@/components/github/metrics/shared/types';

interface DORAMetricCardProps {
  title: string;
  metricName: string; // e.g., "deployment_frequency", "time_to_restore", etc.
  tier: string;
  tierLabel: string;
  repositories: Repository[];
  availableEnvironments: string[];
  githubRepoIds: number[];
  environment: string;
  months: number;
  teamName?: string | null;
  isGroup?: boolean;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onEnvironmentChange: (env: string) => void;
  onMonthsChange: (months: number) => void;
  onTeamGroupChange?: (value: string | null, type: 'group' | 'team', name: string) => void;
  filterBadges: Array<{ label: string; value: string }>;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  loadingText?: string;
  summaryContent: ReactNode; // The metric value/display on the left side
  children: ReactNode; // The chart or other content below the summary - FULLY CUSTOMIZABLE
}

/**
 * DORA Metric Card - Wrapper around unified MetricCard
 * Maintains backward compatibility while using shared component
 */
export default function DORAMetricCard({
  title,
  metricName,
  tier,
  tierLabel,
  repositories,
  availableEnvironments,
  githubRepoIds,
  environment,
  months,
  teamName,
  isGroup = false,
  onGithubRepoIdsChange,
  onEnvironmentChange,
  onMonthsChange,
  onTeamGroupChange,
  filterBadges,
  onRefresh,
  loading,
  error,
  loadingText = 'Loading data...',
  summaryContent,
  children,
}: DORAMetricCardProps) {
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
        <DORAFilters
          githubRepoIds={githubRepoIds}
          environment={environment}
          months={months}
          teamName={teamName}
          isGroup={isGroup}
          onGithubRepoIdsChange={onGithubRepoIdsChange}
          onEnvironmentChange={onEnvironmentChange}
          onMonthsChange={onMonthsChange}
          onTeamGroupChange={onTeamGroupChange}
          availableRepositories={repositories}
          availableEnvironments={availableEnvironments}
        />
      }
    >
      {children}
    </MetricCard>
  );
}

