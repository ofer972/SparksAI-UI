'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface TeamFilterProps {
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  className?: string;
}

export default function TeamFilter({ selectedTeam, onTeamChange, className = '' }: TeamFilterProps) {
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiService = new ApiService();
        const response = await apiService.getTeams();
        
        setTeams(response.teams);
        // Set default team if none selected
        if (!selectedTeam && response.teams.length > 0) {
          onTeamChange(response.teams[0]);
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
