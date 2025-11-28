'use client';

import { useRecommendations } from '@/hooks';
import RecommendationsInsight from './insights/RecommendationsInsight';

interface RecommendationsProps {
  teamName?: string;
}

export default function Recommendations({ teamName }: RecommendationsProps) {
  const { recommendations, loading, error, refetch } = useRecommendations(teamName, 3);

  // Don't render if no team name is provided
  if (!teamName || teamName.trim() === '') {
    return null;
  }

  return (
    <RecommendationsInsight
      recommendations={recommendations}
      loading={loading}
      error={error}
      onRefetch={refetch}
      title="Recommendations"
      emptyMessage={`No recommendations available for ${teamName}`}
      maxItems={3}
    />
  );
}
