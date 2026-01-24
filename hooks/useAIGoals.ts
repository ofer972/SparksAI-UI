import { useState, useCallback, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { transformGoalsToHierarchy } from '@/components/pigoals/utils';
import type { HierarchyItem } from '@/lib/config';

interface UseAIGoalsReturn {
  hierarchyData: HierarchyItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching AI-generated PI goals data.
 * Returns data already transformed into hierarchy format.
 * 
 * @param piName - The name of the PI to fetch goals for
 * @param teamName - Optional team name filter
 * @param isGroup - Whether the team filter is a group
 * @param enabled - Whether to fetch data (default: true)
 * @returns Object containing hierarchy data, loading state, error state, and refetch function
 */
export function useAIGoals(
  piName?: string,
  teamName?: string,
  isGroup?: boolean,
  enabled: boolean = true
): UseAIGoalsReturn {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIGoals = useCallback(async () => {
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
        true // AI = true (AI-generated goals)
      );
      setRawData(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching AI PI goals:', err);
      setRawData(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI goals');
    } finally {
      setLoading(false);
    }
  }, [piName, teamName, isGroup, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchAIGoals();
    }
  }, [fetchAIGoals, enabled]);

  // Transform data to hierarchy format
  const hierarchyData = useMemo(() => {
    return transformGoalsToHierarchy(rawData, 'ai');
  }, [rawData]);

  return {
    hierarchyData,
    loading,
    error,
    refetch: fetchAIGoals,
  };
}


