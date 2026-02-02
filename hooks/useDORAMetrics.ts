'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { ApiService } from '@/lib/api';
import { useGitHubRepositories } from './useGitHubRepositories';
import { Repository, generateDORAFilterBadges } from '@/components/github/metrics/shared/types';

// Re-export for backward compatibility
export type { Repository };

// Module-level cache for environments
let cachedEnvironments: string[] | null = null;
let fetchEnvironmentsPromise: Promise<string[]> | null = null;

interface UseDORAMetricsReturn {
  repositories: Repository[];
  availableEnvironments: string[];
  githubRepoIds: number[];
  environment: string;
  months: number;
  teamName: string | null;
  isGroup: boolean;
  setGithubRepoIds: (ids: number[]) => void;
  setEnvironment: (env: string) => void;
  setMonths: (months: number) => void;
  setTeamName: (name: string | null) => void;
  setIsGroup: (isGroup: boolean) => void;
  filterBadges: Array<{ label: string; value: string }>;
  fetchData: (endpoint: string) => Promise<any>;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useDORAMetrics(): UseDORAMetricsReturn {
  // Use shared repository hook
  const { repositories } = useGitHubRepositories();
  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);
  const [githubRepoIds, setGithubRepoIds] = useState<number[]>([]);
  const [environment, setEnvironment] = useState<string>('production');
  const [months, setMonths] = useState<number>(1);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch environments on mount (with module-level cache)
  useEffect(() => {
    // Use cache if available
    if (cachedEnvironments) {
      setAvailableEnvironments(cachedEnvironments);
      return;
    }

    // If already fetching, wait for that promise
    if (fetchEnvironmentsPromise) {
      fetchEnvironmentsPromise.then(envs => {
        setAvailableEnvironments(envs);
      }).catch(() => {
        // Error already logged in fetch, use fallback
        setAvailableEnvironments(['production', 'staging', 'development', 'qa']);
      });
      return;
    }

    // Fetch and cache
    fetchEnvironmentsPromise = (async () => {
      try {
        const response = await authFetch('/api/v1/github-service/dora/environments');
        if (!response.ok) {
          const fallback = ['production', 'staging', 'development', 'qa'];
          cachedEnvironments = fallback; // Cache fallback
          setAvailableEnvironments(fallback);
          return fallback;
        }
        const envs = await response.json();
        const environments = Array.isArray(envs) ? envs : ['production', 'staging', 'development', 'qa'];
        cachedEnvironments = environments; // Cache the result
        setAvailableEnvironments(environments);
        return environments;
      } catch (err) {
        console.error('Failed to load environments', err);
        const fallback = ['production', 'staging', 'development', 'qa'];
        cachedEnvironments = fallback; // Cache fallback
        setAvailableEnvironments(fallback);
        return fallback;
      } finally {
        fetchEnvironmentsPromise = null;
      }
    })();
  }, []);

  const fetchData = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Map endpoint to report_id
      const endpointToReportId: Record<string, string> = {
        '/api/v1/github-service/dora/deployment-frequency': 'dora-deployment-frequency',
        '/api/v1/github-service/dora/recovery-time': 'dora-recovery-time',
        '/api/v1/github-service/dora/change-failure-rate': 'dora-change-failure-rate',
        '/api/v1/github-service/dora/lead-time': 'dora-lead-time',
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
      
      if (environment) {
        filters.environment = environment;
      }
      
      if (teamName) {
        filters.team_name = teamName;
        filters.isGroup = isGroup;
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
  }, [githubRepoIds, environment, months, teamName, isGroup]);

  const filterBadges = useMemo(() => {
    const badges = generateDORAFilterBadges({
      githubRepoIds,
      environment,
      months,
      repositories,
    });
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
      });
    }
    
    return badges;
  }, [githubRepoIds, environment, months, repositories, teamName, isGroup]);

  return {
    repositories,
    availableEnvironments,
    githubRepoIds,
    environment,
    months,
    teamName,
    isGroup,
    setGithubRepoIds,
    setEnvironment,
    setMonths,
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

