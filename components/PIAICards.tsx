'use client';

import { usePIAICards } from '@/hooks/usePIAICards';
import AICardsInsight from './insights/AICardsInsight';
import { piAICardsConfig } from '@/lib/piAICardsConfig';

interface PIAICardsProps {
  piName: string;
}

export default function PIAICards({ piName }: PIAICardsProps) {
  const { cards, loading, error, refetch } = usePIAICards(piName);

  return (
    <AICardsInsight
      cards={cards}
      loading={loading}
      error={error}
      onRefetch={refetch}
      title="PI AI Insights"
      emptyMessage={`No AI insights available for ${piName} at this time.`}
      config={piAICardsConfig}
      chatType="PI_insights"
      piName={piName}
    />
  );
}
