'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import AICardsInsight from './insights/AICardsInsight';
import type { AICard } from '@/lib/aiCardsConfig';

interface InsightCardWidgetProps {
  cardId: string;
  filters?: Record<string, any>;
  onClose?: () => void;
}

export default function InsightCardWidget({ cardId, filters, onClose }: InsightCardWidgetProps) {
  const [card, setCard] = useState<AICard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCard();
  }, [cardId, filters]);

  const loadCard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the specific insight card
      const api = new ApiService();
      const response = await fetch(
        `/api/ai-insights?insight_type=${filters?.insight_type || 'team'}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch insight card');
      }
      
      const data = await response.json();
      const cards = data.data || data || [];
      const foundCard = cards.find((c: AICard) => c.id.toString() === cardId);
      
      if (foundCard) {
        setCard(foundCard);
      } else {
        setError('Insight card not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load insight card');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Insight card not found
      </div>
    );
  }

  return (
    <div className="h-full">
      <AICardsInsight
        cards={[card]}
        loading={false}
        error={null}
        onRefetch={loadCard}
        title="Insight Card"
        emptyMessage="No insight data available"
        config={{} as any}
        chatType="Team_insights"
      />
    </div>
  );
}


