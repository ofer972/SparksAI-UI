'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ApiService, Group, Team } from '@/lib/api';

interface TreeNode {
  type: 'group' | 'team';
  id: number;
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

interface TeamsGroupsContextValue {
  groups: Group[];
  teams: Team[];
  treeData: TreeNode[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTeamsByGroupId: (groupId: number) => Team[];
  getGroupById: (groupId: number) => Group | undefined;
  getTeamById: (teamId: number) => Team | undefined;
}

const TeamsGroupsContext = createContext<TeamsGroupsContextValue | null>(null);

export function useTeamsGroups() {
  const context = useContext(TeamsGroupsContext);
  if (!context) {
    throw new Error('useTeamsGroups must be used within TeamsGroupsProvider');
  }
  return context;
}

interface TeamsGroupsProviderProps {
  children: React.ReactNode;
}

export function TeamsGroupsProvider({ children }: TeamsGroupsProviderProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const apiService = useMemo(() => new ApiService(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupsData, teamsData] = await Promise.all([
        apiService.getAllGroups(),
        apiService.getAllTeams(),
      ]);
      
      setGroups(groupsData.groups || []);
      setTeams(teamsData.teams || []);
    } catch (err) {
      console.error('Failed to load teams/groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildTree = useCallback((): TreeNode[] => {
    const groupMap = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes for all groups
    groups.forEach((group) => {
      const node: TreeNode = {
        type: 'group',
        id: group.group_key,
        name: group.group_name,
        data: group,
        children: [],
      };
      groupMap.set(group.group_key, node);
    });

    // Build group hierarchy
    groups.forEach((group) => {
      const node = groupMap.get(group.group_key)!;
      if (group.parent_group_key !== null && group.parent_group_key !== undefined) {
        const parent = groupMap.get(group.parent_group_key);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Add teams to their groups or as roots
    // With many-to-many, a team can appear in multiple groups
    teams.forEach((team) => {
      if (team.group_keys && team.group_keys.length > 0) {
        // Add this team to each of its groups
        team.group_keys.forEach((groupKey) => {
          const teamNode: TreeNode = {
            type: 'team',
            id: team.team_key,
            name: team.team_name,
            data: team,
            children: [],
          };

          const parent = groupMap.get(groupKey);
          if (parent) {
            parent.children.push(teamNode);
          } else {
            // Group doesn't exist, add to roots
            roots.push(teamNode);
          }
        });
      } else {
        // Team has no groups, add to roots
        const teamNode: TreeNode = {
          type: 'team',
          id: team.team_key,
          name: team.team_name,
          data: team,
          children: [],
        };
        roots.push(teamNode);
      }
    });

    return roots;
  }, [groups, teams]);

  const treeData = useMemo(() => buildTree(), [buildTree]);

  const getTeamsByGroupId = useCallback((groupId: number): Team[] => {
    return teams.filter(team => team.group_keys && team.group_keys.includes(groupId));
  }, [teams]);

  const getGroupById = useCallback((groupId: number): Group | undefined => {
    return groups.find(group => group.group_key === groupId);
  }, [groups]);

  const getTeamById = useCallback((teamId: number): Team | undefined => {
    return teams.find(team => team.team_id === teamId);
  }, [teams]);

  const value: TeamsGroupsContextValue = {
    groups,
    teams,
    treeData,
    loading,
    error,
    refresh: loadData,
    getTeamsByGroupId,
    getGroupById,
    getTeamById,
  };

  return (
    <TeamsGroupsContext.Provider value={value}>
      {children}
    </TeamsGroupsContext.Provider>
  );
}

