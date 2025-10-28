import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { AICard, AICardsResponse } from '@/lib/config';

interface UsePIAICardsReturn {
  cards: AICard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI AI cards data for a specific PI.
 * 
 * @param piName - The name of the PI to fetch AI cards for
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function usePIAICards(piName?: string): UsePIAICardsReturn {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!piName) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getPIAICards(piName);
      setCards(response.ai_cards || []);
    } catch (err) {
      console.error('Error fetching PI AI cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PI AI cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [piName]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}
