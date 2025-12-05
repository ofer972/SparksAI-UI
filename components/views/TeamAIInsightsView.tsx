'use client';

import React from 'react';
import AICards from '@/components/AICards';
import TeamMetrics from '@/components/TeamMetrics';

interface TeamAIInsightsViewProps {
  selectedTeam: string;
  selectedTreeType: 'team' | 'group';
  selectedCategories: string[];
  isLoading: boolean;
  isReady: boolean;
}

export default function TeamAIInsightsView({
  selectedTeam,
  selectedTreeType,
  selectedCategories,
  isLoading,
  isReady,
}: TeamAIInsightsViewProps) {
  // Wait for settings to load before rendering to avoid fetching with wrong team
  if (!isReady || isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team insights...</p>
        </div>
      </div>
    );
  }
  
  // Check if no team is selected (after settings are loaded)
  const noTeamSelected = !selectedTeam || 
    selectedTeam.trim() === '' || 
    selectedTeam === 'Select team or group' ||
    selectedTeam.trim() === 'Select team or group';
  
  if (noTeamSelected) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a Team or Group</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Please select a team or group from the dropdown above to view AI insights and metrics.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="pt-2 pb-2 pr-2 pl-[7px]" style={{ zoom: 0.90 }}>
        <AICards 
          teamName={selectedTeam} 
          categories={selectedCategories.length > 0 ? selectedCategories : undefined}
          isGroup={selectedTreeType === 'group'}
        />
      </div>
      {/* Team Metrics on mobile - inline after content */}
      <div className="md:hidden mt-4 border-t border-gray-200 bg-white" style={{ zoom: 0.90 }}>
        <div className="px-3 py-2">
          <TeamMetrics teamName={selectedTeam} isGroup={selectedTreeType === 'group'} />
        </div>
      </div>
    </>
  );
}

