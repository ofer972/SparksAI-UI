import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { Recommendation } from '@/lib/config';

interface UseRecommendationsReturn {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching recommendations data for a specific team.
 * 
 * @param teamName - The name of the team to fetch recommendations for
 * @param limit - Maximum number of recommendations to return (default: 3)
 * @returns Object containing recommendations data, loading state, error state, and refetch function
 */
export function useRecommendations(teamName?: string, limit: number = 3): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!teamName) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getRecommendations(teamName);
      const items = response.recommendations || [];
      setRecommendations(items.slice(0, limit));
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [teamName, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refetch: fetchRecommendations };
}


