'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { ApiService } from '@/lib/api';
import { useGitHubRepositories } from './useGitHubRepositories';
import { useUser } from '@/contexts/UserContext';
import { Repository, generatePRWorkflowFilterBadges } from '@/components/github/metrics/shared/types';

// Re-export for backward compatibility
export type { Repository };

interface UsePRWorkflowMetricsReturn {
  repositories: Repository[];
  githubRepoIds: number[];
  months: number;
  prState: string;
  teamName: string | null;
  isGroup: boolean;
  setGithubRepoIds: (ids: number[]) => void;
  setMonths: (months: number) => void;
  setPrState: (state: string) => void;
  setTeamName: (name: string | null) => void;
  setIsGroup: (isGroup: boolean) => void;
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
  const { preferences } = useUser();
  const [githubRepoIds, setGithubRepoIds] = useState<number[]>([]);
  const [months, setMonths] = useState<number>(1);
  const [prState, setPrState] = useState<string>('all');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with user's default team from profile
  useEffect(() => {
    if (preferences?.default_team_or_group && preferences.default_type) {
      let teamGroupName = preferences.default_team_or_group;
      // Clean if has old format
      if (teamGroupName.includes(':')) {
        teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
      }
      setTeamName(teamGroupName);
      setIsGroup(preferences.default_type === 'group');
    }
  }, [preferences]);

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
      
      // Add team filter
      if (teamName) {
        filters.team_name = teamName;
        filters.isGroup = isGroup;
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
  }, [githubRepoIds, months, prState, teamName, isGroup]);

  const filterBadges = useMemo(() => {
    const badges = generatePRWorkflowFilterBadges({
      githubRepoIds,
      prState,
      months,
      repositories,
    });
    
    // Add team badge if team is selected
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
      });
    }
    
    return badges;
  }, [githubRepoIds, prState, months, repositories, teamName, isGroup]);

  return {
    repositories,
    githubRepoIds,
    months,
    prState,
    teamName,
    isGroup,
    setGithubRepoIds,
    setMonths,
    setPrState,
    setTeamName,
    setIsGroup,
    filterBadges,
    fetchData,
    loading,
    error,
    setLoading,
    setError,
  };
}

