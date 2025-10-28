'use client';

import { usePIRecommendations } from '@/hooks/usePIRecommendations';
import RecommendationsInsight from './insights/RecommendationsInsight';

interface PIRecommendationsProps {
  piName: string;
}

export default function PIRecommendations({ piName }: PIRecommendationsProps) {
  const { recommendations, loading, error, refetch } = usePIRecommendations(piName, 3);

  return (
    <RecommendationsInsight
      recommendations={recommendations}
      loading={loading}
      error={error}
      onRefetch={refetch}
      title="Recommendations"
      emptyMessage={`No recommendations available for ${piName}`}
      maxItems={3}
    />
  );
}
