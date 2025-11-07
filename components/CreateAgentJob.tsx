'use client';

import React, { useState } from 'react';
import { ApiService } from '@/lib/api';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';

interface CreateAgentJobProps {
  selectedTeam: string;
  selectedPI: string;
  onTeamChange?: (team: string) => void;
  onPIChange?: (pi: string) => void;
}

type JobType = 'Sprint Goal' | 'Daily Agent' | 'Team Retrospective Preparation' | 'PI Sync' | 'Team PI Insight';

export default function CreateAgentJob({ 
  selectedTeam, 
  selectedPI, 
  onTeamChange, 
  onPIChange 
}: CreateAgentJobProps) {
  const [localSelectedTeam, setLocalSelectedTeam] = useState(selectedTeam);
  const [localSelectedPI, setLocalSelectedPI] = useState(selectedPI);
  const [loading, setLoading] = useState({
    sprintGoal: false,
    dailyAgent: false,
    teamRetrospective: false,
    piSync: false,
    teamPiInsight: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const apiService = new ApiService();

  // Use local state if no onChange handlers provided, otherwise use controlled
  const currentTeam = onTeamChange ? selectedTeam : localSelectedTeam;
  const currentPI = onPIChange ? selectedPI : localSelectedPI;
  
  const handleTeamChange = (team: string) => {
    if (onTeamChange) {
      onTeamChange(team);
    } else {
      setLocalSelectedTeam(team);
    }
  };

  const handlePIChange = (pi: string) => {
    if (onPIChange) {
      onPIChange(pi);
    } else {
      setLocalSelectedPI(pi);
    }
  };

  const handleCreateJob = async (jobType: JobType) => {
    const loadingKey = jobType === 'Sprint Goal' ? 'sprintGoal' : 
                     jobType === 'Daily Agent' ? 'dailyAgent' : 
                     jobType === 'Team Retrospective Preparation' ? 'teamRetrospective' :
                     jobType === 'PI Sync' ? 'piSync' : 'teamPiInsight';
    
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setMessage(null);

    try {
      if (jobType === 'PI Sync') {
        if (!currentPI) {
          throw new Error('Please select a PI');
        }
        await apiService.createPiAgentJob(jobType, currentPI);
      } else if (jobType === 'Team PI Insight') {
        if (!currentTeam) {
          throw new Error('Please select a team');
        }
        if (!currentPI) {
          throw new Error('Please select a PI');
        }
        await apiService.createPiJobForTeam(jobType, currentPI, currentTeam);
      } else {
        if (!currentTeam) {
          throw new Error('Please select a team');
        }
        await apiService.createTeamAgentJob(jobType, currentTeam);
      }

      setMessage({ type: 'success', text: `${jobType} job created successfully!` });
    } catch (error) {
      console.error(`Error creating ${jobType} job:`, error);
      setMessage({ 
        type: 'error', 
        text: `Failed to create ${jobType} job: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 relative">
          
          {/* Sprint Goal Row */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-lg font-medium text-gray-900 mr-4">Sprint Goal</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                <TeamFilter
                  selectedTeam={currentTeam}
                  onTeamChange={handleTeamChange}
                />
                <button
                  onClick={() => handleCreateJob('Sprint Goal')}
                  disabled={loading.sprintGoal || !currentTeam}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.sprintGoal ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>

          {/* Daily Agent Row */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-lg font-medium text-gray-900 mr-4">Daily Agent</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                <TeamFilter
                  selectedTeam={currentTeam}
                  onTeamChange={handleTeamChange}
                />
                <button
                  onClick={() => handleCreateJob('Daily Agent')}
                  disabled={loading.dailyAgent || !currentTeam}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.dailyAgent ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>

          {/* Team Retrospective Preparation Row */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-lg font-medium text-gray-900 mr-4">Team Retrospective Preparation</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                <TeamFilter
                  selectedTeam={currentTeam}
                  onTeamChange={handleTeamChange}
                />
                <button
                  onClick={() => handleCreateJob('Team Retrospective Preparation')}
                  disabled={loading.teamRetrospective || !currentTeam}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.teamRetrospective ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>

          {/* PI Sync Row */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="text-lg font-medium text-gray-900 mr-4">PI Sync</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                <PIFilter
                  selectedPI={currentPI}
                  onPIChange={handlePIChange}
                />
                <button
                  onClick={() => handleCreateJob('PI Sync')}
                  disabled={loading.piSync || !currentPI}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.piSync ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>

          {/* Team PI Insight Row */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 mr-4">Team PI Insight</h3>
              <div className="flex items-center space-x-4 flex-1">
                <TeamFilter
                  selectedTeam={currentTeam}
                  onTeamChange={handleTeamChange}
                />
                <PIFilter
                  selectedPI={currentPI}
                  onPIChange={handlePIChange}
                />
                <button
                  onClick={() => handleCreateJob('Team PI Insight')}
                  disabled={loading.teamPiInsight || !currentTeam || !currentPI}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.teamPiInsight ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Success/Error Message - Fixed at bottom */}
          {message && (
            <div className={`p-4 rounded-lg mt-6 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

