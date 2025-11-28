'use client';

import { useAICards } from '@/hooks';
import AICardsInsight from './insights/AICardsInsight';
import { teamAICardsConfig } from '@/lib/teamAICardsConfig';

interface AICardProps {
  teamName?: string;
  categories?: string[];
}

export default function AICards({ teamName, categories }: AICardProps) {
  const { cards, loading, error, refetch } = useAICards(teamName, categories);

  // Don't render if no team name is provided
  if (!teamName || teamName.trim() === '') {
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
