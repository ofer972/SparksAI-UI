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
 * Custom hook for fetching AI cards data for a specific team with recommendations.
 * 
 * @param teamName - The name of the team to fetch AI cards for
 * @param categories - Optional category filters array
 * @param isGroup - Optional boolean indicating if the teamName is a group (true) or a team (false)
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function useAICards(teamName?: string, categories?: string[], isGroup?: boolean): UseAICardsReturn {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable reference for categories array to avoid unnecessary re-fetches
  const categoriesKey = useMemo(() => JSON.stringify(categories || []), [categories]);

  const fetchCards = useCallback(async () => {
    console.log('[useAICards] fetchCards called with teamName:', teamName, 'categories:', categories, 'isGroup:', isGroup);
    
    if (!teamName || teamName.trim() === '') {
      console.log('[useAICards] No team name, skipping fetch');
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useAICards] Fetching cards for team:', teamName, 'categories:', categories, 'isGroup:', isGroup);
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      // Use the new endpoint with recommendations, pass categories and isGroup if provided
      const response = await apiService.getTeamAICardsWithRecommendations(teamName, categories, isGroup);
      console.log('[useAICards] Received cards for team:', teamName, 'count:', response.ai_cards?.length || 0);
      setCards(response.ai_cards || []);
    } catch (err) {
      console.error('[useAICards] Error fetching AI cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [teamName, categoriesKey, categories, isGroup]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}


