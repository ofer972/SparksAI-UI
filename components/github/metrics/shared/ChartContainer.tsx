'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  children?: ReactNode;
}

/**
 * Shared chart container component
 * Provides consistent styling and empty state for all metric charts
 */
export default function ChartContainer({ children }: ChartContainerProps) {
  return (
    <div className="flex-1 h-full min-h-[200px]">
      {children || (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">No data available</div>
        </div>
      )}
    </div>
  );
}



