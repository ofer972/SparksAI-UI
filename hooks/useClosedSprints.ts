import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { ClosedSprint } from '@/lib/config';

interface UseClosedSprintsReturn {
  sprints: ClosedSprint[];
  loading: boolean;
  error: string | null;
  refetch: (teamName?: string, months?: number) => Promise<void>;
}

/**
 * Custom hook for fetching closed sprints data for a specific team and time period.
 * 
 * @param teamName - The name of the team to fetch closed sprints for
 * @param months - Number of months to look back (default: 3)
 * @returns Object containing sprints data, loading state, error state, and refetch function
 */
export function useClosedSprints(teamName?: string, months: number = 3): UseClosedSprintsReturn {
  const [sprints, setSprints] = useState<ClosedSprint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSprints = useCallback(async (overrideTeam?: string, overrideMonths?: number) => {
    const team = overrideTeam ?? teamName;
    const m = overrideMonths ?? months;

    if (!team) {
      setSprints([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getClosedSprints(team, m);
      setSprints(response.closed_sprints || []);
    } catch (err) {
      console.error('Error fetching closed sprints:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch closed sprints');
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }, [teamName, months]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  return { sprints, loading, error, refetch: fetchSprints };
}


