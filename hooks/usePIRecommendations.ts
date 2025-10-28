import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { Recommendation, RecommendationsResponse } from '@/lib/config';

interface UsePIRecommendationsReturn {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI recommendations data for a specific PI.
 * 
 * @param piName - The name of the PI to fetch recommendations for
 * @param limit - Maximum number of recommendations to return (default: 3)
 * @returns Object containing recommendations data, loading state, error state, and refetch function
 */
export function usePIRecommendations(piName?: string, limit: number = 3): UsePIRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!piName) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getPIRecommendations(piName);
      const items = response.recommendations || [];
      setRecommendations(items.slice(0, limit));
    } catch (err) {
      console.error('Error fetching PI recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PI recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [piName, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refetch: fetchRecommendations };
}
