'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Shared hook for metric data fetching
 * Handles the common pattern of fetching data when dependencies change
 * 
 * @param endpoint - API endpoint to fetch from
 * @param fetchDataFn - Function to call for fetching (from useDORAMetrics or usePRWorkflowMetrics)
 * @param dependencies - Array of dependencies that trigger refetch (e.g., [githubRepoIds, environment, months])
 * @param repositories - Array of repositories to check if loaded
 */
export function useMetricData<T>(
  endpoint: string,
  fetchDataFn: (endpoint: string) => Promise<T>,
  dependencies: any[],
  repositories: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const prevDepsRef = useRef<string>('');
  const prevReposLengthRef = useRef<number>(0);

  // Create a stable key from dependencies for comparison
  const depsKey = JSON.stringify(dependencies);

  // Fetch data when dependencies change
  useEffect(() => {
    const depsChanged = prevDepsRef.current !== depsKey;
    const reposLoaded = repositories.length > 0 && prevReposLengthRef.current === 0;
    
    prevDepsRef.current = depsKey;
    prevReposLengthRef.current = repositories.length;

    if (repositories.length > 0 && (depsChanged || reposLoaded)) {
      const loadData = async () => {
        try {
          const result = await fetchDataFn(endpoint);
          setData(result);
        } catch (err) {
          // Error already set by fetchData
        }
      };
      loadData();
    }
  }, [endpoint, fetchDataFn, repositories.length, depsKey]);

  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    try {
      const result = await fetchDataFn(endpoint);
      setData(result);
    } catch (err) {
      // Error already set by fetchData
    }
  }, [endpoint, fetchDataFn]);

  return { data, setData, refresh };
}

