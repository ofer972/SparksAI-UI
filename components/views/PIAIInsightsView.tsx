'use client';

import React from 'react';
import PIAICards from '@/components/PIAICards';

interface PIAIInsightsViewProps {
  selectedPI: string;
  isLoading: boolean;
  isReady: boolean;
}

export default function PIAIInsightsView({
  selectedPI,
  isLoading,
  isReady,
}: PIAIInsightsViewProps) {
  // Wait for settings to load before rendering to avoid fetching with wrong PI
  if (!isReady || isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PI insights...</p>
        </div>
      </div>
    );
  }
  
  // Check if no PI is selected (after settings are loaded)
  const noPISelected = !selectedPI || 
    selectedPI.trim() === '' || 
    selectedPI === 'Select PI';
  
  if (noPISelected) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a PI</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Please select a PI from the dropdown above to view AI insights.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto">
      <div className="p-2" style={{ zoom: 0.90 }}>
        {/* PI AI Cards Section */}
        <div className="mb-4">
          <PIAICards piName={selectedPI} />
        </div>
      </div>
    </div>
  );
}

