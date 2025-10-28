'use client';

import React, { useState, useEffect } from 'react';
import BurndownChart from './SprintBurndownChart';
import ClosedSprints from './ClosedSprints';
import IssuesTrendChart from './IssuesTrendChart';

interface TeamDashboardProps {
  selectedTeam: string;
}

export default function TeamDashboard({ selectedTeam }: TeamDashboardProps) {
  const [burndownCollapsed, setBurndownCollapsed] = useState(false);
  const [issuesTrendCollapsed, setIssuesTrendCollapsed] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState('');
  const [currentSprintName, setCurrentSprintName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sample sprint data - in the future this will come from API
  const sprintOptions = [
    { value: '', label: 'All Sprints' },
    { value: 'IDPS-DEV-2025-10-19', label: 'IDPS-DEV-2025-10-19' },
    { value: 'IDPS-DEV-2025-10-05', label: 'IDPS-DEV-2025-10-05' },
    { value: 'IDPS-DEV-2025-09-21', label: 'IDPS-DEV-2025-09-21' },
    { value: 'IDPS-DEV-2025-09-07', label: 'IDPS-DEV-2025-09-07' },
    { value: 'IDPS-DEV-2025-08-24', label: 'IDPS-DEV-2025-08-24' },
    { value: 'IDPS-DEV-2025-08-10', label: 'IDPS-DEV-2025-08-10' },
    { value: 'IDPS-DEV-2025-07-27', label: 'IDPS-DEV-2025-07-27' },
    { value: 'IDPS-DEV-2025-07-13', label: 'IDPS-DEV-2025-07-13' },
    { value: 'IDPS-DEV-2025-06-29', label: 'IDPS-DEV-2025-06-29' },
  ];

  // Simulate loading when team changes
  useEffect(() => {
    setIsLoading(true);
    setSelectedSprint(''); // Clear sprint selection when team changes
    setCurrentSprintName(''); // Clear current sprint name
    // Simulate API call delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Reduced from 1500ms to 800ms
    
    return () => clearTimeout(timer);
  }, [selectedTeam]);

  return (
    <div className="space-y-4">
      <ClosedSprints 
        selectedTeam={selectedTeam} 
        isLoading={isLoading} 
        isVisible={true}
      />
      
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
          <div className="space-y-3">
            {/* Sprint Filter and Name */}
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">Sprint:</label>
                <select
                  value={selectedSprint}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {sprintOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 text-center text-sm font-medium text-gray-800" style={{ transform: 'translateX(-80px)' }}>
                {currentSprintName || 'Loading...'}
              </div>
              <div className="w-24"></div> {/* Spacer to balance the layout */}
            </div>
            
            <BurndownChart
              teamName={selectedTeam}
              issueType="all"
              sprintName={selectedSprint || undefined}
              onSprintNameChange={setCurrentSprintName}
              isVisible={!burndownCollapsed}
            />
          </div>
        )}
      </div>
      
      {/* Issues Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm pt-2 pb-4 px-4">
        <div className="flex items-center mb-3">
          <button 
            onClick={() => setIssuesTrendCollapsed(!issuesTrendCollapsed)}
            className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
          >
            {issuesTrendCollapsed ? '▼' : '▲'}
          </button>
          <h2 className="text-lg font-semibold">Bugs Created and Resolved Over Time</h2>
        </div>
        {!issuesTrendCollapsed && (
          <IssuesTrendChart
            teamName={selectedTeam}
            issueType="Bug"
            months={6}
            isVisible={!issuesTrendCollapsed}
          />
        )}
      </div>
      
      {/* Future charts and components will be added here */}
    </div>
  );
}
