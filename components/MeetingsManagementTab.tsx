'use client';

import { useState, useEffect, useMemo } from 'react';
import { getMeetingNames, createMeetingName, updateMeetingName, MeetingName } from '@/lib/api';
import { ApiService } from '@/lib/api';
import { Team, Group } from '@/lib/config';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

const TEAM_TYPES = ['Daily', 'Sprint Planning', 'Retrospective', 'Refinement'];
const GROUP_TYPES = ['Group Planning', 'Group Retrospective', 'Group Sync'];

interface TreeNode {
  id: string;
  type: 'group' | 'team';
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

export default function MeetingsManagementTab() {
  const { teams: contextTeams, groups: contextGroups } = useTeamsGroups();
  const [meetings, setMeetings] = useState<MeetingName[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMeetingKey, setEditingMeetingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrganizerEmail, setEditOrganizerEmail] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const apiService = new ApiService();

  useEffect(() => {
    loadData();
  }, []);

  const mergeMeetings = (watched: MeetingName[], currentTeams: Team[], currentGroups: Group[]): MeetingName[] => {
    const placeholders: MeetingName[] = [];
    
    // Generate for Teams
    currentTeams.forEach(team => {
      TEAM_TYPES.forEach(type => {
        placeholders.push({
          id: 0, // 0 indicates generated
          name: `${team.team_name} - ${type}`,
          team_name: team.team_name,
          is_group: false,
          type: type,
          active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    });

    // Generate for Groups
    currentGroups.forEach(group => {
      GROUP_TYPES.forEach(type => {
        placeholders.push({
          id: 0,
          name: `${group.group_name} - ${type}`,
          team_name: group.group_name,
          is_group: true,
          type: type,
          active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    });
    
    const merged: MeetingName[] = [];
    
    // Map watched meetings by key for faster lookup
    // Key: team_name + is_group + type
    const watchedMap = new Map<string, MeetingName>();
    watched.forEach(m => {
        // Only use matches if team_name and type are present
        if (m.team_name && m.type) {
            const key = `${m.team_name}-${m.is_group}-${m.type}`;
            watchedMap.set(key, m);
        }
    });
    
    placeholders.forEach(p => {
        const key = `${p.team_name}-${p.is_group}-${p.type}`;
        if (watchedMap.has(key)) {
            merged.push(watchedMap.get(key)!);
            watchedMap.delete(key);
        } else {
            merged.push(p);
        }
    });
    
    // Add remaining watched meetings (custom ones or ones that didn't match placeholders)
    watchedMap.forEach(m => merged.push(m));
    
    // Also add watched meetings that didn't have team_name/type (legacy or raw entries)
    watched.forEach(m => {
         if (!m.team_name || !m.type) {
             merged.push(m);
         }
    });

    return merged;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [meetingsData, teamsData, groupsData] = await Promise.all([
        getMeetingNames(true), // Include inactive
        apiService.getAllTeams(),
        apiService.getAllGroups(),
      ]);
      
      const loadedTeams = teamsData.teams || [];
      const loadedGroups = groupsData.groups || [];
      
      setTeams(loadedTeams);
      setGroups(loadedGroups);
      
      // Merge watched meetings with placeholders
      const merged = mergeMeetings(meetingsData, loadedTeams, loadedGroups);
      setMeetings(merged);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const refreshMeetings = async () => {
    try {
      const meetingsData = await getMeetingNames(true);
      // Re-merge with existing teams/groups
      const merged = mergeMeetings(meetingsData, teams, groups);
      setMeetings(merged);
    } catch (err) {
      console.error('Failed to refresh meetings:', err);
    }
  };

  const handleUpdate = async (id: number, meeting: Partial<MeetingName>) => {
    try {
      const updated = await updateMeetingName(id, meeting as any);
      // Update only the specific meeting in local state
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updated } : m));
      setEditingMeetingKey(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update meeting');
    }
  };

  const handleCreate = async (meeting: Partial<MeetingName>) => {
    try {
      await createMeetingName(meeting as any);
      // Refresh only the meetings list to get the new override
      await refreshMeetings();
      setEditingMeetingKey(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create meeting override');
    }
  };

  const getMeetingKey = (meeting: MeetingName): string => {
    // For database meetings with real IDs, use the ID
    if (meeting.id && meeting.id !== 0) {
      return `db-${meeting.id}`;
    }
    // For generated meetings (no ID or ID=0), create unique key from team_name, is_group, and type
    return `temp-${meeting.team_name}-${meeting.is_group}-${meeting.type}`;
  };

  const startEditing = (meeting: MeetingName) => {
    setEditingMeetingKey(getMeetingKey(meeting));
    setEditName(meeting.name);
    setEditOrganizerEmail(meeting.organizer_email || '');
  };

  const cancelEditing = () => {
    setEditingMeetingKey(null);
    setEditName('');
    setEditOrganizerEmail('');
  };

  const saveEditing = async (meeting: MeetingName) => {
    if (editingMeetingKey !== getMeetingKey(meeting)) return;

    // Validate organizer email
    if (!editOrganizerEmail || !editOrganizerEmail.trim()) {
      alert('Organizer email is required to watch a meeting.');
      return;
    }

    // Check if this is a generated meeting (no ID or ID = 0) or a database override
    const isGenerated = !meeting.id || meeting.id === 0;

    if (isGenerated) {
      // Create a new override for this generated meeting
      const newOverride: Partial<MeetingName> = {
        name: editName.trim(),
        team_name: meeting.team_name,
        is_group: meeting.is_group,
        type: meeting.type,
        organizer_email: editOrganizerEmail.trim() || undefined,
        active: true,
      };
      await handleCreate(newOverride);
    } else {
      // Update existing override
      const updates: Partial<MeetingName> = {};
      if (editName.trim() !== meeting.name) {
        updates.name = editName.trim();
      }
      if (editOrganizerEmail !== (meeting.organizer_email || '')) {
        updates.organizer_email = editOrganizerEmail.trim() || undefined;
      }

      if (Object.keys(updates).length > 0) {
        await handleUpdate(meeting.id, updates);
      } else {
        cancelEditing();
      }
    }
  };

  // Build tree structure
  const buildTree = (): TreeNode[] => {
    const groupMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create group nodes
    groups.forEach(group => {
      const node: TreeNode = {
        id: `group:${group.group_key}`,
        type: 'group',
        name: group.group_name,
        data: group,
        children: [],
      };
      groupMap.set(group.group_key, node);
    });

    // Build group hierarchy
    groups.forEach(group => {
      const node = groupMap.get(group.group_key);
      if (!node) return;

      if (group.parent_group_key) {
        const parent = groupMap.get(group.parent_group_key);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add teams to their groups
    teams.forEach(team => {
      if (team.group_keys && team.group_keys.length > 0) {
        team.group_keys.forEach((groupKey: number) => {
          const teamNode: TreeNode = {
            id: `team:${team.team_key}`,
            type: 'team',
            name: team.team_name,
            data: team,
            children: [],
          };

          const group = groupMap.get(groupKey);
          if (group) {
            group.children.push(teamNode);
          }
        });
      }
    });

    // Add unassigned teams as siblings after groups
    const unassignedTeams = teams.filter(team => !team.group_keys || team.group_keys.length === 0);
    unassignedTeams.forEach(team => {
      const teamNode: TreeNode = {
        id: `team:${team.team_key}`,
        type: 'team',
        name: team.team_name,
        data: team,
        children: [],
      };
      rootNodes.push(teamNode);
    });

    return rootNodes;
  };

  const tree = useMemo(() => buildTree(), [groups, teams]);

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

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
  };

  // Get meetings for selected node
  const selectedMeetings = useMemo(() => {
    if (!selectedNode) return [];
    const isGroup = selectedNode.type === 'group';
    const name = isGroup ? (selectedNode.data as Group).group_name : (selectedNode.data as Team).team_name;
    return meetings.filter(meeting => 
      meeting.team_name === name && meeting.is_group === isGroup
    );
  }, [meetings, selectedNode]);

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.type === 'group') {
      const group = node.data as Group;
      const isExpanded = expandedGroups.has(group.group_key);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedNode?.id === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-surface-elevated transition-all cursor-pointer ${
              isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : ''
            }`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => {
              if (hasChildren) {
                toggleGroupExpansion(group.group_key);
              }
              handleNodeClick(node);
            }}
          >
            {/* Expand/Collapse button */}
            <div
              className={`w-5 h-5 flex items-center justify-center ${
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
          </div>

          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // Team node
      const team = node.data as Team;
      const isSelected = selectedNode?.id === node.id;

      return (
        <div
          key={node.id}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-surface-elevated transition-all cursor-pointer ${
            isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 28}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* Team icon */}
          <span className="text-sm">👥</span>

          {/* Team name */}
          <span className="flex-1 text-xs text-content-secondary">{team.team_name}</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-content-secondary">Loading meetings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Header */}
      <div className="bg-surface rounded-lg border border-outline shadow-sm p-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-content-primary">Teams Meetings</h2>
          <p className="text-sm text-content-secondary">View and manage meetings for teams and groups</p>
        </div>
      </div>

      {/* Tree Structure and Meetings - Side by Side */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Team/Group Hierarchy */}
        <div className="bg-surface rounded-lg border border-outline shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-surface-elevated">
            <h3 className="text-base font-semibold text-content-primary">Teams & Groups</h3>
            <button
              onClick={() => {
                const allGroupIds = groups.map(g => g.group_key);
                const allExpanded = allGroupIds.every(id => expandedGroups.has(id));
                
                if (allExpanded) {
                  setExpandedGroups(new Set());
                } else {
                  setExpandedGroups(new Set(allGroupIds));
                }
              }}
              className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-secondary rounded-md transition-all"
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

          <div className="flex-1 overflow-auto p-3">
            {tree.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-content-secondary mb-2">No teams or groups</p>
                <p className="text-sm text-content-tertiary">Teams and groups will appear here</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {tree.map(node => renderNode(node, 0))}
              </div>
            )}
          </div>
        </div>

        {/* Meetings Panel */}
        <div className="bg-surface border border-outline rounded-lg shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between p-3 border-b border-outline flex-shrink-0 bg-surface-elevated">
            <h3 className="text-base font-semibold text-content-primary">
              {selectedNode ? `Meetings - ${selectedNode.name}` : 'Meetings'}
            </h3>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {!selectedNode ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-content-secondary mb-2">Select a team or group</p>
                <p className="text-sm text-content-tertiary">Click on a team or group to view its meetings</p>
              </div>
            ) : selectedMeetings.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-content-secondary mb-2">No meetings found</p>
                <p className="text-sm text-content-tertiary">This {selectedNode.type === 'group' ? 'group' : 'team'} has no meetings</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedMeetings.map(meeting => {
                  const isGenerated = !meeting.id || meeting.id === 0;
                  const meetingKey = getMeetingKey(meeting);
                  const isEditing = editingMeetingKey === meetingKey;
                  return (
                    <div
                      key={meetingKey}
                      className={`border rounded-lg overflow-hidden hover:shadow-md transition-all ${
                        isGenerated ? 'border-dashed border-outline bg-surface-elevated/30' : 'border-outline'
                      }`}
                    >
                      {/* Header with Meeting Type */}
                      <div className={`flex items-center justify-between px-3 py-2 border-b ${
                        isGenerated ? 'bg-brand/10 border-brand/20' : 'bg-surface-elevated border-outline'
                      }`}>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-content-primary">{meeting.type}</h3>
                        </div>
                        
                        {/* Edit Button */}
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startEditing(meeting)}
                            className="p-1.5 text-content-muted hover:text-brand hover:bg-surface/50 rounded transition-colors"
                            title="Edit meeting"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 space-y-2">
                        {/* Meeting Name */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-content-secondary w-20">Name:</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm font-semibold border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-brand"
                              placeholder="Meeting name"
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className="font-semibold text-content-primary text-sm">
                                {meeting.name}
                              </h4>
                              {isGenerated && (
                                <span className="text-xs text-content-tertiary italic">
                                  (Default name)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Organizer Email */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-content-secondary w-20">Organizer:</span>
                          {isEditing ? (
                            <input
                              type="email"
                              value={editOrganizerEmail}
                              onChange={(e) => setEditOrganizerEmail(e.target.value)}
                              placeholder="organizer@example.com"
                              className="flex-1 px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          ) : (
                            <span className="text-xs text-content-secondary flex-1">
                              {meeting.organizer_email || <span className="text-content-muted italic">No email set</span>}
                            </span>
                          )}
                        </div>

                        {/* Save/Cancel Buttons - Show when editing */}
                        {isEditing && (
                          <div className="flex justify-end gap-2 pt-2 border-t border-outline mt-3">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-3 py-1.5 text-xs text-content-secondary hover:text-content-primary hover:bg-surface-secondary rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEditing(meeting)}
                              className="px-3 py-1.5 text-xs text-white bg-brand hover:bg-brand-hover rounded transition-colors"
                            >
                              Save
                            </button>
                          </div>
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
    </div>
  );
}
