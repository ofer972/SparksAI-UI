'use client';

import React, { useMemo } from 'react';
import { useAICards } from '@/hooks/useAICards';

type Props = {
 piName?: string;
 teamOrGroupName?: string;
 isGroup?: boolean;
 onOpenCard: (card: { id: string; title: string; description?: string }) => void;
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

export default function HomeInsightsPreview({
 piName,
 teamOrGroupName,
 isGroup,
 onOpenCard,
 onOpenAll,
}: Props) {
 const { cards, loading, error } = useAICards(piName, teamOrGroupName, undefined, isGroup);

 const topCards = useMemo(() => cards.slice(0, 3), [cards]);

 return (
 <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="text-sm font-semibold text-content-primary">AI Insights</div>
 <div className="text-xs text-content-tertiary">
 Latest insights for {teamOrGroupName ? teamOrGroupName : 'your context'}
 {piName ? ` • ${piName}` : ''}
 </div>
 </div>
 <button
 type="button"
 onClick={onOpenAll}
 className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium whitespace-nowrap"
 >
 View all
 </button>
 </div>
 </div>

 <div className="p-4">
 {!teamOrGroupName && !piName ? (
 <div className="text-sm text-content-tertiary">
 Select a default team/group in Settings to see insights here.
 </div>
 ) : loading ? (
 <div className="flex items-center gap-3 text-sm text-content-tertiary">
 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400" />
 Loading insights…
 </div>
 ) : error ? (
 <div className="text-sm text-danger-text">Failed to load insights: {error}</div>
 ) : topCards.length === 0 ? (
 <div className="text-sm text-content-tertiary">No insights available yet.</div>
 ) : (
 <div className="space-y-3">
 {topCards.map((card) => {
 const anyCard = card as any;
 const badgeCls = priorityBadgeClass(card.priority, anyCard.priority_color);
 const description = (card.description || '').trim();
 const short = description.length > 170 ? `${description.slice(0, 170)}…` : description;

 return (
 <button
 key={card.id}
 type="button"
 className="w-full text-left rounded-xl border border-outline hover:border-outline-strong hover:bg-surface-elevated/50 transition-colors p-3"
 onClick={() =>
 onOpenCard({
 id: String(card.id),
 title: card.card_name || 'Insight',
 description: card.full_information || card.description || '',
 })
 }
 >
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <div className="text-sm font-semibold text-content-primary truncate">
 {card.card_name || 'Insight'}
 </div>
 <div className="mt-1 text-xs text-content-tertiary line-clamp-2">{short || '—'}</div>
 </div>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeCls}`}>
 {card.priority || 'Info'}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}

