'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { ApiService } from '@/lib/api';
import { useGitHubRepositories } from './useGitHubRepositories';
import { Repository, generatePRWorkflowFilterBadges } from '@/components/github/metrics/shared/types';

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

  const filterBadges = useMemo(() => 
    generatePRWorkflowFilterBadges({
      githubRepoIds,
      prState,
      months,
      repositories,
    }),
    [githubRepoIds, prState, months, repositories]
  );

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

