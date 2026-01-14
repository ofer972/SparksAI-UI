import { useState, useCallback, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { transformGoalsToHierarchy } from '@/components/pigoals/utils';
import type { HierarchyItem } from '@/lib/config';

interface UseUserSprintGoalsReturn {
  hierarchyData: HierarchyItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching user-confirmed (non-AI) Sprint goals data.
 * Returns data already transformed into hierarchy format.
 * 
 * @param sprintId - The ID of the sprint to fetch goals for
 * @param teamName - Optional team name filter
 * @param isGroup - Whether the team filter is a group
 * @param enabled - Whether to fetch data (default: true)
 * @returns Object containing hierarchy data, loading state, error state, and refetch function
 */
export function useUserSprintGoals(
  sprintId?: number,
  teamName?: string,
  isGroup?: boolean,
  enabled: boolean = true
): UseUserSprintGoalsReturn {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSprintGoals = useCallback(async () => {
    if (!sprintId || !enabled) {
      setRawData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const apiService = new ApiService();

    try {
      const response = await apiService.getSprintGoals(
        sprintId,
        teamName || undefined,
        isGroup || false,
        false // AI = false (user-confirmed goals)
      );
      setRawData(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching user Sprint goals:', err);
      setRawData(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user-confirmed goals');
    } finally {
      setLoading(false);
    }
  }, [sprintId, teamName, isGroup, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchUserSprintGoals();
    }
  }, [fetchUserSprintGoals, enabled]);

  // Transform data to hierarchy format
  const hierarchyData = useMemo(() => {
    return transformGoalsToHierarchy(rawData, 'user');
  }, [rawData]);

  return {
    hierarchyData,
    loading,
    error,
    refetch: fetchUserSprintGoals,
  };
}

