'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  children?: ReactNode;
}

/**
 * Shared chart container component
 * Provides consistent styling and empty state for all metric charts
 * 
 * Uses the same pattern as other working reports (IssuesTrendChartView, BurndownChart)
 * with h-full and min-h for Chart.js to properly fill the container
 */
export default function ChartContainer({ children }: ChartContainerProps) {
  return (
    <div className="relative w-full h-full min-h-[200px]">
      {children || (
        <div className="flex items-center justify-center h-full">
          <div className="text-content-muted">No data available</div>
        </div>
      )}
    </div>
  );
}



