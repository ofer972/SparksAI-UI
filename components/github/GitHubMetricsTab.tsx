'use client';

import { ReactNode } from 'react';

interface GitHubMetricsTabProps {
  cards: ReactNode[];
  cardHeight?: string;
}

export default function GitHubMetricsTab({ 
  cards, 
  cardHeight = '360px' 
}: GitHubMetricsTabProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4 pb-1 max-w-[85%] ml-0 pt-2">
          {cards.map((card, index) => (
            <div key={index} style={{ height: cardHeight }}>
              {card}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

