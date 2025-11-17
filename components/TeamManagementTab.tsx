'use client';

import { useState, useEffect, useMemo } from 'react';
import { ApiService } from '@/lib/api';
import { Group, Team } from '@/lib/config';

interface TreeNode {
  id: string;
  type: 'group' | 'team';
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

export default function TeamManagementTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedTeams, setUnassignedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAssignTeamsModal, setShowAssignTeamsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [parentGroupId, setParentGroupId] = useState<number | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [activeTeamTab, setActiveTeamTab] = useState<'all' | 'unassigned'>('unassigned');

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
      setUnassignedTeams((teamsData.teams || []).filter(t => !t.group_key));
      
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
      const groupTeams = teams.filter(t => t.group_key === group.group_key);
      
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
    
    try {
      await apiService.createGroup(newGroupName, parentGroupId);
      setNewGroupName('');
      setParentGroupId(null);
      setShowCreateGroupModal(false);
      
      // Reload only groups, not teams (more efficient than full refresh)
      const groupsData = await apiService.getAllGroups();
      setGroups(Array.isArray(groupsData) ? groupsData : groupsData.groups || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group? All teams in this group will become unassigned.')) {
      return;
    }
    
    try {
      await apiService.deleteGroup(groupId);
      
      // Reload both groups and teams (teams may have become unassigned)
      const [groupsData, teamsData] = await Promise.all([
        apiService.getAllGroups(),
        apiService.getAllTeams(),
      ]);
      
      setGroups(Array.isArray(groupsData) ? groupsData : groupsData.groups || []);
      setTeams(Array.isArray(teamsData) ? teamsData : teamsData.teams || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const handleAssignTeams = async () => {
    if (!selectedGroup || selectedTeamIds.length === 0) return;
    
    try {
      const teamIds = selectedTeamIds.map(id => parseInt(id));
      await apiService.batchAssignTeamsToGroup(selectedGroup.group_key, teamIds);
      
      // Update teams state directly instead of full refresh
      setTeams(prevTeams => 
        prevTeams.map(team => 
          teamIds.includes(team.team_key)
            ? { ...team, group_key: selectedGroup.group_key, group_name: selectedGroup.group_name }
            : team
        )
      );
      
      setSelectedTeamIds([]);
      setShowAssignTeamsModal(false);
      setSelectedGroup(null);
      setTeamSearchQuery('');
      setActiveTeamTab('unassigned');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign teams');
    }
  };

  const handleRemoveTeamFromGroup = async (teamId: number) => {
    if (!confirm('Remove this team from the group?')) return;
    
    try {
      await apiService.removeTeamFromGroup(teamId);
      
      // Update teams state directly instead of full refresh
      setTeams(prevTeams => 
        prevTeams.map(team => 
          team.team_key === teamId
            ? { ...team, group_key: null, group_name: undefined }
            : team
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove team');
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

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.type === 'group') {
      const group = node.data as Group;
      const isExpanded = expandedGroups.has(group.group_key);
      const hasChildren = node.children.length > 0;
      
      return (
        <div key={node.id} className="mb-1">
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all hover:bg-gray-50 group cursor-pointer ${
              depth === 0 ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white border border-gray-200'
            }`}
            style={{ marginLeft: `${depth * 24}px` }}
            onClick={() => hasChildren && toggleGroupExpansion(group.group_key)}
          >
            {/* Expand/Collapse button */}
            <div
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                hasChildren ? '' : 'invisible'
              }`}
            >
              {hasChildren && (
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>

            {/* Group icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>

            {/* Group name */}
            <span className={`flex-1 font-semibold ${depth === 0 ? 'text-gray-900' : 'text-gray-800'}`}>
              {group.group_name}
            </span>

            {/* Team count badge - shows total teams including subgroups */}
            <span className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
              {countAllTeams(node)}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGroup(group);
                  setShowAssignTeamsModal(true);
                }}
                className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                title="Assign teams"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setParentGroupId(group.group_key);
                  setShowCreateGroupModal(true);
                }}
                className="p-1.5 hover:bg-green-50 rounded transition-colors"
                title="Add subgroup"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group.group_key);
                }}
                className="p-1.5 hover:bg-red-50 rounded transition-colors"
                title="Delete group"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Children */}
          {isExpanded && hasChildren && (
            <div className="mt-1">
              {node.children.map(child => renderNode(child, depth + 1))}
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all group mb-1"
          style={{ marginLeft: `${depth * 24 + 32}px` }}
        >
          {/* Team icon */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>

          {/* Team name */}
          <span className="flex-1 text-sm text-gray-700">{team.team_name}</span>

          {/* Members count */}
          {team.number_of_team_members > 0 && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {team.number_of_team_members} members
            </span>
          )}

          {/* Remove button */}
          <button
            onClick={() => handleRemoveTeamFromGroup(team.team_key)}
            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Remove from group"
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team management...</p>
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
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Team Management</h2>
            <p className="text-gray-600">Organize your teams into groups with a hierarchical structure</p>
          </div>
          <button
            onClick={() => {
              setParentGroupId(null);
              setShowCreateGroupModal(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Group
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
              <p className="text-sm text-gray-600">Total Groups</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
              <p className="text-sm text-gray-600">Total Teams</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{unassignedTeams.length}</p>
              <p className="text-sm text-gray-600">Unassigned Teams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Structure */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Hierarchy</h3>
          <button
            onClick={() => {
              const allGroupIds = groups.map(g => g.group_key);
              setExpandedGroups(new Set(allGroupIds));
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Expand All
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-600 mb-2">No groups yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first group to start organizing teams</p>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Group
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(node => renderNode(node, 0))}
          </div>
        )}
      </div>

      {/* Unassigned Teams */}
      {unassignedTeams.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unassigned Teams</h3>
          <div className="grid grid-cols-2 gap-3">
            {unassignedTeams.map(team => (
              <div
                key={team.team_key}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700">{team.team_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                  autoFocus
                />
              </div>

              {parentGroupId && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    This will be a subgroup of:{' '}
                    <span className="font-semibold">
                      {groups.find(g => g.group_key === parentGroupId)?.group_name}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3">
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                  setParentGroupId(null);
                }}
                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teams Modal */}
      {showAssignTeamsModal && selectedGroup && (() => {
        const teamsToShow = activeTeamTab === 'all' ? teams : unassignedTeams;
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
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col" style={{ height: '600px' }}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Assign Teams to Group</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Group: <span className="font-semibold">{selectedGroup.group_name}</span>
                </p>
                
                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setActiveTeamTab('unassigned')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTeamTab === 'unassigned'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Unassigned Teams ({unassignedTeams.length})
                  </button>
                  <button
                    onClick={() => setActiveTeamTab('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTeamTab === 'all'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Teams ({teams.length})
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Search box */}
                <div className="mb-4 flex-shrink-0">
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Select All / Clear All buttons */}
                <div className="flex gap-2 mb-3 flex-shrink-0">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={clearAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {/* Scrollable checkbox list - fixed height container */}
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg min-h-0">
                  {filteredTeams.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {teamSearchQuery 
                        ? 'No teams found matching your search' 
                        : activeTeamTab === 'unassigned' 
                          ? 'No unassigned teams available'
                          : 'No teams available'
                      }
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredTeams.map(team => (
                        <label
                          key={team.team_key}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(`${team.team_key}`)}
                            onChange={() => toggleTeam(`${team.team_key}`)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-400"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700">{team.team_name}</span>
                            {team.group_name && (
                              <span className="ml-2 text-xs text-gray-500">
                                (in {team.group_name})
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selection count */}
                <div className="mt-3 text-sm text-gray-600 flex-shrink-0 h-5">
                  {selectedTeamIds.length > 0 && (
                    <span>{selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAssignTeamsModal(false);
                    setSelectedGroup(null);
                    setSelectedTeamIds([]);
                    setTeamSearchQuery('');
                    setActiveTeamTab('unassigned');
                  }}
                  className="flex-1 bg-white text-gray-700 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignTeams}
                  disabled={selectedTeamIds.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                >
                  Assign {selectedTeamIds.length} Team{selectedTeamIds.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

