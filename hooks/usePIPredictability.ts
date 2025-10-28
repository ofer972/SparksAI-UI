import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { PIPredictabilityData } from '@/lib/config';

interface UsePIPredictabilityReturn {
  data: PIPredictabilityData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI predictability data.
 * 
 * @param piNames - Single PI name or array of PI names to fetch predictability data for
 * @param teamName - Name of the team (optional)
 * @returns Object containing predictability data, loading state, error state, and refetch function
 */
export function usePIPredictability(piNames?: string | string[], teamName?: string): UsePIPredictabilityReturn {
  const [data, setData] = useState<PIPredictabilityData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!piNames || (Array.isArray(piNames) && piNames.length === 0)) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getPIPredictability(piNames, teamName);
      setData(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Error fetching PI predictability:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PI predictability data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [piNames, teamName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}


