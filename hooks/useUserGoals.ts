import { useState, useCallback, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { transformGoalsToHierarchy } from '@/components/pigoals/utils';
import type { HierarchyItem } from '@/lib/config';

interface UseUserGoalsReturn {
  hierarchyData: HierarchyItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching user-confirmed (non-AI) PI goals data.
 * Returns data already transformed into hierarchy format.
 * 
 * @param piName - The name of the PI to fetch goals for
 * @param teamName - Optional team name filter
 * @param isGroup - Whether the team filter is a group
 * @param enabled - Whether to fetch data (default: true)
 * @returns Object containing hierarchy data, loading state, error state, and refetch function
 */
export function useUserGoals(
  piName?: string,
  teamName?: string,
  isGroup?: boolean,
  enabled: boolean = true
): UseUserGoalsReturn {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserGoals = useCallback(async () => {
    if (!piName || !enabled) {
      setRawData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const apiService = new ApiService();

    try {
      const response = await apiService.getPIGoals(
        piName,
        teamName || undefined,
        isGroup || false,
        false // AI = false (user-confirmed goals)
      );
      setRawData(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching user PI goals:', err);
      setRawData(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user-confirmed goals');
    } finally {
      setLoading(false);
    }
  }, [piName, teamName, isGroup, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchUserGoals();
    }
  }, [fetchUserGoals, enabled]);

  // Transform data to hierarchy format
  const hierarchyData = useMemo(() => {
    return transformGoalsToHierarchy(rawData, 'user');
  }, [rawData]);

  return {
    hierarchyData,
    loading,
    error,
    refetch: fetchUserGoals,
  };
}


