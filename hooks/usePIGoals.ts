import { useState, useCallback, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface PIGoalsResponse {
  success: boolean;
  data: {
    pi: string;
    overall_goals?: any[];
    group_goals?: any[];
    team_goals?: any[];
  };
  message: string;
}

interface UsePIGoalsReturn {
  aiGoals: PIGoalsResponse | null;
  nonAiGoals: PIGoalsResponse | null;
  loading: boolean;
  aiError: string | null;
  nonAiError: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI goals data (both AI and non-AI).
 * 
 * @param piName - The name of the PI to fetch goals for
 * @param teamName - Optional team name filter
 * @param isGroup - Whether the team filter is a group
 * @param enabled - Whether to fetch data (default: true)
 * @returns Object containing AI goals, non-AI goals, loading state, errors, and refetch function
 */
export function usePIGoals(
  piName?: string,
  teamName?: string,
  isGroup?: boolean,
  enabled: boolean = true
): UsePIGoalsReturn {
  const [aiGoals, setAiGoals] = useState<PIGoalsResponse | null>(null);
  const [nonAiGoals, setNonAiGoals] = useState<PIGoalsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [nonAiError, setNonAiError] = useState<string | null>(null);

  const fetchPIGoals = useCallback(async () => {
    if (!piName || !enabled) {
      setAiGoals(null);
      setNonAiGoals(null);
      setLoading(false);
      setAiError(null);
      setNonAiError(null);
      return;
    }

    setLoading(true);
    setAiError(null);
    setNonAiError(null);
    setAiGoals(null);
    setNonAiGoals(null);

    const apiService = new ApiService();

    try {
      // Fetch both AI and non-AI goals in parallel, handle errors separately
      const [aiResult, nonAiResult] = await Promise.allSettled([
        apiService.getPIGoals(
          piName,
          teamName || undefined,
          isGroup || false,
          true // AI = true
        ),
        apiService.getPIGoals(
          piName,
          teamName || undefined,
          isGroup || false,
          false // AI = false
        )
      ]);

      // Handle AI goals result
      if (aiResult.status === 'fulfilled') {
        setAiGoals(aiResult.value);
        setAiError(null);
      } else {
        console.error('Error fetching AI PI goals:', aiResult.reason);
        setAiGoals(null);
        setAiError(aiResult.reason instanceof Error ? aiResult.reason.message : 'Failed to fetch AI goals');
      }

      // Handle non-AI goals result
      if (nonAiResult.status === 'fulfilled') {
        setNonAiGoals(nonAiResult.value);
        setNonAiError(null);
      } else {
        console.error('Error fetching non-AI PI goals:', nonAiResult.reason);
        setNonAiGoals(null);
        setNonAiError(nonAiResult.reason instanceof Error ? nonAiResult.reason.message : 'Failed to fetch user-confirmed goals');
      }
    } catch (err) {
      console.error('Error in usePIGoals:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch PI goals';
      setAiError(errorMessage);
      setNonAiError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [piName, teamName, isGroup, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchPIGoals();
    }
  }, [fetchPIGoals, enabled]);

  return {
    aiGoals,
    nonAiGoals,
    loading,
    aiError,
    nonAiError,
    refetch: fetchPIGoals,
  };
}

