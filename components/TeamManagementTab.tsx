'use client';

import { useState, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { Group, Team } from '@/lib/config';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

interface TreeNode {
  id: string;
  type: 'group' | 'team';
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

export default function TeamManagementTab() {
  const { refresh: refreshContext } = useTeamsGroups(); // Get refresh function from context
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedTeams, setUnassignedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAssignTeamsModal, setShowAssignTeamsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showRemoveTeamModal, setShowRemoveTeamModal] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState<{ teamId: number; teamName: string; groupName: string; groupKey: number } | null>(null);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ groupId: number; groupName: string; teamCount: number } | null>(null);
  const [showDuplicateGroupError, setShowDuplicateGroupError] = useState(false);
  const [duplicateGroupName, setDuplicateGroupName] = useState<string>('');
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [editTeamMembers, setEditTeamMembers] = useState<number>(0);
  const [editTeamAIInsight, setEditTeamAIInsight] = useState<boolean>(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [editGroupAIInsight, setEditGroupAIInsight] = useState<boolean>(false);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [parentGroupId, setParentGroupId] = useState<number | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [activeTeamTab, setActiveTeamTab] = useState<'unassigned' | 'all'>('unassigned'); // New state for tab selection

  // Drag and drop states
  const [draggedTeam, setDraggedTeam] = useState<Team | null>(null);
  const [dropTargetGroup, setDropTargetGroup] = useState<number | null>(null);
  
  // Tab state for unassigned/all teams view
  const [teamViewTab, setTeamViewTab] = useState<'unassigned' | 'all'>('unassigned');

  const apiService = useMemo(() => new ApiService(), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading groups and teams...');
      const [groupsData, teamsData] = await Promise.all([
        apiService.getAllGroups(),
        apiService.getAllTeams(),
      ]);
      
      console.log('Groups data received:', groupsData);
      console.log('Teams data received:', teamsData);
      
      setGroups(groupsData.groups || []);
      setTeams(teamsData.teams || []);
      // With many-to-many, unassigned teams are those with no groups at all
      setUnassignedTeams((teamsData.teams || []).filter(t => !t.group_keys || t.group_keys.length === 0));
      
      console.log('Groups set:', groupsData.groups?.length || 0);
      console.log('Teams set:', teamsData.teams?.length || 0);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (): TreeNode[] => {
    console.log('[buildTree] Building tree from groups:', groups);
    console.log('[buildTree] Total groups:', groups.length);
    
    const rootGroups = groups.filter(g => !g.parent_group_key);
    console.log('[buildTree] Root groups found:', rootGroups.length, rootGroups);
    
    const visitedGroups = new Set<number>();
    
    const buildNode = (group: Group): TreeNode | null => {
      // Prevent infinite recursion by checking if we've already visited this group
      if (visitedGroups.has(group.group_key)) {
        console.warn(`Circular reference detected for group: ${group.group_name} (${group.group_key})`);
        return null;
      }
      
      // Mark this group as visited
      visitedGroups.add(group.group_key);
      
      const childGroups = groups.filter(g => g.parent_group_key === group.group_key);
      // With many-to-many, filter teams that include this group in their group_keys array
      const groupTeams = teams.filter(t => t.group_keys && t.group_keys.includes(group.group_key));
      
      console.log(`[buildTree] Building node for group "${group.group_name}": ${childGroups.length} child groups, ${groupTeams.length} teams`);
      
      const children: TreeNode[] = [
        ...childGroups.map(buildNode).filter((node): node is TreeNode => node !== null),
        ...groupTeams.map(team => ({
          id: `team-${team.team_key}`,
          type: 'team' as const,
          name: team.team_name,
          data: team,
          children: [],
        })),
      ];
      
      return {
        id: `group-${group.group_key}`,
        type: 'group',
        name: group.group_name,
        data: group,
        children,
      };
    };
    
    const tree = rootGroups.map(buildNode).filter((node): node is TreeNode => node !== null);
    console.log('[buildTree] Final tree:', tree);
    return tree;
  };

  const tree = useMemo(() => buildTree(), [groups, teams]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    // Check if a group with the same name already exists (case-insensitive)
    const duplicateGroup = groups.find(
      g => g.group_name.toLowerCase() === newGroupName.trim().toLowerCase()
    );
    
    if (duplicateGroup) {
      setDuplicateGroupName(duplicateGroup.group_name);
      setShowDuplicateGroupError(true);
      return;
    }
    
    try {
      await apiService.createGroup(newGroupName, parentGroupId);
      setNewGroupName('');
      setParentGroupId(null);
      setShowCreateGroupModal(false);
      
      // Reload only groups, not teams (more efficient than full refresh)
      const groupsData = await apiService.getAllGroups();
      setGroups(Array.isArray(groupsData) ? groupsData : groupsData.groups || []);
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleDeleteGroup = (groupId: number, groupName: string, teamCount: number) => {
    setGroupToDelete({ groupId, groupName, teamCount });
    setShowDeleteGroupModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    
    try {
      await apiService.deleteGroup(groupToDelete.groupId);
      
      // Reload both groups and teams (teams may have become unassigned)
      const [groupsData, teamsData] = await Promise.all([
        apiService.getAllGroups(),
        apiService.getAllTeams(),
      ]);
      
      setGroups(Array.isArray(groupsData) ? groupsData : groupsData.groups || []);
      setTeams(Array.isArray(teamsData) ? teamsData : teamsData.teams || []);
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
      
      setShowDeleteGroupModal(false);
      setGroupToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const handleAssignTeams = async () => {
    if (!selectedGroup || selectedTeamIds.length === 0) return;
    
    try {
      const teamIds = selectedTeamIds.map(id => parseInt(id));
      await apiService.batchAssignTeamsToGroup(selectedGroup.group_key, teamIds);
      
      // Update teams state with new schema (group_keys)
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (teamIds.includes(team.team_key)) {
            // Add the new group to the team's group_keys array
            const currentGroupKeys = team.group_keys || [];
            const currentGroupNames = team.group_names || [];
            
            // Only add if not already present
            if (!currentGroupKeys.includes(selectedGroup.group_key)) {
              return {
                ...team,
                group_keys: [...currentGroupKeys, selectedGroup.group_key],
                group_names: [...currentGroupNames, selectedGroup.group_name]
              };
            }
          }
          return team;
        })
      );
      
      // Refresh unassigned teams list
      setUnassignedTeams(prev => prev.filter(t => !teamIds.includes(t.team_key)));
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
      
      setSelectedTeamIds([]);
      setShowAssignTeamsModal(false);
      setSelectedGroup(null);
      setTeamSearchQuery('');
      setActiveTeamTab('unassigned');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign teams');
    }
  };

  const handleRemoveTeamFromGroup = (teamId: number, groupKey: number) => {
    const team = teams.find(t => t.team_key === teamId);
    const group = groups.find(g => g.group_key === groupKey);
    if (!team || !group) return;
    
    setTeamToRemove({
      teamId,
      teamName: team.team_name,
      groupName: group.group_name,
      groupKey: groupKey
    });
    setShowRemoveTeamModal(true);
  };

  const confirmRemoveTeam = async () => {
    if (!teamToRemove) return;
    
    try {
      const team = teams.find(t => t.team_key === teamToRemove.teamId);
      if (!team) return;
      
      // Remove the specific group from the team's group_keys array
      const newGroupKeys = (team.group_keys || []).filter(gk => gk !== teamToRemove.groupKey);
      
      // Update team with new group_keys array (send empty array instead of null to clear all groups)
      await apiService.updateTeam(teamToRemove.teamId, newGroupKeys);
      
      // Update teams state directly
      setTeams(prevTeams => 
        prevTeams.map(t => 
          t.team_key === teamToRemove.teamId
            ? { 
                ...t, 
                group_keys: newGroupKeys,
                group_names: (t.group_names || []).filter((_, idx) => 
                  t.group_keys && t.group_keys[idx] !== teamToRemove.groupKey
                )
              }
            : t
        )
      );
      
      // Refresh unassigned teams
      const updatedTeam = teams.find(t => t.team_key === teamToRemove.teamId);
      if (updatedTeam && newGroupKeys.length === 0) {
        setUnassignedTeams(prev => [...prev, { ...updatedTeam, group_keys: [], group_names: [] }]);
      }
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
      
      setShowRemoveTeamModal(false);
      setTeamToRemove(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove team');
    }
  };

  const handleEditTeam = (team: Team) => {
    setTeamToEdit(team);
    setEditTeamMembers(team.number_of_team_members || 0);
    setEditTeamAIInsight(team.ai_insight || false);
    setShowEditTeamModal(true);
  };

  const confirmEditTeam = async () => {
    if (!teamToEdit) return;
    
    try {
      await apiService.updateTeamDetails(teamToEdit.team_key, {
        number_of_team_members: editTeamMembers,
        ai_insight: editTeamAIInsight,
      });
      
      // Update teams state directly
      setTeams(prevTeams => 
        prevTeams.map(t => 
          t.team_key === teamToEdit.team_key
            ? { 
                ...t, 
                number_of_team_members: editTeamMembers,
                ai_insight: editTeamAIInsight
              }
            : t
        )
      );
      
      // Update unassigned teams if needed
      setUnassignedTeams(prev => 
        prev.map(t => 
          t.team_key === teamToEdit.team_key
            ? { 
                ...t, 
                number_of_team_members: editTeamMembers,
                ai_insight: editTeamAIInsight
              }
            : t
        )
      );
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
      
      setShowEditTeamModal(false);
      setTeamToEdit(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update team');
    }
  };

  const handleEditGroup = (group: Group) => {
    setGroupToEdit(group);
    setEditGroupName(group.group_name);
    setEditGroupAIInsight(group.ai_insight || false);
    setShowEditGroupModal(true);
  };

  const confirmEditGroup = async () => {
    if (!groupToEdit) return;
    
    try {
      await apiService.updateGroup(groupToEdit.group_key, {
        group_name: editGroupName.trim(),
        ai_insight: editGroupAIInsight,
      });
      
      // Update groups state directly
      setGroups(prevGroups => 
        prevGroups.map(g => 
          g.group_key === groupToEdit.group_key
            ? { 
                ...g, 
                group_name: editGroupName.trim(),
                ai_insight: editGroupAIInsight
              }
            : g
        )
      );
      
      // Refresh the global context so top bar and other components update
      await refreshContext();
      
      setShowEditGroupModal(false);
      setGroupToEdit(null);
      setEditGroupName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update group');
    }
  };

  const toggleGroupExpansion = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (team: Team) => {
    setDraggedTeam(team);
  };

  const handleDragEnd = () => {
    setDraggedTeam(null);
    setDropTargetGroup(null);
  };

  const handleDragOver = (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    setDropTargetGroup(groupId);
  };

  const handleDragLeave = () => {
    setDropTargetGroup(null);
  };

  const handleDrop = async (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    setDropTargetGroup(null);
    
    if (!draggedTeam) return;
    
    try {
      // Assign the dragged team to the group
      await apiService.batchAssignTeamsToGroup(groupId, [draggedTeam.team_key]);
      
      // Update teams state
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.team_key === draggedTeam.team_key) {
            const currentGroupKeys = team.group_keys || [];
            const currentGroupNames = team.group_names || [];
            const group = groups.find(g => g.group_key === groupId);
            
            if (!currentGroupKeys.includes(groupId) && group) {
              return {
                ...team,
                group_keys: [...currentGroupKeys, groupId],
                group_names: [...currentGroupNames, group.group_name]
              };
            }
          }
          return team;
        })
      );
      
      // Remove from unassigned teams
      setUnassignedTeams(prev => prev.filter(t => t.team_key !== draggedTeam.team_key));
      
      // Refresh the global context
      await refreshContext();
      
      setDraggedTeam(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign team');
      setDraggedTeam(null);
    }
  };

  // Recursively count all teams in a node and its children
  const countAllTeams = (node: TreeNode): number => {
    let count = 0;
    for (const child of node.children) {
      if (child.type === 'team') {
        count++;
      } else if (child.type === 'group') {
        count += countAllTeams(child);
      }
    }
    return count;
  };

  const renderNode = (node: TreeNode, depth: number = 0, parentGroupKey?: number): JSX.Element => {
    if (node.type === 'group') {
      const group = node.data as Group;
      const isExpanded = expandedGroups.has(group.group_key);
      const hasChildren = node.children.length > 0;
      
      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-elevated transition-all group cursor-pointer ${
              dropTargetGroup === group.group_key ? 'bg-blue-100 ring-2 ring-blue-400' : ''
            }`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => hasChildren && toggleGroupExpansion(group.group_key)}
            onDragOver={(e) => handleDragOver(e, group.group_key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, group.group_key)}
          >
            {/* Expand/Collapse button */}
            <div
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                hasChildren ? '' : 'invisible'
              }`}
            >
              {hasChildren && (
                <svg
                  className={`w-3.5 h-3.5 text-content-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>

            {/* Group icon */}
            <span className="text-base">📁</span>

            {/* Group name */}
            <span className={`flex-1 font-semibold text-sm ${depth === 0 ? 'text-content-primary' : 'text-content-primary'}`}>
              {group.group_name}
            </span>

            {/* AI Scheduling indicator */}
            {group.ai_insight && (
              <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded" title="Included in group AI scheduling">
                ✨ AI
              </span>
            )}

            {/* Team count badge - shows total teams including subgroups */}
            <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {countAllTeams(node)}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditGroup(group);
                }}
                className="p-1 hover:bg-purple-50 rounded transition-colors"
                title="Edit group"
              >
                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGroup(group);
                  setShowAssignTeamsModal(true);
                }}
                className="p-1 hover:bg-blue-50 rounded transition-colors"
                title="Assign teams"
              >
                <svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setParentGroupId(group.group_key);
                  setShowCreateGroupModal(true);
                }}
                className="p-1 hover:bg-green-50 rounded transition-colors"
                title="Add subgroup"
              >
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group.group_key, group.group_name, countAllTeams(node));
                }}
                className="p-1 hover:bg-red-50 rounded transition-colors"
                title="Delete group"
              >
                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Children */}
          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1, group.group_key))}
            </div>
          )}
        </div>
      );
    } else {
      // Team node
      const team = node.data as Team;
      
      return (
        <div
          key={node.id}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-elevated transition-all group cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 34}px` }}
          onClick={() => handleEditTeam(team)}
        >
          {/* Team icon */}
          <span className="text-sm">👥</span>

          {/* Team name */}
          <span className="flex-1 text-xs text-content-secondary">{team.team_name}</span>

          {/* Members count */}
          {team.number_of_team_members > 0 && (
            <span className="text-xs text-content-secondary bg-surface-secondary px-1.5 py-0.5 rounded">
              {team.number_of_team_members} members
            </span>
          )}

          {/* AI Insight badge */}
          {team.ai_insight && (
            <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded" title="Included in team insights schedule">
              ✨ AI
            </span>
          )}

          {/* Remove button - only show if parentGroupKey is provided */}
          {parentGroupKey && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTeamFromGroup(team.team_key, parentGroupKey);
              }}
              className="p-0.5 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Remove from group"
            >
              <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-content-secondary">Loading team management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-red-700 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Header */}
      <div className="bg-surface rounded-lg border border-outline shadow-sm p-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Team Management</h2>
          <p className="text-sm text-content-secondary">Organize your teams into groups with a hierarchical structure</p>
        </div>
      </div>

      {/* Tree Structure and Unassigned Teams - Side by Side */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Team Hierarchy */}
        <div className="bg-surface rounded-lg border border-outline shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-base font-semibold text-content-primary">Team Hierarchy</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setParentGroupId(null);
                  setShowCreateGroupModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-brand bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                title="New Group"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden md:inline">New Group</span>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={() => {
                  const allGroupIds = groups.map(g => g.group_key);
                  const allExpanded = allGroupIds.every(id => expandedGroups.has(id));
                  
                  if (allExpanded) {
                    // Collapse all
                    setExpandedGroups(new Set());
                  } else {
                    // Expand all
                    setExpandedGroups(new Set(allGroupIds));
                  }
                }}
                className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-secondary rounded-md transition-all"
                title={groups.length > 0 && groups.every(g => expandedGroups.has(g.group_key)) ? 'Collapse All' : 'Expand All'}
              >
                {groups.length > 0 && groups.every(g => expandedGroups.has(g.group_key)) ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    <span className="hidden md:inline">Collapse All</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden md:inline">Expand All</span>
                  </>
                )}
              </button>
            </div>
        </div>

          <div className="flex-1 overflow-auto p-3">
        {tree.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-content-secondary mb-2">No groups yet</p>
            <p className="text-sm text-content-tertiary mb-4">Create your first group to start organizing teams</p>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover transition-colors"
            >
              Create First Group
            </button>
          </div>
        ) : (
              <div className="space-y-0.5">
            {tree.map(node => renderNode(node, 0))}
          </div>
        )}
          </div>
      </div>

        {/* Teams Panel with Tabs */}
        <div className="bg-surface border border-outline rounded-lg shadow-sm flex flex-col min-h-0">
          {/* Header - matching Team Hierarchy style */}
          <div className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-base font-semibold text-content-primary">Teams</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTeamViewTab('unassigned')}
                className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  teamViewTab === 'unassigned'
                    ? 'text-brand bg-blue-50 border border-blue-200'
                    : 'text-content-secondary bg-surface border border-outline hover:bg-surface-elevated hover:border-outline'
                }`}
                title="Unassigned Teams"
              >
                <span className="hidden md:inline">Unassigned</span>
                <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {unassignedTeams.length}
                </span>
              </button>
              <button
                onClick={() => setTeamViewTab('all')}
                className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  teamViewTab === 'all'
                    ? 'text-brand bg-blue-50 border border-blue-200'
                    : 'text-content-secondary bg-surface border border-outline hover:bg-surface-elevated hover:border-outline'
                }`}
                title="All Teams"
              >
                <span className="hidden md:inline">All Teams</span>
                <span className="text-xs bg-blue-100 text-brand px-1.5 py-0.5 rounded-full font-semibold">
                  {teams.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {teamViewTab === 'unassigned' ? (
              unassignedTeams.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-content-secondary mb-2">All teams assigned</p>
                  <p className="text-sm text-content-tertiary">All teams are currently in groups</p>
                </div>
              ) : (
                <div className="space-y-1">
            {unassignedTeams.map(team => (
              <div
                key={team.team_key}
                      draggable
                      onDragStart={() => handleDragStart(team)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleEditTeam(team)}
                      className={`px-2 py-1.5 flex items-center gap-2 hover:bg-surface-elevated transition-colors rounded cursor-pointer ${
                        draggedTeam?.team_key === team.team_key ? 'opacity-50' : ''
                      }`}
                      title="Click to edit team details or drag to assign to a group"
                    >
                      <span className="text-sm">👥</span>
                <span className="flex-1 text-xs font-medium text-content-secondary">{team.team_name}</span>
                      {team.number_of_team_members > 0 && (
                        <span className="text-xs text-content-secondary bg-surface-secondary px-1.5 py-0.5 rounded">
                          {team.number_of_team_members} members
                        </span>
                      )}
                      {team.ai_insight && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded" title="Included in team insights schedule">
                          ✨ AI
                        </span>
                      )}
              </div>
            ))}
          </div>
              )
            ) : (
              <div className="space-y-1">
                {teams.map(team => {
                  return (
                    <div
                      key={team.team_key}
                      draggable
                      onDragStart={() => handleDragStart(team)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleEditTeam(team)}
                      className={`px-2 py-1.5 flex items-center gap-2 hover:bg-surface-elevated transition-colors rounded cursor-pointer ${
                        draggedTeam?.team_key === team.team_key ? 'opacity-50' : ''
                      }`}
                      title="Click to edit team details or drag to assign to a group"
                    >
                      <span className="text-sm">👥</span>
                      <span className="flex-1 text-xs font-medium text-content-secondary">{team.team_name}</span>
                      <div className="flex items-center gap-1">
                        {team.number_of_team_members > 0 && (
                          <span className="text-xs text-content-secondary bg-surface-secondary px-1.5 py-0.5 rounded">
                            {team.number_of_team_members} members
                          </span>
                        )}
                        {team.ai_insight && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded" title="Included in team insights schedule">
                            ✨ AI
                          </span>
                        )}
                        {team.group_keys && team.group_keys.length > 0 && (
                          <span className="text-xs text-brand bg-blue-100 px-1.5 py-0.5 rounded">
                            {team.group_keys.length} group{team.group_keys.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
        </div>
      )}
          </div>
        </div>
      </div>

      {/* Stats - Bottom */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {/* Total Groups */}
        <div className="bg-surface rounded-lg border border-outline shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-content-primary">{groups.length}</p>
                <p className="text-sm text-content-secondary">Total Groups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Total Teams */}
        <div className="bg-surface rounded-lg border border-outline shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-content-primary">{teams.length}</p>
                <p className="text-sm text-content-secondary">Total Teams</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unassigned Teams */}
        <div className="bg-surface rounded-lg border border-outline shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-content-primary">{unassignedTeams.length}</p>
                <p className="text-sm text-content-secondary">Unassigned Teams</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-4 py-2.5 border-b border-outline">
              <h3 className="text-lg font-bold text-content-primary">Create New Group</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-content-primary mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Enter group name"
                  autoFocus
                />
              </div>

              {parentGroupId && (
                <div className="bg-surface-secondary border border-outline rounded-lg p-2">
                  <p className="text-xs text-content-secondary">
                    This will be a subgroup of:{' '}
                    <span className="font-semibold">
                      {groups.find(g => g.group_key === parentGroupId)?.group_name}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-surface-elevated rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                  setParentGroupId(null);
                }}
                className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teams Modal */}
      {showAssignTeamsModal && selectedGroup && (() => {
        // Get teams based on active tab
        const teamsToShow = activeTeamTab === 'unassigned' 
          ? unassignedTeams 
          : teams.filter(t => !t.group_keys || !t.group_keys.includes(selectedGroup.group_key)); // All teams not in this specific group
        
        const filteredTeams = teamsToShow.filter(team =>
          team.team_name.toLowerCase().includes(teamSearchQuery.toLowerCase())
        );

        const toggleTeam = (teamKey: string) => {
          setSelectedTeamIds(prev =>
            prev.includes(teamKey)
              ? prev.filter(id => id !== teamKey)
              : [...prev, teamKey]
          );
        };

        const selectAll = () => {
          setSelectedTeamIds(filteredTeams.map(t => `${t.team_key}`));
        };

        const clearAll = () => {
          setSelectedTeamIds([]);
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl shadow-2xl max-w-lg w-full flex flex-col" style={{ height: '550px' }}>
              <div className="px-4 py-2.5 border-b border-outline">
                <h3 className="text-lg font-bold text-content-primary">Assign Teams to Group</h3>
                <p className="text-xs text-content-secondary mt-0.5">
                  Group: <span className="font-semibold">{selectedGroup.group_name}</span>
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-outline px-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setActiveTeamTab('unassigned');
                    setSelectedTeamIds([]);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTeamTab === 'unassigned'
                      ? 'text-brand border-b-2 border-blue-600'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  Unassigned Teams
                  {activeTeamTab === 'unassigned' && (
                    <span className="ml-2 text-xs bg-blue-100 text-brand px-2 py-0.5 rounded-full">
                      {unassignedTeams.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTeamTab('all');
                    setSelectedTeamIds([]);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTeamTab === 'all'
                      ? 'text-brand border-b-2 border-blue-600'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  All Teams
                  {activeTeamTab === 'all' && (
                    <span className="ml-2 text-xs bg-blue-100 text-brand px-2 py-0.5 rounded-full">
                      {teams.filter(t => !t.group_keys || !t.group_keys.includes(selectedGroup.group_key)).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-3 flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Tab description */}
                <p className="text-xs text-content-tertiary mb-2 flex-shrink-0">
                  {activeTeamTab === 'unassigned' 
                    ? `Showing ${teamsToShow.length} team${teamsToShow.length !== 1 ? 's' : ''} not assigned to any group`
                    : `Showing ${teamsToShow.length} team${teamsToShow.length !== 1 ? 's' : ''} not in this group (can be in other groups)`
                  }
                </p>

                {/* Search box */}
                <div className="mb-2 flex-shrink-0">
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full px-3 py-1.5 text-sm border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Select All / Clear All buttons */}
                <div className="flex gap-2 mb-2 flex-shrink-0">
                  <button
                    onClick={selectAll}
                    className="text-xs text-brand hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-content-muted">|</span>
                  <button
                    onClick={clearAll}
                    className="text-xs text-brand hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {/* Scrollable checkbox list - fixed height container */}
                <div className="flex-1 overflow-y-auto border border-outline rounded-lg min-h-0">
                  {filteredTeams.length === 0 ? (
                    <div className="p-3 text-center text-content-tertiary text-xs">
                      {teamSearchQuery 
                        ? 'No teams found matching your search' 
                        : activeTeamTab === 'unassigned' 
                          ? 'No unassigned teams available' 
                          : 'All teams are already in this group'
                      }
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredTeams.map(team => (
                        <label
                          key={team.team_key}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-surface-elevated cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(`${team.team_key}`)}
                            onChange={() => toggleTeam(`${team.team_key}`)}
                            className="w-3.5 h-3.5 text-brand border-outline rounded focus:ring-blue-400"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-xs text-content-secondary">{team.team_name}</span>
                            {activeTeamTab === 'all' && team.group_keys && team.group_keys.length > 0 && (
                              <span className="text-xs text-content-tertiary bg-surface-secondary px-2 py-0.5 rounded">
                                In {team.group_keys.length} group{team.group_keys.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selection count */}
                <div className="mt-2 text-xs text-content-secondary flex-shrink-0 h-4">
                  {selectedTeamIds.length > 0 && (
                    <span>{selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 bg-surface-elevated rounded-b-xl flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAssignTeamsModal(false);
                    setSelectedGroup(null);
                    setSelectedTeamIds([]);
                    setTeamSearchQuery('');
                    setActiveTeamTab('unassigned');
                  }}
                  className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTeams}
                  disabled={selectedTeamIds.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                >
                  Assign {selectedTeamIds.length} Team{selectedTeamIds.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Remove Team Confirmation Modal */}
      {showRemoveTeamModal && teamToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-outline bg-red-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-content-primary">Remove Team from Group</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-content-secondary mb-3">
                Are you sure you want to remove the following team from its group?
              </p>
              
              <div className="bg-surface-elevated border border-outline rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-content-secondary min-w-[60px]">Team:</span>
                  <span className="text-xs font-bold text-content-primary">{teamToRemove.teamName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-content-secondary min-w-[60px]">Group:</span>
                  <span className="text-xs font-bold text-content-primary">{teamToRemove.groupName}</span>
                </div>
              </div>

              <p className="text-xs text-content-secondary mt-3">
                The team will become unassigned and can be reassigned to another group later.
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-surface-elevated rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowRemoveTeamModal(false);
                  setTeamToRemove(null);
                }}
                className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-2 rounded-lg hover:bg-surface-elevated transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveTeam}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Remove Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteGroupModal && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-outline bg-red-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-content-primary">Delete Group</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-content-secondary mb-3">
                Are you sure you want to delete the following group?
              </p>
              
              <div className="bg-surface-elevated border border-outline rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-content-secondary min-w-[60px]">Group:</span>
                  <span className="text-xs font-bold text-content-primary">{groupToDelete.groupName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-content-secondary min-w-[60px]">Teams:</span>
                  <span className="text-xs font-bold text-content-primary">{groupToDelete.teamCount} team{groupToDelete.teamCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 mt-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-orange-800">
                  All teams in this group will become unassigned. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-surface-elevated rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteGroupModal(false);
                  setGroupToDelete(null);
                }}
                className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-2 rounded-lg hover:bg-surface-elevated transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Group Error Modal */}
      {showDuplicateGroupError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-outline bg-orange-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-content-primary">Duplicate Group Name</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-content-secondary mb-3">
                A group with this name already exists:
              </p>
              
              <div className="bg-surface-elevated border border-outline rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📁</span>
                  <span className="text-sm font-bold text-content-primary">{duplicateGroupName}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800">
                  Please choose a different name for your new group.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-surface-elevated rounded-b-xl flex justify-end">
              <button
                onClick={() => {
                  setShowDuplicateGroupError(false);
                  setDuplicateGroupName('');
                }}
                className="px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && teamToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-4 py-2.5 border-b border-outline">
              <h3 className="text-lg font-bold text-content-primary">Edit Team</h3>
              <p className="text-xs text-content-secondary mt-0.5">
                Team: <span className="font-semibold">{teamToEdit.team_name}</span>
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-primary mb-1">
                  Number of Team Members
                </label>
                <input
                  type="number"
                  value={editTeamMembers}
                  onChange={(e) => setEditTeamMembers(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-sm border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  min="0"
                  placeholder="Enter number of team members"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTeamAIInsight}
                    onChange={(e) => setEditTeamAIInsight(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-outline rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-content-primary">
                    Include in Team Insights Schedule
                  </span>
                </label>
                <p className="text-xs text-content-tertiary mt-1 ml-6">
                  When enabled, this team will receive automated AI-powered insights and recommendations
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-surface-elevated rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowEditTeamModal(false);
                  setTeamToEdit(null);
                }}
                className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditTeam}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroupModal && groupToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-4 py-2.5 border-b border-outline">
              <h3 className="text-lg font-bold text-content-primary">Edit Group</h3>
              <p className="text-xs text-content-secondary mt-0.5">
                Group: <span className="font-semibold">{groupToEdit.group_name}</span>
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-primary mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editGroupAIInsight}
                    onChange={(e) => setEditGroupAIInsight(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-outline rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-content-primary">
                    Include in Group AI Scheduling
                  </span>
                </label>
                <p className="text-xs text-content-tertiary mt-1 ml-6">
                  When enabled, this group will receive automated AI-powered insights and recommendations
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-surface-elevated rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setGroupToEdit(null);
                  setEditGroupName('');
                }}
                className="flex-1 bg-surface text-content-secondary text-sm border border-outline py-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditGroup}
                disabled={!editGroupName.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

