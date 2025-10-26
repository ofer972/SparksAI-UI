'use client';

import React, { useState } from 'react';
import BurndownChart from './BurndownChart';

interface TeamDashboardProps {
  selectedTeam: string;
}

export default function TeamDashboard({ selectedTeam }: TeamDashboardProps) {
  const [burndownCollapsed, setBurndownCollapsed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm pt-2 pb-4 px-4">
        <div className="flex items-center mb-3">
          <button 
            onClick={() => setBurndownCollapsed(!burndownCollapsed)}
            className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
          >
            {burndownCollapsed ? '▼' : '▲'}
          </button>
          <h2 className="text-lg font-semibold">Sprint Burndown Chart</h2>
        </div>
        {!burndownCollapsed && (
          <BurndownChart
            teamName={selectedTeam}
            issueType="all"
          />
        )}
      </div>
      
      {/* Future charts and components will be added here */}
    </div>
  );
}
