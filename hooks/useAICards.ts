import { useCallback, useEffect, useState, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { AICard } from '@/lib/config';

interface UseAICardsReturn {
  cards: AICard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching AI cards data with recommendations.
 * 
 * @param piName - Optional PI name to filter by
 * @param teamName - Optional team name to filter by
 * @param categories - Optional category filters array
 * @param isGroup - Optional boolean indicating if the teamName is a group (true) or a team (false)
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function useAICards(piName?: string, teamName?: string, categories?: string[], isGroup?: boolean): UseAICardsReturn {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable reference for categories array to avoid unnecessary re-fetches
  const categoriesKey = useMemo(() => JSON.stringify(categories || []), [categories]);

  const fetchCards = useCallback(async () => {
    console.log('[useAICards] fetchCards called with piName:', piName, 'teamName:', teamName, 'categories:', categories, 'isGroup:', isGroup);
    
    if ((!piName || piName.trim() === '') && (!teamName || teamName.trim() === '')) {
      console.log('[useAICards] No PI or team name, skipping fetch');
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useAICards] Fetching cards for piName:', piName, 'teamName:', teamName, 'categories:', categories, 'isGroup:', isGroup);
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      // Use the unified endpoint with recommendations, pass piName, teamName, categories and isGroup
      const response = await apiService.getAICardsWithRecommendations(
        piName || '',  // Use piName if provided, otherwise empty string
        teamName,
        isGroup,
        categories
      );
      console.log('[useAICards] Received cards, count:', response.ai_cards?.length || 0);
      setCards(response.ai_cards || []);
    } catch (err) {
      console.error('[useAICards] Error fetching AI cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [piName, teamName, categoriesKey, categories, isGroup]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}


