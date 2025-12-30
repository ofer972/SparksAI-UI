'use client';

import { useAICards } from '@/hooks';
import AICardsInsight from './insights/AICardsInsight';
import { aiCardsConfig } from '@/lib/aiCardsConfig';

interface AICardProps {
  piName?: string;
  teamName?: string;
  categories?: string[];
  isGroup?: boolean;
}

export default function AICards({ piName, teamName, categories, isGroup }: AICardProps) {
  console.log('[AICards] Rendering with piName:', piName, 'teamName:', teamName, 'categories:', categories, 'isGroup:', isGroup);
  const { cards, loading, error, refetch } = useAICards(piName, teamName, categories, isGroup);
  console.log('[AICards] Hook returned - cards:', cards.length, 'loading:', loading, 'error:', error);

  // Don't render if no PI or team name is provided
  if ((!piName || piName.trim() === '') && (!teamName || teamName.trim() === '')) {
    console.log('[AICards] No PI or team name, returning null');
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
      config={aiCardsConfig}
      chatType="Team_insights"
    />
  );
}
