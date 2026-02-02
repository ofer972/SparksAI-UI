/**
 * Shared types for GitHub metrics (DORA and PR Workflow)
 */

export interface Repository {
  id: number;
  github_repo_id: number;
  name: string;
  full_name: string;
}

export interface FilterBadge {
  label: string;
  value: string;
}

// Extended interface for report mode badges (includes filterKey and isPinned)
export interface ReportFilterBadge extends FilterBadge {
  filterKey: string;
  isPinned: boolean;
}

/**
 * Generate DORA filter badges for hook mode (simple badges without filterKey/isPinned)
 */
export function generateDORAFilterBadges(params: {
  githubRepoIds: number[];
  environment: string;
  months: number;
  repositories: Repository[];
}): FilterBadge[] {
  const { githubRepoIds, environment, months, repositories } = params;
  const badges: FilterBadge[] = [];
  
  if (githubRepoIds.length > 0) {
    const repoNames = githubRepoIds
      .map(githubRepoId => repositories.find(r => r.github_repo_id === githubRepoId)?.name)
      .filter(Boolean);
    if (repoNames.length > 0) {
      if (repoNames.length <= 2) {
        badges.push({ label: 'Repositories', value: repoNames.join(', ') });
      } else {
        badges.push({ label: 'Repositories', value: `${repoNames.slice(0, 2).join(', ')} +${repoNames.length - 2} more` });
      }
    }
  } else {
    badges.push({ label: 'Repositories', value: 'All' });
  }
  
  if (environment) {
    badges.push({ label: 'Environment', value: environment });
  } else {
    badges.push({ label: 'Environment', value: 'All' });
  }
  
  badges.push({ label: 'Time Period', value: `${months} month${months !== 1 ? 's' : ''}` });
  
  return badges;
}

/**
 * Generate PR Workflow filter badges for hook mode (simple badges without filterKey/isPinned)
 */
export function generatePRWorkflowFilterBadges(params: {
  githubRepoIds: number[];
  prState: string;
  months: number;
  repositories: Repository[];
}): FilterBadge[] {
  const { githubRepoIds, prState, months, repositories } = params;
  const badges: FilterBadge[] = [];
  
  if (githubRepoIds.length > 0) {
    const repoNames = githubRepoIds
      .map(githubRepoId => repositories.find(r => r.github_repo_id === githubRepoId)?.name)
      .filter(Boolean);
    if (repoNames.length > 0) {
      if (repoNames.length <= 2) {
        badges.push({ label: 'Repositories', value: repoNames.join(', ') });
      } else {
        badges.push({ label: 'Repositories', value: `${repoNames.slice(0, 2).join(', ')} +${repoNames.length - 2} more` });
      }
    }
  } else {
    badges.push({ label: 'Repositories', value: 'All' });
  }
  
  if (prState && prState !== 'all') {
    badges.push({ label: 'PR State', value: prState.charAt(0).toUpperCase() + prState.slice(1) });
  }
  
  badges.push({ label: 'Time Period', value: `${months} month${months !== 1 ? 's' : ''}` });
  
  return badges;
}

/**
 * Generate DORA filter badges for report mode (includes filterKey and isPinned)
 */
