import { useCallback, useEffect, useState } from 'react';
import { ApiService, BurndownDataPoint } from '@/lib/api';

interface UsePIBurndownReturn {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI burndown data.
 * 
 * @param piName - The name of the PI to fetch burndown data for
 * @param issueType - Type of issues to include in burndown (optional)
 * @param teamName - Name of the team (optional)
 * @param project - Project name (optional)
 * @returns Object containing burndown data, loading state, error state, and refetch function
 */
export function usePIBurndown(piName?: string, issueType?: string, teamName?: string, project?: string): UsePIBurndownReturn {
  const [data, setData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!piName) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getPIBurndownData(piName, issueType, teamName, project);
      setData(response.data.burndown_data || []);
    } catch (err) {
      console.error('Error fetching PI burndown:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PI burndown data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [piName, issueType, teamName, project]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}


