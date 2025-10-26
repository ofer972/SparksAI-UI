'use client';

import { useState, useEffect } from 'react';

interface TeamFilterProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  className?: string;
}

interface TeamResponse {
  success: boolean;
  data: {
    teams: string[];
    count: number;
  };
  message: string;
}

export default function TeamFilter({ selectedTeam, onTeamChange, className = '' }: TeamFilterProps) {
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://sparksai-backend-production.up.railway.app/api/v1/teams/getNames');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: TeamResponse = await response.json();
        
        if (data.success && data.data.teams) {
          setTeams(data.data.teams);
          // Set default team if none selected
          if (!selectedTeam && data.data.teams.length > 0) {
            onTeamChange(data.data.teams[0]);
          }
        } else {
          throw new Error(data.message || 'Failed to fetch teams');
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch teams');
        // Fallback to default team
        setTeams(['AutoDesign-Dev']);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTeam, onTeamChange]);

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs font-medium text-gray-700">Team:</span>
        <select className="border border-gray-300 rounded px-2 py-1 text-xs" disabled>
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs font-medium text-gray-700">Team:</span>
        <select className="border border-gray-300 rounded px-2 py-1 text-xs" disabled>
          <option>Error loading teams</option>
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-xs font-medium text-gray-700">Team:</span>
      <select
        value={selectedTeam}
        onChange={(e) => onTeamChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-xs"
      >
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
  );
}
