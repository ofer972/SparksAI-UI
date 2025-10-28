import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { CompletionRate, InProgressCount, SprintMetrics } from '@/lib/config';

interface UseTeamMetricsReturn {
  sprintMetrics: SprintMetrics | null;
  completionRate: CompletionRate | null;
  inProgressCount: InProgressCount | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching team metrics data including sprint metrics, completion rate, and work in progress count.
 * 
 * @param teamName - The name of the team to fetch metrics for
 * @returns Object containing sprint metrics, completion rate, in-progress count, loading state, error state, and refetch function
 */
export function useTeamMetrics(teamName?: string): UseTeamMetricsReturn {
  const [sprintMetrics, setSprintMetrics] = useState<SprintMetrics | null>(null);
  const [completionRate, setCompletionRate] = useState<CompletionRate | null>(null);
  const [inProgressCount, setInProgressCount] = useState<InProgressCount | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!teamName) {
      setSprintMetrics(null);
      setCompletionRate(null);
      setInProgressCount(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const { sprintMetrics, completionRate, inProgressCount } = await apiService.getTeamMetrics(teamName);
      setSprintMetrics(sprintMetrics);
      setCompletionRate(completionRate);
      setInProgressCount(inProgressCount);
    } catch (err) {
      console.error('Error fetching team metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setSprintMetrics(null);
      setCompletionRate(null);
      setInProgressCount(null);
    } finally {
      setLoading(false);
    }
  }, [teamName]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { sprintMetrics, completionRate, inProgressCount, loading, error, refetch: fetchMetrics };
}


