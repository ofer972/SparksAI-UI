'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { Repository } from '@/components/github/metrics/shared/types';

// Module-level cache for repositories
let cachedRepositories: Repository[] | null = null;
let fetchRepositoriesPromise: Promise<Repository[]> | null = null;

/**
 * Shared hook for fetching GitHub repositories
 * Used by both DORA and PR Workflow metrics
 * Uses module-level cache to prevent duplicate API calls
 */
export function useGitHubRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    // Use cache if available
    if (cachedRepositories) {
      setRepositories(cachedRepositories);
      return;
    }

    // If already fetching, wait for that promise
    if (fetchRepositoriesPromise) {
      fetchRepositoriesPromise.then(repos => {
        setRepositories(repos);
      }).catch(() => {
        // Error already logged in fetch
      });
      return;
    }

    // Fetch and cache
    fetchRepositoriesPromise = (async () => {
      try {
        const response = await authFetch('/api/v1/github-service/repositories');
        if (!response.ok) {
          throw new Error('Failed to load repositories');
        }
        const repos = await response.json();
        cachedRepositories = repos; // Cache the result
        setRepositories(repos);
        return repos;
      } catch (err) {
        console.error('Failed to load repositories', err);
        return [];
      } finally {
        fetchRepositoriesPromise = null;
      }
    })();
  }, []);

  return { repositories };
}



