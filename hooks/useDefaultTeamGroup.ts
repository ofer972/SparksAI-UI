import { useEffect, useRef } from 'react';
import { getUserPreferences } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

interface UseDefaultTeamGroupOptions {
  selectedTeamValue: string | null;
  setSelectedTeamValue: (value: string | null) => void;
  setSelectedTeamType: (type: 'team' | 'group' | null) => void;
  setSelectedTeamName: (name: string | null) => void;
}

/**
 * Hook to automatically load and set the default team/group from user preferences.
 * Only runs once when component mounts and teams are loaded.
 * 
 * Used by Goals menu items: Goal Progress, Define PI Goals, Define Sprint Goals
 */
export function useDefaultTeamGroup({
  selectedTeamValue,
  setSelectedTeamValue,
  setSelectedTeamType,
  setSelectedTeamName,
}: UseDefaultTeamGroupOptions) {
  const { teams, groups, loading: teamsLoading } = useTeamsGroups();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Skip if already initialized (prevents infinite loops)
    if (hasInitializedRef.current) return;
    // Wait for teams to finish loading
    if (teamsLoading) return;
    // Wait for teams to be available
    if (teams.length === 0) return;
    // Skip if team is already selected (user manually selected)
    if (selectedTeamValue) {
      hasInitializedRef.current = true;
      return;
    }

    // Mark as initialized to prevent multiple attempts
    hasInitializedRef.current = true;

    const currentUser = getCurrentUser();
    if (currentUser?.id) {
      getUserPreferences(currentUser.id)
        .then(preferences => {
          if (preferences?.default_team_or_group && preferences.default_type) {
            let teamGroupName = preferences.default_team_or_group;
            // Clean if has old format
            if (teamGroupName.includes(':')) {
              teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
            }

            if (preferences.default_type === 'group') {
              // Find the group in the groups list
              const group = groups.find(g => g.group_name === teamGroupName);

              if (group) {
                const treeValue = `group:${group.group_key}`;
                setSelectedTeamValue(treeValue);
                setSelectedTeamType('group');
                setSelectedTeamName(teamGroupName);
              }
            } else {
              // Find the team in the teams list
              const team = teams.find(t => t.team_name === teamGroupName);

              if (team) {
                const treeValue = `team:${team.team_key}`;
                setSelectedTeamValue(treeValue);
                setSelectedTeamType('team');
                setSelectedTeamName(teamGroupName);
              }
            }
          }
        })
        .catch(err => {
          // Silently fail - user can select manually
          console.error('[useDefaultTeamGroup] Failed to load user preferences:', err);
        });
    }
  }, [teamsLoading, teams, groups, selectedTeamValue, setSelectedTeamValue, setSelectedTeamType, setSelectedTeamName]);
}

