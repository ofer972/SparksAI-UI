import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { AICard } from '@/lib/config';

interface UseAICardsReturn {
  cards: AICard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching AI cards data for a specific team with recommendations.
 * 
 * @param teamName - The name of the team to fetch AI cards for
 * @param category - Optional category filter (if multiple selected, uses first one)
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function useAICards(teamName?: string, category?: string): UseAICardsReturn {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!teamName) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      // Use the new endpoint with recommendations, pass category if provided
      const selectedCategory = category || undefined;
      const response = await apiService.getTeamAICardsWithRecommendations(teamName, selectedCategory);
      setCards(response.ai_cards || []);
    } catch (err) {
      console.error('Error fetching AI cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [teamName, category]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}


