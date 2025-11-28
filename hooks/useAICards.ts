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
 * @returns Object containing cards data, loading state, error state, and refetch function
 */
export function useAICards(teamName?: string, categories?: string[]): UseAICardsReturn {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable reference for categories array to avoid unnecessary re-fetches
  const categoriesKey = useMemo(() => JSON.stringify(categories || []), [categories]);

  const fetchCards = useCallback(async () => {
    console.log('[useAICards] fetchCards called with teamName:', teamName, 'categories:', categories);
    
    if (!teamName || teamName.trim() === '') {
      console.log('[useAICards] No team name, skipping fetch');
      setCards([]);
      setLoading(false);
      return;
    }

    // Create a flag to track if this request is still valid
    let isCancelled = false;
    const currentTeam = teamName;

    try {
      console.log('[useAICards] Fetching cards for team:', teamName, 'categories:', categories);
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      // Use the new endpoint with recommendations, pass categories if provided
      const response = await apiService.getTeamAICardsWithRecommendations(teamName, categories);
      
      // Only update state if this request hasn't been cancelled
      if (!isCancelled) {
        console.log('[useAICards] Received cards for team:', currentTeam, 'count:', response.ai_cards?.length || 0);
        setCards(response.ai_cards || []);
      } else {
        console.log('[useAICards] Request cancelled for team:', currentTeam, 'ignoring response');
      }
    } catch (err) {
      if (!isCancelled) {
        console.error('[useAICards] Error fetching AI cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
        setCards([]);
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }

    // Return cleanup function
    return () => {
      isCancelled = true;
      console.log('[useAICards] Cancelling request for team:', currentTeam);
    };
  }, [teamName, categoriesKey, categories]);

  useEffect(() => {
    const cleanup = fetchCards();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => {
          if (cleanupFn) cleanupFn();
        });
      }
    };
  }, [fetchCards]);

  return { cards, loading, error, refetch: fetchCards };
}


