'use client';

import { useAICards } from '@/hooks';
import AICardsInsight from './insights/AICardsInsight';
import { teamAICardsConfig } from '@/lib/teamAICardsConfig';

interface AICardProps {
  teamName: string;
  category?: string;
}

export default function AICards({ teamName, category }: AICardProps) {
  const { cards, loading, error, refetch } = useAICards(teamName, category);

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
