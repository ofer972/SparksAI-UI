'use client';

import React, { useMemo } from 'react';
import { useAICards } from '@/hooks/useAICards';
import ReactMarkdown from 'react-markdown';

import type { AICard } from '@/lib/config';

type Props = {
  piName?: string;
  teamOrGroupName?: string;
  isGroup?: boolean;
  onOpenCard: (card: AICard) => void;
  onOpenAll: () => void;
};

function priorityBadgeClass(priority: string, priorityColor?: string) {
  const color = (priorityColor || '').toLowerCase();
  const p = (priority || '').toLowerCase();

  if (color === 'red' || p === 'critical') return 'bg-danger-bg text-red-700 text-red-400 border-red-200 dark:border-red-700';
  if (color === 'yellow' || p === 'high') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-700';
  if (color === 'green' || p === 'low') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 text-emerald-400 border-emerald-200 dark:border-emerald-700';
  if (p === 'medium') return 'bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-700';
  return 'bg-surface-elevated/50 text-content-secondary border-outline';
}

export default function PIInsightsPreview({
  piName,
  teamOrGroupName,
  isGroup,
  onOpenCard,
  onOpenAll,
}: Props) {
  // Use PI Events and PI Status categories - memoized to prevent infinite loops
  const categories = useMemo(() => ['PI Events', 'PI Status'], []);
  const { cards, loading, error } = useAICards(piName, teamOrGroupName, categories, isGroup);

  const topCards = useMemo(() => cards.slice(0, 3), [cards]);

  // Render content directly without wrapper (wrapper is handled by parent)
  return (
    <div className="h-full">
      {!teamOrGroupName || !piName ? (
        <div className="text-xs text-content-tertiary">
          {!teamOrGroupName ? 'Set a default team/group' : 'Loading PI'} to see PI insights.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-content-tertiary">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
          Loading…
        </div>
      ) : error ? (
        <div className="text-xs text-danger-text">Failed to load: {error}</div>
      ) : topCards.length === 0 ? (
        <div className="text-xs text-content-tertiary">No PI insights available yet.</div>
      ) : (
        <div className="space-y-2">
          {topCards.map((card) => {
            const anyCard = card as any;
            const badgeCls = priorityBadgeClass(card.priority, anyCard.priority_color);
            const summary = (anyCard.short_summary || card.description || '').trim();
            const short = summary.length > 120 ? `${summary.slice(0, 120)}…` : summary;

            return (
              <button
                key={card.id}
                type="button"
                className="w-full text-left rounded-lg border border-outline hover:border-outline-strong hover:bg-surface-elevated/50 transition-colors p-2"
                onClick={() => onOpenCard(card)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-content-primary truncate">
                      {card.card_name || 'Insight'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-content-tertiary">
                      {short ? <ReactMarkdown>{short}</ReactMarkdown> : '—'}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeCls}`}>
                    {card.priority || 'Info'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
