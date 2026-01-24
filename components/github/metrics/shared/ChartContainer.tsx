'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  children?: ReactNode;
}

/**
 * Shared chart container component
 * Provides consistent styling and empty state for all metric charts
 * 
 * Uses relative positioning with absolute child so Chart.js can properly fill 
 * the container when maintainAspectRatio is false
 */
export default function ChartContainer({ children }: ChartContainerProps) {
  return (
    <div className="relative flex-1 min-h-0 w-full">
      <div className="absolute inset-0">
        {children || (
          <div className="flex items-center justify-center h-full">
            <div className="text-content-muted">No data available</div>
          </div>
        )}
      </div>
    </div>
  );
}



