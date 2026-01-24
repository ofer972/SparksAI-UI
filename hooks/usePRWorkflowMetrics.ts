'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { ApiService } from '@/lib/api';
import { useGitHubRepositories } from './useGitHubRepositories';
import { Repository } from '@/components/github/metrics/shared/types';

// Re-export for backward compatibility
export type { Repository };

interface UsePRWorkflowMetricsReturn {
  repositories: Repository[];
  githubRepoIds: number[];
  months: number;
  prState: string;
  setGithubRepoIds: (ids: number[]) => void;
  setMonths: (months: number) => void;
  setPrState: (state: string) => void;
  filterBadges: Array<{ label: string; value: string }>;
  fetchData: (endpoint: string) => Promise<any>;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function usePRWorkflowMetrics(): UsePRWorkflowMetricsReturn {
  // Use shared repository hook
  const { repositories } = useGitHubRepositories();
  const [githubRepoIds, setGithubRepoIds] = useState<number[]>([]);
  const [months, setMonths] = useState<number>(1);
  const [prState, setPrState] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Map endpoint to report_id
      const endpointToReportId: Record<string, string> = {
        '/api/v1/github-service/pr-workflow/pr-size': 'pr-workflow-pr-size',
        '/api/v1/github-service/pr-workflow/pickup-time': 'pr-workflow-pickup-time',
        '/api/v1/github-service/pr-workflow/pr-maturity': 'pr-workflow-pr-maturity',
        '/api/v1/github-service/pr-workflow/rework-rate': 'pr-workflow-rework-rate',
      };
      
      const reportId = endpointToReportId[endpoint];
      if (!reportId) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      // Build filters
      const filters: Record<string, any> = {
        months: months,
      };
      
      if (githubRepoIds.length > 0) {
        filters.github_repo_ids = githubRepoIds;
      }
      
      // Add PR state filter for PR-specific endpoints
      if (endpoint.includes('pr-size') || endpoint.includes('pickup-time') || endpoint.includes('pr-maturity')) {
        if (prState && prState !== 'all') {
          filters.pr_state = prState;
        } else {
          filters.pr_state = 'all';
        }
      }
      
      // Use report API
      const apiService = new ApiService();
      const reportData = await apiService.getReport(reportId, filters);
      
      // Extract result field (contains the same data structure as before)
      return reportData.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [githubRepoIds, months, prState]);

  const filterBadges = useMemo(() => {
    const badges = [];
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
  }, [githubRepoIds, months, prState, repositories]);

  return {
    repositories,
    githubRepoIds,
    months,
    prState,
    setGithubRepoIds,
    setMonths,
    setPrState,
    filterBadges,
    fetchData,
    loading,
    error,
    setLoading,
    setError,
  };
}

