'use client';

import { ReactNode, useMemo, useCallback } from 'react';
import DORAMetricCard from './DORAMetricCard';
import PRWorkflowMetricCard from './PRWorkflowMetricCard';
import MetricCard from './metrics/shared/MetricCard';
import PRWorkflowFilters from './PRWorkflowFilters';
import DORAFilters from './DORAFilters';
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
  teamName?: string | null;
  isGroup?: boolean;
  onTeamGroupChange?: (value: string | null, type: 'group' | 'team', name: string) => void;
  
  // Report mode props (from ReportPanel)
  filters?: Record<string, any>;
  setFilters?: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
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
  teamName,
  isGroup,
  onTeamGroupChange,
  // Report mode props
  filters,
  setFilters,
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

  // Create filter handlers for report mode (PR workflow and DORA)
  const reportModeFilterHandlers = useMemo(() => {
    if (!isReportMode || !setFilters || (cardType !== 'pr-workflow' && cardType !== 'dora')) {
      return null;
    }

    // Extract filter values from filters prop
    const currentGithubRepoIds = (filters?.githubRepoIds as number[]) || (filters?.github_repo_ids as number[]) || [];
    const currentMonths = (filters?.months as number) || 1;
    const currentTeamName = (filters?.team_name as string) || (filters?.teamName as string) || null;
    const currentIsGroup = (filters?.isGroup as boolean) || false;

    // PR workflow specific
    const currentPrState = cardType === 'pr-workflow' 
      ? ((filters?.prState as string) || (filters?.pr_state as string) || 'all')
      : undefined;

    // DORA specific
    const currentEnvironment = cardType === 'dora'
      ? ((filters?.environment as string) || '')
      : undefined;

    return {
      githubRepoIds: currentGithubRepoIds,
      months: currentMonths,
      prState: currentPrState,
      environment: currentEnvironment,
      teamName: currentTeamName,
      isGroup: currentIsGroup,
      onGithubRepoIdsChange: (ids: number[]) => {
        setFilters((prev) => ({ ...prev, githubRepoIds: ids, github_repo_ids: ids }));
      },
      onMonthsChange: (newMonths: number) => {
        setFilters((prev) => ({ ...prev, months: newMonths }));
      },
      onPrStateChange: (state: string) => {
        if (cardType === 'pr-workflow') {
          setFilters((prev) => ({ ...prev, prState: state, pr_state: state }));
        }
      },
      onEnvironmentChange: (env: string) => {
        if (cardType === 'dora') {
          setFilters((prev) => ({ ...prev, environment: env }));
        }
      },
      onTeamGroupChange: (value: string | null, type: 'group' | 'team', name: string) => {
        if (!setFilters) {
          return;
        }
        if (value === null) {
          setFilters((prev) => ({
            ...prev,
            team_name: null,
            teamName: null,
            isGroup: false,
          }));
        } else {
          setFilters((prev) => ({
            ...prev,
            team_name: name,
            teamName: name,
            isGroup: type === 'group',
          }));
        }
      },
    };
  }, [isReportMode, setFilters, cardType, filters]);

  // Create filters component for report mode (PR workflow and DORA)
  const reportModeFilters = useMemo(() => {
    if (!isReportMode || !reportModeFilterHandlers || !repositories) {
      return undefined;
    }

    if (cardType === 'pr-workflow') {
      return (
        <PRWorkflowFilters
          githubRepoIds={reportModeFilterHandlers.githubRepoIds}
          months={reportModeFilterHandlers.months}
          prState={reportModeFilterHandlers.prState!}
          teamName={reportModeFilterHandlers.teamName}
          isGroup={reportModeFilterHandlers.isGroup}
          onGithubRepoIdsChange={reportModeFilterHandlers.onGithubRepoIdsChange}
          onMonthsChange={reportModeFilterHandlers.onMonthsChange}
          onPrStateChange={reportModeFilterHandlers.onPrStateChange!}
          onTeamGroupChange={reportModeFilterHandlers.onTeamGroupChange}
          availableRepositories={repositories}
        />
      );
    }

    if (cardType === 'dora') {
      return (
        <DORAFilters
          githubRepoIds={reportModeFilterHandlers.githubRepoIds}
          environment={reportModeFilterHandlers.environment || ''}
          months={reportModeFilterHandlers.months}
          teamName={reportModeFilterHandlers.teamName}
          isGroup={reportModeFilterHandlers.isGroup}
          onGithubRepoIdsChange={reportModeFilterHandlers.onGithubRepoIdsChange}
          onEnvironmentChange={reportModeFilterHandlers.onEnvironmentChange!}
          onMonthsChange={reportModeFilterHandlers.onMonthsChange}
          onTeamGroupChange={reportModeFilterHandlers.onTeamGroupChange}
          availableRepositories={repositories}
          availableEnvironments={availableEnvironments || []}
        />
      );
    }

    return undefined;
  }, [isReportMode, cardType, reportModeFilterHandlers, repositories, availableEnvironments]);
  
  // Report mode: use MetricCard component (which uses ReportCard)
  if (isReportMode) {
    return (
      <MetricCard
        title={title}
        metricName={metricName}
        tier={tier}
        tierLabel={tierLabel}
        filterBadges={reportModeFilterBadges}
        filters={reportModeFilters}
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
        teamName={teamName}
        isGroup={isGroup}
        onGithubRepoIdsChange={onGithubRepoIdsChange!}
        onEnvironmentChange={onEnvironmentChange!}
        onMonthsChange={onMonthsChange!}
        onTeamGroupChange={onTeamGroupChange}
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
        teamName={teamName}
        isGroup={isGroup}
        onGithubRepoIdsChange={onGithubRepoIdsChange!}
        onMonthsChange={onMonthsChange!}
        onPrStateChange={onPrStateChange!}
        onTeamGroupChange={onTeamGroupChange}
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