export function generateDORAReportFilterBadges(params: {
  filters: Record<string, any>;
  repositories?: Repository[];
  pinnedFilters?: string[];
}): ReportFilterBadge[] {
  const { filters, repositories = [], pinnedFilters = [] } = params;
  const badges: ReportFilterBadge[] = [];
  
  const repoIds = filters.githubRepoIds as number[] | undefined;
  if (repoIds && Array.isArray(repoIds) && repoIds.length > 0) {
    if (repositories.length > 0) {
      const repoNames = repoIds
        .map(id => repositories.find(r => r.github_repo_id === id)?.name)
        .filter(Boolean);
      if (repoNames.length > 0) {
        if (repoNames.length <= 2) {
          badges.push({
            label: 'Repositories',
            value: repoNames.join(', '),
            filterKey: 'githubRepoIds',
            isPinned: pinnedFilters.includes('githubRepoIds'),
          });
        } else {
          badges.push({
            label: 'Repositories',
            value: `${repoNames.slice(0, 2).join(', ')} +${repoNames.length - 2} more`,
            filterKey: 'githubRepoIds',
            isPinned: pinnedFilters.includes('githubRepoIds'),
          });
        }
      } else {
        badges.push({
          label: 'Repositories',
          value: `${repoIds.length} selected`,
          filterKey: 'githubRepoIds',
          isPinned: pinnedFilters.includes('githubRepoIds'),
        });
      }
    } else {
      badges.push({
        label: 'Repositories',
        value: `${repoIds.length} selected`,
        filterKey: 'githubRepoIds',
        isPinned: pinnedFilters.includes('githubRepoIds'),
      });
    }
  } else {
    badges.push({
      label: 'Repositories',
      value: 'All',
      filterKey: 'githubRepoIds',
      isPinned: pinnedFilters.includes('githubRepoIds'),
    });
  }
  
  const envValue = filters.environment as string | undefined;
  if (envValue) {
    badges.push({
      label: 'Environment',
      value: envValue,
      filterKey: 'environment',
      isPinned: pinnedFilters.includes('environment'),
    });
  } else {
    badges.push({
      label: 'Environment',
      value: 'All',
      filterKey: 'environment',
      isPinned: pinnedFilters.includes('environment'),
    });
  }
  
  const monthsValue = filters.months as number | undefined;
  if (monthsValue) {
    badges.push({
      label: 'Time Period',
      value: `${monthsValue} month${monthsValue !== 1 ? 's' : ''}`,
      filterKey: 'months',
      isPinned: pinnedFilters.includes('months'),
    });
  }
  
  return badges;
}

/**
 * Generate PR Workflow filter badges for report mode (includes filterKey and isPinned)
 */
export function generatePRWorkflowReportFilterBadges(params: {
  filters: Record<string, any>;
  repositories?: Repository[];
  pinnedFilters?: string[];
}): ReportFilterBadge[] {
  const { filters, repositories = [], pinnedFilters = [] } = params;
  const badges: ReportFilterBadge[] = [];
  
  const repoIds = filters.githubRepoIds as number[] | undefined;
  if (repoIds && Array.isArray(repoIds) && repoIds.length > 0) {
    if (repositories.length > 0) {
      const repoNames = repoIds
        .map(id => repositories.find(r => r.github_repo_id === id)?.name)
        .filter(Boolean);
      if (repoNames.length > 0) {
        if (repoNames.length <= 2) {
          badges.push({
            label: 'Repositories',
            value: repoNames.join(', '),
            filterKey: 'githubRepoIds',
            isPinned: pinnedFilters.includes('githubRepoIds'),
          });
        } else {
          badges.push({
            label: 'Repositories',
            value: `${repoNames.slice(0, 2).join(', ')} +${repoNames.length - 2} more`,
            filterKey: 'githubRepoIds',
            isPinned: pinnedFilters.includes('githubRepoIds'),
          });
        }
      } else {
        badges.push({
          label: 'Repositories',
          value: `${repoIds.length} selected`,
          filterKey: 'githubRepoIds',
          isPinned: pinnedFilters.includes('githubRepoIds'),
        });
      }
    } else {
      badges.push({
        label: 'Repositories',
        value: `${repoIds.length} selected`,
        filterKey: 'githubRepoIds',
        isPinned: pinnedFilters.includes('githubRepoIds'),
      });
    }
  } else {
    badges.push({
      label: 'Repositories',
      value: 'All',
      filterKey: 'githubRepoIds',
      isPinned: pinnedFilters.includes('githubRepoIds'),
    });
  }
  
  const prStateValue = filters.prState as string | undefined;
  if (prStateValue && prStateValue !== 'all') {
    badges.push({
      label: 'PR State',
      value: prStateValue.charAt(0).toUpperCase() + prStateValue.slice(1),
      filterKey: 'prState',
      isPinned: pinnedFilters.includes('prState'),
    });
  }
  
  const monthsValue = filters.months as number | undefined;
  if (monthsValue) {
    badges.push({
      label: 'Time Period',
      value: `${monthsValue} month${monthsValue !== 1 ? 's' : ''}`,
      filterKey: 'months',
      isPinned: pinnedFilters.includes('months'),
    });
  }

  const teamNameValue = (filters.team_name as string) || (filters.teamName as string) || undefined;
  const isGroupValue = (filters.isGroup as boolean) || false;
  if (teamNameValue) {
    badges.push({
      label: isGroupValue ? 'Group' : 'Team',
      value: teamNameValue,
      filterKey: 'team_name',
      isPinned: pinnedFilters.includes('team_name'),
    });
  }
  
  return badges;
}



