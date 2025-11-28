import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { CompletionRate, SprintMetrics } from '@/lib/config';

interface UseTeamMetricsReturn {
  sprintMetrics: SprintMetrics | null;
  completionRate: CompletionRate | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching team metrics data including sprint metrics and current sprint progress.
 * 
 * @param teamName - The name of the team to fetch metrics for
 * @param isGroup - Whether the teamName refers to a group (true) or team (false/undefined)
 * @returns Object containing sprint metrics, completion rate (with sprint progress data), loading state, error state, and refetch function
 */
export function useTeamMetrics(teamName?: string, isGroup?: boolean): UseTeamMetricsReturn {
  const [sprintMetrics, setSprintMetrics] = useState<SprintMetrics | null>(null);
  const [completionRate, setCompletionRate] = useState<CompletionRate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    // Check if teamName is empty, whitespace, or placeholder text
    const isEmptyOrPlaceholder = !teamName || 
      teamName.trim() === '' || 
      teamName === 'Select team or group' ||
      teamName.trim() === 'Select team or group';
    
    if (isEmptyOrPlaceholder) {
      setSprintMetrics(null);
      setCompletionRate(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const { sprintMetrics, completionRate } = await apiService.getTeamMetrics(teamName, isGroup);
      setSprintMetrics(sprintMetrics);
      setCompletionRate(completionRate);
    } catch (err) {
      console.error('Error fetching team metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch metrics';
      
      // Check if error is related to missing team/group - treat as empty result instead of error
      const isTeamNotFoundError = 
        typeof message === 'string' && (
          message.includes("Team '") && message.includes("' not found") ||
          message.includes('404: Team') ||
          message.includes('Team not found') ||
          message.includes('Group not found') ||
          message.includes("Group '") && message.includes("' not found")
        );
      
      if (isTeamNotFoundError) {
        // Treat as empty result, not an error
        setError(null);
        setSprintMetrics(null);
        setCompletionRate(null);
      } else {
        setError(message);
        setSprintMetrics(null);
        setCompletionRate(null);
      }
    } finally {
      setLoading(false);
    }
  }, [teamName, isGroup]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { sprintMetrics, completionRate, loading, error, refetch: fetchMetrics };
}


