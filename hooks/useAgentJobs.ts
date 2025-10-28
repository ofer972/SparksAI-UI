import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/api';

interface UseAgentJobsReturn {
  jobs: any[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching agent jobs data.
 * 
 * @returns Object containing jobs data, loading state, error state, and refetch function
 */
export function useAgentJobs(): UseAgentJobsReturn {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getAgentJobs();
      
      // Ensure we always have an array
      const jobsArray = Array.isArray(response) ? response : [];
      setJobs(jobsArray);
      
      console.log('Agent jobs fetched:', jobsArray.length, 'jobs');
    } catch (err) {
      console.error('Error fetching agent jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agent jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}
