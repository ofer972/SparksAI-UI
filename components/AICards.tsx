'use client';

import { useAICards } from '@/hooks';
import AICardsInsight from './insights/AICardsInsight';
import { teamAICardsConfig } from '@/lib/teamAICardsConfig';

interface AICardProps {
  teamName?: string;
  categories?: string[];
}

export default function AICards({ teamName, categories }: AICardProps) {
  console.log('[AICards] Rendering with teamName:', teamName, 'categories:', categories);
  const { cards, loading, error, refetch } = useAICards(teamName, categories);
  console.log('[AICards] Hook returned - cards:', cards.length, 'loading:', loading, 'error:', error);

  // Don't render if no team name is provided
  if (!teamName || teamName.trim() === '') {
    console.log('[AICards] No team name, returning null');
    return null;
  }

  return (
    <AICardsInsight
      cards={cards}
      loading={loading}
      error={error}
      onRefetch={refetch}
      title="Team AI Insights"
      emptyMessage={`No AI insights available for ${teamName} at this time.`}
      config={teamAICardsConfig}
      chatType="Team_insights"
    />
  );
}
