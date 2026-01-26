'use client';

import { ReactNode, useMemo } from 'react';
import DORAMetricCard from './DORAMetricCard';
import PRWorkflowMetricCard from './PRWorkflowMetricCard';
import MetricCard from './metrics/shared/MetricCard';
import { 
  generateDORAReportFilterBadges, 
  generatePRWorkflowReportFilterBadges 
} from './metrics/shared/types';

interface MetricCardWrapperProps {
  isReportMode: boolean;
  cardType: 'dora' | 'pr-workflow';
  
  // Common props
  title: string;
  metricName: string;
  tier: string;
  tierLabel: string;
  summaryContent: ReactNode;
  children: ReactNode;
  loading: boolean;
  error: string | null;
  loadingText?: string;
  
  // DORA-specific props
  repositories?: any[];
  availableEnvironments?: string[];
  githubRepoIds?: number[];
  environment?: string;
  months?: number;
  onGithubRepoIdsChange?: (ids: number[]) => void;
  onEnvironmentChange?: (env: string) => void;
  onMonthsChange?: (months: number) => void;
  filterBadges?: Array<{ label: string; value: string }>;
  onRefresh?: () => void;
  
  // PR Workflow-specific props
  prState?: string;
  onPrStateChange?: (state: string) => void;
  
  // Report mode props (from ReportPanel)
  filters?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function MetricCardWrapper({
  isReportMode,
  cardType,
  title,
  metricName,
  tier,
  tierLabel,
  summaryContent,
  children,
  loading,
  error,
  loadingText,
  // DORA props
  repositories,
  availableEnvironments,
  githubRepoIds,
  environment,
  months,
  onGithubRepoIdsChange,
  onEnvironmentChange,
  onMonthsChange,
  filterBadges,
  onRefresh,
  // PR props
  prState,
  onPrStateChange,
  // Report mode props
  filters,
  togglePin,
  pinnedFilters = [],
  componentProps,
}: MetricCardWrapperProps) {
  // Generate filterBadges from filters prop in report mode (matching pattern from other reports)
  const reportModeFilterBadges = useMemo(() => {
    if (!isReportMode || !filters) return [];
    
    return cardType === 'dora'
      ? generateDORAReportFilterBadges({
          filters,
          repositories,
          pinnedFilters,
        })
      : generatePRWorkflowReportFilterBadges({
          filters,
          repositories,
          pinnedFilters,
        });
  }, [isReportMode, filters, cardType, repositories, pinnedFilters]);
  
  // Report mode: use MetricCard component (which uses ReportCard)
  if (isReportMode) {
    return (
      <MetricCard
        title={title}
        metricName={metricName}
        tier={tier}
        tierLabel={tierLabel}
        filterBadges={reportModeFilterBadges}
        onRefresh={onRefresh || (() => {})}
        loading={loading}
        error={error}
        loadingText={loadingText}
        summaryContent={summaryContent}
        reportId={componentProps?.reportId}
        hideHeader={componentProps?.hideHeader}
        onTogglePin={togglePin}
      >
        {children}
      </MetricCard>
    );
  }
  
  // Hook mode: use appropriate wrapper
  if (cardType === 'dora') {
    return (
      <DORAMetricCard
        title={title}
        metricName={metricName}
        tier={tier}
        tierLabel={tierLabel}
        repositories={repositories!}
        availableEnvironments={availableEnvironments!}
        githubRepoIds={githubRepoIds!}
        environment={environment!}
        months={months!}
        onGithubRepoIdsChange={onGithubRepoIdsChange!}
        onEnvironmentChange={onEnvironmentChange!}
        onMonthsChange={onMonthsChange!}
        filterBadges={filterBadges!}
        onRefresh={onRefresh!}
        loading={loading}
        error={error}
        loadingText={loadingText}
        summaryContent={summaryContent}
      >
        {children}
      </DORAMetricCard>
    );
  } else {
    return (
      <PRWorkflowMetricCard
        title={title}
        metricName={metricName}
        tier={tier}
        tierLabel={tierLabel}
        repositories={repositories!}
        githubRepoIds={githubRepoIds!}
        months={months!}
        prState={prState!}
        onGithubRepoIdsChange={onGithubRepoIdsChange!}
        onMonthsChange={onMonthsChange!}
        onPrStateChange={onPrStateChange!}
        filterBadges={filterBadges!}
        onRefresh={onRefresh!}
        loading={loading}
        error={error}
        loadingText={loadingText}
        summaryContent={summaryContent}
      >
        {children}
      </PRWorkflowMetricCard>
    );
  }
}

