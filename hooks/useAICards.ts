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
 * Custom hook for fetching AI cards data for a specific team.
 * 
 * @param teamName - The name of the team to fetch AI cards for
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function useAICards(teamName?: string): UseAICardsReturn {
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
      const response = await apiService.getAICards(teamName);
      setCards(response.ai_cards || []);
    } catch (err) {
      console.error('Error fetching AI cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [teamName]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}


