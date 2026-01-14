'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import HierarchyTable from './hierarchyTable/HierarchyTable';
import type { HierarchyItem } from '@/lib/config';
import type { ColumnConfig } from './hierarchyTable/types';
import type { TreeNode } from './hierarchyTable/types';
import { API_CONFIG } from '@/lib/config';
import { buildNodeChildrenMap } from './pigoals/utils';
import { getStatusCategoryColor, getTypeColor } from './hierarchyTable/utils';
import { ApiService } from '@/lib/api';
import { EditRecordModal } from './EditRecordModal';
import type { EditableEntityConfig, FormFieldConfig } from '@/lib/entityConfig';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import GoalsConfirmationModal from './pigoals/GoalsConfirmationModal';
import ConnectIssuesDialog from './pigoals/ConnectIssuesDialog';

interface GoalsPanelProps {
  title: string;
  hierarchyData: HierarchyItem[];
  type: 'ai' | 'user';
  loading?: boolean;
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
  onConfirmGoals?: (goalIds: number[]) => Promise<void>;
  onRefresh?: () => void;
  scopeType: 'pi' | 'sprint' | 'release';
  piName?: string;
  sprintId?: number;
  releaseId?: number;
  teamName?: string;
  isGroup?: boolean;
}

// Goal type for editing
interface GoalForEdit {
  id?: number; // Optional for create mode
  goal_text: string;
  status: string;
  priority_bv?: number | null;
  goal_type?: string; // 'team', 'group' (overall is disabled/commented out)
  team_name?: string | null;
  group_name?: string | null;
}

// Note: goalEditConfig is now created dynamically via getGoalEditConfig() function

export default function GoalsPanel({
  title,
  hierarchyData,
  type,
  loading = false,
  error = null,
  className = '',
  style,
  onConfirmGoals,
  onRefresh,
  scopeType,
  piName,
  sprintId,
  releaseId,
  teamName,
  isGroup,
}: GoalsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [checkedGoalIds, setCheckedGoalIds] = useState<Set<number>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalForEdit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showRemoveEpicModal, setShowRemoveEpicModal] = useState(false);
  const [epicToRemove, setEpicToRemove] = useState<{ epicKey: string; epicSummary: string; issueType?: string | null; goalId: number; goalText: string } | null>(null);
  const [isDisconnectingEpic, setIsDisconnectingEpic] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<{ 
    id: number; 
    text: string;
    teamName?: string | null;
    groupName?: string | null;
  } | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [showConnectEpicsModal, setShowConnectEpicsModal] = useState(false);
  const [goalToConnectEpics, setGoalToConnectEpics] = useState<{ 
    id: number; 
    text: string; 
    teamName?: string; 
    groupName?: string; 
    isGroup?: boolean;
    connectedEpicKeys?: string[];
  } | null>(null);
  
  // Use TeamsGroupsContext to get teams and groups (already in memory)
  const { teams: contextTeams, groups: contextGroups } = useTeamsGroups();
  
  // Extract team names and group names from context
  const availableTeams = useMemo(() => {
    return contextTeams.map(team => team.team_name);
  }, [contextTeams]);
  
  const availableGroups = useMemo(() => {
    return contextGroups.map(group => group.group_name);
  }, [contextGroups]);

  // Create dynamic goal edit config based on filter state and mode
  const getGoalEditConfig = useCallback((mode: 'create' | 'edit' = 'create'): EditableEntityConfig<GoalForEdit> => {
    // Get current goal_type from editGoal if in edit mode
    const currentGoalType = editGoal?.goal_type || 'team';
    // const isOverallGoal = currentGoalType === 'overall';
    const isTeamGoal = currentGoalType === 'team';
    const isGroupGoal = currentGoalType === 'group';
    
    // Get label prefix based on scope type
    const getTeamLabel = () => {
      if (scopeType === 'pi') return 'PI Team Goal';
      if (scopeType === 'sprint') return 'Sprint Team Goal';
      return 'Team Goal';
    };
    
    const getGroupLabel = () => {
      if (scopeType === 'pi') return 'PI Group Goal';
      if (scopeType === 'sprint') return 'Sprint Group Goal';
      return 'Group Goal';
    };
    
    // Base fields that are always shown
    const baseFields: FormFieldConfig<GoalForEdit>[] = [
        {
          key: 'goal_type',
          label: 'Goal Type',
          type: 'select' as const,
          required: true,
          readonly: mode === 'edit', // Read-only in edit mode
          disabled: mode === 'edit', // Also disabled in edit mode
          options: mode === 'create' 
            ? [
                // { value: 'overall', label: scopeType === 'pi' ? 'Overall PI Goals' : scopeType === 'sprint' ? 'Overall Sprint Goals' : 'Overall Goals' },
                { value: 'team', label: getTeamLabel() },
                { value: 'group', label: getGroupLabel() },
              ]
            : [
                // { value: 'overall', label: scopeType === 'pi' ? 'Overall PI Goals' : scopeType === 'sprint' ? 'Overall Sprint Goals' : 'Overall Goals' },
                ...(isTeamGoal ? [{ value: 'team', label: getTeamLabel() }] : []),
                ...(isGroupGoal ? [{ value: 'group', label: getGroupLabel() }] : []),
              ],
        },
      {
        key: 'goal_text',
        label: 'Goal Text',
        type: 'textarea' as const,
        required: true,
        placeholder: 'Enter goal text',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        required: true,
        options: [
          { value: 'Draft', label: 'Draft' },
          { value: 'In Progress', label: 'In Progress' },
          { value: 'Done', label: 'Done' },
          { value: 'Blocked', label: 'Blocked' },
        ],
      },
      {
        key: 'priority_bv',
        label: 'Priority BV',
        type: 'select' as const,
        required: false,
        placeholder: 'Select priority business value',
        options: [
          { value: 1, label: '1 (lowest)' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
          { value: 4, label: '4' },
          { value: 5, label: '5' },
          { value: 6, label: '6' },
          { value: 7, label: '7' },
          { value: 8, label: '8' },
          { value: 9, label: '9' },
          { value: 10, label: '10 (highest)' },
        ],
      },
    ];
    
    // Conditionally add Team and Group fields
    const teamGroupFields: FormFieldConfig<GoalForEdit>[] = [];
    
    if (mode === 'create') {
      // In create mode, always include both fields but conditionally show/hide based on goal_type
      teamGroupFields.push({
        key: 'team_name',
        label: 'Team',
        type: 'select' as const,
        required: false,
        options: availableTeams.map(team => ({ value: team, label: team })),
        placeholder: 'Select team',
        hidden: (formData: Partial<GoalForEdit>) => {
          const goalType = formData.goal_type || 'team';
          // return goalType === 'overall' || goalType === 'group';
          return goalType === 'group';
        },
      });
      
      teamGroupFields.push({
        key: 'group_name',
        label: 'Group',
        type: 'select' as const,
        required: false,
        options: availableGroups.map(group => ({ value: group, label: group })),
        placeholder: 'Select group',
        hidden: (formData: Partial<GoalForEdit>) => {
          const goalType = formData.goal_type || 'team';
          // return goalType === 'overall' || goalType === 'team';
          return goalType === 'team';
        },
      });
    } else {
      // In edit mode, only show relevant field based on current goal type
      // if (!isOverallGoal) {
        if (isTeamGoal) {
          teamGroupFields.push({
            key: 'team_name',
            label: 'Team',
            type: 'select' as const,
            required: false,
            readonly: true,
            disabled: true,
            options: availableTeams.map(team => ({ value: team, label: team })),
            placeholder: 'Select team',
          });
        } else if (isGroupGoal) {
          teamGroupFields.push({
            key: 'group_name',
            label: 'Group',
            type: 'select' as const,
            required: false,
            readonly: true,
            disabled: true,
            options: availableGroups.map(group => ({ value: group, label: group })),
            placeholder: 'Select group',
          });
        }
      // }
    }
    
    // Insert Team/Group fields after Goal Type
    const editableFields: FormFieldConfig<GoalForEdit>[] = [
      baseFields[0], // goal_type
      ...teamGroupFields, // team_name and/or group_name
      ...baseFields.slice(1), // goal_text, status, priority_bv
    ];
    
    return {
      endpoints: {
        list: '/api/v1/goals',
      },
      fetchList: async () => {
        return [];
      },
      primaryKey: 'id',
      title: scopeType === 'pi' ? 'PI Goal' : scopeType === 'sprint' ? 'Sprint Goal' : 'Goal',
      editableFields,
    };
  }, [isGroup, availableTeams, availableGroups, editGoal, scopeType]);

  // Initialize expanded state for root nodes when data changes
  useEffect(() => {
    if (hierarchyData.length > 0) {
      const rootNodes = hierarchyData.filter(item => !item.parent);
      const newExpanded: Record<string, boolean> = {};
      rootNodes.forEach(node => {
        if (node.key) {
          newExpanded[node.key] = true;
        }
      });
      setExpanded(newExpanded);
    }
  }, [hierarchyData]);

  // Build node children map
  const nodeHasChildrenMap = useMemo(() => {
    return buildNodeChildrenMap(hierarchyData);
  }, [hierarchyData]);

  // Toggle expanded state
  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Get all goal IDs from hierarchy data
  const allGoalIds = useMemo(() => {
    const ids: number[] = [];
    hierarchyData.forEach(item => {
      const goalId = (item as any)._goalId;
      if (goalId && typeof goalId === 'number') {
        ids.push(goalId);
      }
    });
    return ids;
  }, [hierarchyData]);

  // Toggle checkbox for a specific goal
  const toggleGoalCheck = useCallback((goalId: number) => {
    setCheckedGoalIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (checkedGoalIds.size === allGoalIds.length) {
      // Deselect all
      setCheckedGoalIds(new Set());
    } else {
      // Select all
      setCheckedGoalIds(new Set(allGoalIds));
    }
  }, [checkedGoalIds.size, allGoalIds]);

  // Handle confirm goals
  const handleConfirmGoals = useCallback(async () => {
    if (!onConfirmGoals || checkedGoalIds.size === 0) return;

    setIsConfirming(true);
    try {
      await onConfirmGoals(Array.from(checkedGoalIds));
      // Clear checked goals after successful confirmation
      setCheckedGoalIds(new Set());
      // Note: onConfirmGoals handler in parent component handles refreshing both panels
    } catch (err) {
      console.error('Error confirming goals:', err);
      // Don't clear checkboxes on error so user can retry
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirmGoals, checkedGoalIds]);

  // Handle delete goals
  const handleDeleteGoals = useCallback(async () => {
    if (checkedGoalIds.size === 0) return;

    setIsDeleting(true);
    setShowDeleteModal(false);
    
    const apiService = new ApiService();
    const goalIdsArray = Array.from(checkedGoalIds);
    
    try {
      // Delete all selected goals using Promise.allSettled to handle partial failures
      const results = await Promise.allSettled(
        goalIdsArray.map(goalId => apiService.deletePIGoal(goalId)) // Reuse deletePIGoal for all scope types
      );

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Clear checked goals
      setCheckedGoalIds(new Set());

      // Show appropriate toast message
      if (failed === 0) {
        setToastType('success');
        setToastMessage(`${successful} goal(s) deleted successfully`);
      } else if (successful > 0) {
        setToastType('error');
        setToastMessage(`${successful} goal(s) deleted, ${failed} failed`);
      } else {
        setToastType('error');
        setToastMessage(`Failed to delete ${failed} goal(s)`);
      }

      // Auto-hide toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);

      // Refresh the AI goals panel
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error deleting goals:', err);
      setToastType('error');
      setToastMessage('Failed to delete goals');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  }, [checkedGoalIds, onRefresh]);

  // Handle delete single goal (for User panel)
  const handleDeleteGoal = useCallback(async () => {
    if (!goalToDelete) return;

    setIsDeletingGoal(true);
    setShowDeleteGoalModal(false);
    
    const apiService = new ApiService();
    
    try {
      await apiService.deletePIGoal(goalToDelete.id); // Reuse deletePIGoal for all scope types

      // Show success toast message
      setToastType('success');
      setToastMessage('Goal was deleted successfully');

      // Auto-hide toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);

      // Refresh the User goals panel after successful deletion
      if (onRefresh) {
        await onRefresh();
      }

      // Clear goal to delete
      setGoalToDelete(null);
    } catch (err) {
      console.error('Error deleting goal:', err);
      setToastType('error');
      setToastMessage('Failed to delete goal');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsDeletingGoal(false);
    }
  }, [goalToDelete, onRefresh]);

  // Handle disconnect epic from goal
  const handleDisconnectEpic = useCallback(async () => {
    if (!epicToRemove) return;

    setIsDisconnectingEpic(true);
    const apiService = new ApiService();
    
    try {
      // Get current epic_keys from the goal using _parentGoalId (more reliable)
      // Filter all epics that belong to this specific goal using _parentGoalId
      const currentEpicKeys: string[] = [];
      
      hierarchyData
        .filter(item => {
          // Must have an epic key and _parentGoalId
          if (!(item as any)._epicKey) return false;
          // Use _parentGoalId to ensure we only get epics from the correct goal
          return (item as any)._parentGoalId === epicToRemove.goalId;
        })
        .forEach(item => {
          currentEpicKeys.push((item as any)._epicKey);
        });

      // Remove the epic key from the array
      const updatedEpicKeys = currentEpicKeys.filter(key => key !== epicToRemove.epicKey);

      // Update the goal with updated issue_keys
      await apiService.updatePIGoal(epicToRemove.goalId, {
        epic_keys: updatedEpicKeys,
      }); // Reuse updatePIGoal for all scope types

      // Show success toast message
      setToastType('success');
      setToastMessage('Epic disconnected successfully');

      // Auto-hide toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);

      // Refresh the User goals panel after successful disconnection
      if (onRefresh) {
        await onRefresh();
      }

      // Close modal and clear state
      setShowRemoveEpicModal(false);
      setEpicToRemove(null);
    } catch (err) {
      console.error('Error disconnecting epic:', err);
      setToastType('error');
      setToastMessage('Failed to disconnect epic');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsDisconnectingEpic(false);
    }
  }, [epicToRemove, hierarchyData, onRefresh]);

  // Handle connect epics to goal
  const handleConnectEpics = useCallback(async (selectedEpicKeys: string[]) => {
    if (!goalToConnectEpics || selectedEpicKeys.length === 0) return;

    const apiService = new ApiService();
    
    try {
      // Get current epic_keys from the goal and merge with new ones
      const goalItem = hierarchyData.find(item => (item as any)._goalId === goalToConnectEpics.id);
      const currentEpicKeys: string[] = [];
      
      if (goalItem) {
        const goalKey = goalItem.key;
        hierarchyData.forEach(item => {
          if (item.parent === goalKey && (item as any)._epicKey) {
            currentEpicKeys.push((item as any)._epicKey);
          }
        });
      }

      // Merge current epic keys with newly selected ones (avoid duplicates)
      const allEpicKeys = Array.from(new Set([...currentEpicKeys, ...selectedEpicKeys]));

      // Update the goal with merged issue_keys
      await apiService.updatePIGoal(goalToConnectEpics.id, {
        epic_keys: allEpicKeys,
      });

      // Show success toast message
      setToastType('success');
      setToastMessage(`${selectedEpicKeys.length} epic(s) connected successfully`);
      setTimeout(() => setToastMessage(null), 3000);

      // Refresh the User goals panel after successful connection
      if (onRefresh) {
        await onRefresh();
      }

      // Close modal and clear state
      setShowConnectEpicsModal(false);
      setGoalToConnectEpics(null);
    } catch (err) {
      console.error('Error connecting epics:', err);
      setToastType('error');
      setToastMessage('Failed to connect epics');
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [goalToConnectEpics, hierarchyData, onRefresh]);

  // Helper function to create columns with specific map and expanded state
  const createColumns = useCallback((
    nodeHasChildrenMap: Map<string, boolean>,
    expanded: Record<string, boolean>,
    toggleExpanded: (key: string) => void,
    type: 'ai' | 'user',
    checkedGoalIds: Set<number>,
    toggleGoalCheck: (goalId: number) => void,
    allGoalIds: number[],
    toggleSelectAll: () => void,
    isSelectAllChecked: boolean,
    isSelectAllIndeterminate: boolean,
    onEditGoal: (goal: GoalForEdit) => void,
    hierarchyData: HierarchyItem[],
    onRemoveEpic: (epic: { epicKey: string; epicSummary: string; issueType?: string | null; goalId: number; goalText: string }) => void
  ): ColumnConfig[] => {
    // Base column: Section / Goal / Issues (always included)
    const hierarchyColumn: ColumnConfig = {
      id: 'Section / Goal / Issues',
      header: 'Section / Goal / Issues',
      accessorKey: 'Section / Goal / Issues',
      minWidth: 400,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const item = row.original as TreeNode;
        const level = item.level || 0;
        const key = item.key || '';
        // Check if item has children from our map
        const hasChildren = key ? (nodeHasChildrenMap.get(key) || false) : false;
        const isExpanded = key ? (expanded[key] || false) : false;
        
        // Access epic data from the item
        const epicKey = (item as any)._epicKey || '';
        const epicSummary = (item as any)._epicSummary || '';
        const issueType = (item as any)._issueType || '';
        const jiraUrl = API_CONFIG.jiraUrl;

        // Epic rows: level 2 (section=0, goal=1, epic=2) AND key matches epic pattern (e.g., IDPSCAN-20963)
        // OR if _epicKey is explicitly set
        const keyIsEpicPattern = key && /^[A-Z]+-\d+$/.test(key);
        const isEpicRow = !!epicKey || (level === 2 && keyIsEpicPattern);
        
        // For epic rows, use the key as the epic key if _epicKey is not set
        const displayEpicKey = epicKey || (isEpicRow && keyIsEpicPattern ? key : '');
        const displaySummary = epicSummary || (isEpicRow && value ? String(value) : '');

        // Check if this is a goal row (has _goalId and level 1)
        const goalId = (item as any)._goalId;
        const isGoalRow = goalId && typeof goalId === 'number' && level === 1;

        // Calculate padding based on level (20px per level)
        const paddingLeft = level * 20;

        // Find parent goal text for epic rows
        let parentGoalText = '';
        let parentGoalId: number | null = null;
        if (isEpicRow) {
          // Use _parentGoalId stored directly on epic item (more reliable than lookup)
          parentGoalId = (item as any)._parentGoalId || null;
          
          // Fallback: if _parentGoalId is not set, try to find it from parent (for backwards compatibility)
          if (!parentGoalId && item.parent) {
            const parentItem = hierarchyData.find(h => h.key === item.parent);
            if (parentItem) {
              parentGoalId = (parentItem as any)._goalId || null;
            }
          }
          
          // If we have parentGoalId, find the parent goal text for display
          if (parentGoalId && item.parent) {
            const parentItem = hierarchyData.find(h => h.key === item.parent);
            if (parentItem) {
              parentGoalText = String(parentItem['Section / Goal / Issues'] || '');
            }
          }
        }

        return (
          <div className="flex items-center gap-1 text-[13px] group" style={{ paddingLeft: `${paddingLeft}px` }}>
            {/* Expand/Collapse Icon */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (key) {
                    toggleExpanded(key);
                  }
                }}
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center w-6 h-6 flex-shrink-0 cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
                style={{ minWidth: '24px', width: '24px', height: '24px' }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="inline-block w-6 h-6 flex-shrink-0" style={{ minWidth: '24px', width: '24px' }} />
            )}

            {/* Content */}
            <div className="flex-1">
              {isEpicRow && displayEpicKey ? (
                // Epic row: show key as link + issue type + summary (format: IDPSCAN-20963 [Epic] Summary)
                <span className="text-[13px]">
                  {jiraUrl ? (
                    <a
                      href={`${jiraUrl}/browse/${displayEpicKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(`${jiraUrl}/browse/${displayEpicKey}`, '_blank', 'noopener,noreferrer');
                      }}
                      title={`Open ${displayEpicKey} in JIRA`}
                      className="epic-link"
                    >
                      {displayEpicKey}
                    </a>
                  ) : (
                    <span 
                      className="epic-link"
                      style={{ cursor: 'default' }}
                      title={`JIRA URL not configured. Epic: ${displayEpicKey}`}
                    >
                      {displayEpicKey}
                    </span>
                  )}
                  {issueType && (
                    <>
                      {' '}
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${getTypeColor(issueType)}`}>
                        [{issueType}]
                      </span>
                    </>
                  )}
                  {' '}
                  <span style={{ color: '#374151' }}>{displaySummary}</span>
                </span>
              ) : (
                // Section or Goal row: show value
                (() => {
                  const valueStr = String(value || '');
                  // Check if this is a section header with "Group Goals:" or "Team Goals:"
                  if (valueStr.startsWith('Group Goals:') || valueStr.startsWith('Team Goals:')) {
                    const parts = valueStr.split(':');
                    if (parts.length === 2) {
                      const prefix = parts[0] + ':';
                      const name = parts[1].trim();
                      return (
                        <span className="text-[13px]" style={{ color: '#374151' }}>
                          {prefix} <span className="font-bold">{name}</span>
                        </span>
                      );
                    }
                  }
                  // Regular value (not a section header)
                  return <span className="text-[13px]" style={{ color: '#374151' }}>{valueStr}</span>;
                })()
              )}
            </div>

            {/* Connect Epics Button - Only for goal rows in User panel */}
            {isGoalRow && type === 'user' && goalId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Get connected epic keys from children
                  const connectedEpicKeys: string[] = [];
                  hierarchyData.forEach(item => {
                    if (item.parent === key && (item as any)._epicKey) {
                      connectedEpicKeys.push((item as any)._epicKey);
                    }
                  });

                  // Determine team/group info from parent section
                  let teamName: string | undefined = undefined;
                  let groupName: string | undefined = undefined;
                  let isGroupGoal = false;

                  if (item.parent) {
                    const parentItem = hierarchyData.find(h => h.key === item.parent);
                    if (parentItem) {
                      const parentSection = String(parentItem['Section / Goal / Issues'] || '');
                      if (parentSection.startsWith('Team Goals:')) {
                        teamName = parentSection.replace('Team Goals: ', '').trim();
                      } else if (parentSection.startsWith('Group Goals:')) {
                        groupName = parentSection.replace('Group Goals: ', '').trim();
                        isGroupGoal = true;
                      }
                    }
                  }

                  setGoalToConnectEpics({
                    id: goalId,
                    text: String(value || ''),
                    teamName,
                    groupName,
                    isGroup: isGroupGoal,
                    connectedEpicKeys,
                  });
                  setShowConnectEpicsModal(true);
                }}
                className="p-0.5 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Connect issues to goal"
              >
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}

            {/* Disconnect Epic Button - Only for epic rows in User panel */}
            {isEpicRow && type === 'user' && displayEpicKey && parentGoalId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveEpic({
                    epicKey: displayEpicKey,
                    epicSummary: displaySummary,
                    issueType: issueType || null,
                    goalId: parentGoalId!,
                    goalText: parentGoalText,
                  });
                }}
                className="p-0.5 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Disconnect issue from goal"
              >
                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      },
    };

    // For AI type, add checkbox column and hierarchy column
    if (type === 'ai') {
      const checkboxColumn: ColumnConfig = {
        id: 'checkbox',
        header: allGoalIds.length > 0 ? (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelectAllChecked}
              ref={(input) => {
                if (input) input.indeterminate = isSelectAllIndeterminate;
              }}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelectAll();
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              title="Select all goals"
            />
          </div>
        ) : '',
        accessorKey: 'checkbox',
        minWidth: 50,
        maxWidth: 50,
        cell: ({ row }) => {
          const item = row.original as TreeNode;
          const goalId = (item as any)._goalId;
          const level = item.level || 0;
          const isGoalRow = goalId && typeof goalId === 'number' && level === 1;
          
          if (!isGoalRow) {
            return <div></div>;
          }

          const isChecked = checkedGoalIds.has(goalId);
          
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleGoalCheck(goalId);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
          );
        },
      };
      return [hierarchyColumn, checkboxColumn];
    }

    // For user type, return columns without AI column
    return [
      hierarchyColumn,
      {
        id: 'Goal Status',
        header: 'Status',
        accessorKey: 'Status',
        minWidth: 120,
        maxWidth: 144,
        size: 132, // 20% wider than original 110 (110 * 1.2 = 132)
        cell: ({ getValue, row }) => {
          const value = getValue();
          const item = row.original as TreeNode;
          const level = item.level || 0;
          // For sections (level 0), return empty cell - no minus sign, no grey background
          if (level === 0 || !value || value === '') {
            return <div></div>;
          }
          // For goals and epics, render badge
          let badgeClass = 'px-2 py-1 rounded text-[13px] font-medium border';
          
          // Check if this is a goal row (has _goalId and level 1)
          const goalId = (item as any)._goalId;
          const isGoalRow = goalId && typeof goalId === 'number' && level === 1;
          
          let statusCategory = '';
          if (isGoalRow) {
            // For goals: use the status value directly and map to status_category
            const goalStatus = String(value || '').toLowerCase().trim();
            if (goalStatus === 'done') {
              statusCategory = 'Done';
            } else if (goalStatus === 'in progress') {
              statusCategory = 'In Progress';
            } else if (goalStatus === 'blocked') {
              statusCategory = 'Blocked';
            } else {
              statusCategory = goalStatus; // Use as-is for other statuses
            }
          } else {
            // For issues/epics: use status_category from the item
            statusCategory = (item as any).status_category || (item as any)['Status Category'] || '';
          }
          
          badgeClass += ` ${getStatusCategoryColor(String(statusCategory || ''))}`;
          return (
            <div>
              <span className={badgeClass}>
                {String(value || '')}
              </span>
            </div>
          );
        },
      },
        {
          id: 'Goal Progress',
          header: 'Progress',
          accessorKey: 'Progress',
          minWidth: 85, // 10% wider than 77 (77 * 1.1 = 84.7, rounded to 85)
          maxWidth: 101, // 10% wider than 92 (92 * 1.1 = 101.2, rounded to 101)
          size: 94, // 10% wider than 85 (85 * 1.1 = 93.5, rounded to 94)
          cell: ({ getValue, row }) => {
            const value = getValue();
            const item = row.original as TreeNode;
            const level = item.level || 0;
            const goalId = (item as any)._goalId;
            
            // For goals (level 1), show progress from backend
            const isGoalRow = goalId && typeof goalId === 'number' && level === 1;
            
            if (isGoalRow) {
              const progressByEpics = (item as any)._goalProgressByEpics;
              const progressByChildren = (item as any)._goalProgressByChildren;
              
              // Format the progress values
              const epicsPercent = progressByEpics != null ? Math.round(progressByEpics) : 0;
              const childrenPercent = progressByChildren != null ? Math.round(progressByChildren) : 0;
              
              return (
                <div className="text-center" style={{ minWidth: '94px', width: '94px' }}>
                  <span className="text-[13px] text-gray-700">
                    {scopeType === 'sprint' 
                      ? `${childrenPercent}%`
                      : `${epicsPercent}% on epics ${childrenPercent}% on stories`
                    }
                  </span>
                </div>
              );
            }
            
            // For epics (level 2), show progress percentage from backend
            if (level === 2) {
              const progressNum = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
              const progressInt = Math.floor(progressNum);
              
              if (progressInt === 0 || isNaN(progressInt)) {
                return <div className="text-center"></div>;
              }
              
              const displayValue = `${progressInt}%`;
              let progressColor = '';
              if (progressInt === 100) {
                progressColor = 'text-green-600 font-semibold';
              } else {
                progressColor = 'text-gray-700';
              }
              
              return (
                <div className="text-center" style={{ minWidth: '94px', width: '94px' }}>
                  <span className={`text-[13px] ${progressColor}`}>{displayValue}</span>
                </div>
              );
            }
            
            // For sections (level 0), show empty
            return <div className="text-center"></div>;
          },
        },
      {
        id: 'Priority BV',
        header: 'Priority BV',
        accessorKey: 'Priority BV',
        minWidth: 90,
        maxWidth: 110,
        size: 100,
        cell: ({ getValue, row }) => {
          const value = getValue();
          const item = row.original as TreeNode;
          const level = item.level || 0;
          // For sections (level 0) and epics (level 2), return empty cell
          if (level === 0 || level === 2 || !value || value === '') {
            return <div></div>;
          }
          // For goals (level 1), display the priority BV value
          return (
            <div className="text-center">
              <span className="text-[13px] text-gray-700">{String(value || '')}</span>
            </div>
          );
        },
      },
      {
        id: 'Actions',
        header: '',
        accessorKey: 'Actions',
        minWidth: 60,
        maxWidth: 60,
        cell: ({ row }) => {
          const item = row.original as TreeNode;
          const goalId = (item as any)._goalId;
          const level = item.level || 0;
          // Only show edit icon for goals (level 1), not for sections or epics
          const isGoalRow = goalId && typeof goalId === 'number' && level === 1;
          
          if (!isGoalRow) {
            return <div></div>;
          }

          const goalText = item['Section / Goal / Issues'] || '';
          const goalStatus = item['Status'] || '';
          const goalPriorityBv = (item as any)._goalPriorityBv ?? null;
          
          // Determine goal_type, team_name, group_name from parent section
          let goalType: string = 'team'; // Default to 'team' since 'overall' is disabled
          let teamName: string | null = null;
          let groupName: string | null = null;
          
          if (item.parent) {
            const parentItem = hierarchyData.find(h => h.key === item.parent);
            if (parentItem) {
              const parentSection = String(parentItem['Section / Goal / Issues'] || '');
              if (parentSection.startsWith('Team Goals:')) {
                goalType = 'team';
                teamName = parentSection.replace('Team Goals: ', '').trim() || null;
              } else if (parentSection.startsWith('Group Goals:')) {
                goalType = 'group';
                groupName = parentSection.replace('Group Goals: ', '').trim() || null;
              }
              // else if (parentSection === 'Overall PI Goals' || parentSection === 'Overall Sprint Goals' || parentSection === 'Overall Goals') {
              //   goalType = 'overall';
              // }
            }
          }

          return (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditGoal({
                    id: goalId,
                    goal_text: String(goalText),
                    status: String(goalStatus),
                    priority_bv: goalPriorityBv,
                    goal_type: goalType,
                    team_name: teamName,
                    group_name: groupName,
                  });
                  setIsEditModalOpen(true);
                }}
                className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-all duration-150 border border-transparent hover:border-green-200"
                title="Edit Goal"
                aria-label="Edit Goal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {type === 'user' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGoalToDelete({ 
                      id: goalId, 
                      text: String(goalText),
                      teamName: teamName || null,
                      groupName: groupName || null,
                    });
                    setShowDeleteGoalModal(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-all duration-150 border border-transparent hover:border-red-200"
                  title="Delete Goal"
                  aria-label="Delete Goal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                  </svg>
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [scopeType]);

  // Calculate select all state
  const isSelectAllChecked = allGoalIds.length > 0 && checkedGoalIds.size === allGoalIds.length;
  const isSelectAllIndeterminate = checkedGoalIds.size > 0 && checkedGoalIds.size < allGoalIds.length;

  // Create columns based on type
  const columns = useMemo(() => {
    return createColumns(
      nodeHasChildrenMap, 
      expanded, 
      toggleExpanded, 
      type, 
      checkedGoalIds, 
      toggleGoalCheck,
      allGoalIds,
      toggleSelectAll,
      isSelectAllChecked,
      isSelectAllIndeterminate,
      setEditGoal,
      hierarchyData,
      (epic) => {
        setEpicToRemove(epic);
        setShowRemoveEpicModal(true);
      }
    );
  }, [nodeHasChildrenMap, expanded, toggleExpanded, type, checkedGoalIds, toggleGoalCheck, allGoalIds, toggleSelectAll, isSelectAllChecked, isSelectAllIndeterminate, createColumns, hierarchyData]);

  // Show loading state
  if (loading && hierarchyData.length === 0) {
    return (
      <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg ${className}`} style={style}>
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`} style={style}>
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-800">Error</span>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Show data
  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
            {toastType === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="flex-1 text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`} style={style}>
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center gap-1.5">
              {type === 'user' && (
                <button
                  onClick={() => {
                    // Set default goal_type based on filter (default to 'team' if nothing selected)
                    const defaultGoalType = isGroup ? 'group' : 'team';
                    setEditGoal({
                      goal_type: defaultGoalType,
                      team_name: teamName || null,
                      group_name: isGroup ? (teamName || null) : null,
                      goal_text: '',
                      status: 'Draft',
                      priority_bv: null,
                    });
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg font-medium text-xs transition-colors whitespace-nowrap bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
                >
                  Add Goal
                </button>
              )}
              {type === 'ai' && onConfirmGoals && (
                <>
                  <button
                    onClick={handleConfirmGoals}
                    disabled={checkedGoalIds.size === 0 || isConfirming}
                    className={`
                      px-3 py-1 rounded-lg font-medium text-xs transition-colors whitespace-nowrap
                      ${checkedGoalIds.size > 0 && !isConfirming
                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                    `}
                  >
                    {isConfirming ? 'Moving...' : 'Move to User Goals'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={checkedGoalIds.size === 0 || isDeleting}
                    className={`
                      p-1 rounded-md transition-all duration-150 border flex-shrink-0
                      ${checkedGoalIds.size > 0 && !isDeleting
                        ? 'hover:bg-red-50 text-red-600 border-transparent hover:border-red-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      }
                    `}
                    title="Delete selected goals"
                    aria-label="Delete selected goals"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
          <style dangerouslySetInnerHTML={{
            __html: `
              .pi-goals-table-wrapper table thead tr th:first-child,
              .pi-goals-table-wrapper table tbody tr td:first-child {
                display: none !important;
              }
              .pi-goals-table-wrapper .epic-link,
              .pi-goals-table-wrapper a.epic-link,
              .pi-goals-table-wrapper span.epic-link {
                color: #2563eb !important;
                text-decoration: underline !important;
                font-weight: 500 !important;
                cursor: pointer !important;
              }
              .pi-goals-table-wrapper .epic-link:hover,
              .pi-goals-table-wrapper a.epic-link:hover {
                color: #1d4ed8 !important;
                text-decoration: underline !important;
              }
              .pi-goals-table-wrapper .epic-link:visited,
              .pi-goals-table-wrapper a.epic-link:visited {
                color: #2563eb !important;
              }
            `
          }} />
          <div className="pi-goals-table-wrapper">
            <HierarchyTable
              data={hierarchyData}
              columns={columns}
              defaultExpanded={false}
              className="h-full"
              jiraUrl={API_CONFIG.jiraUrl}
              expanded={expanded}
              onExpandedChange={setExpanded}
            />
          </div>
        </div>
      </div>

      {/* Edit Goal Dialog */}
      {(editGoal || isCreateModalOpen) && (
        <EditRecordModal
          isOpen={isEditModalOpen || isCreateModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
            setEditGoal(null);
          }}
          item={editGoal}
          config={getGoalEditConfig(isCreateModalOpen ? 'create' : 'edit')}
          mode={isCreateModalOpen ? 'create' : 'edit'}
          onSave={async (data) => {
            const apiService = new ApiService();
            
            if (isCreateModalOpen) {
              // Create new goal
              if (scopeType === 'pi' && !piName) {
                throw new Error('PI name is required to create a PI goal');
              }
              if (scopeType === 'sprint' && !sprintId) {
                throw new Error('Sprint ID is required to create a Sprint goal');
              }
              if (scopeType === 'release' && !releaseId) {
                throw new Error('Release ID is required to create a Release goal');
              }
              
              const goalType = (data.goal_type as string) || (isGroup ? 'group' : 'team');
              
              const createData: any = {
                goal_text: data.goal_text as string,
                status: (data.status as string) || 'Draft',
                issue_keys: [],
              };
              
              // Set scope-specific context
              if (scopeType === 'pi' && piName) {
                createData.pi = piName;
              } else if (scopeType === 'sprint' && sprintId) {
                createData.sprint_id = sprintId;
              } else if (scopeType === 'release' && releaseId) {
                createData.release_id = releaseId;
              }
              
              if (data.priority_bv !== undefined && data.priority_bv !== null) {
                // Convert to number if it's a string (from select dropdown)
                createData.priority_bv = typeof data.priority_bv === 'string' 
                  ? parseInt(data.priority_bv, 10) 
                  : (data.priority_bv as number);
              }
              
              // Set team_name or group_name based on goal_type
              if (goalType === 'overall') {
                // Overall goals don't have team_name or group_name
              } else if (goalType === 'team' && data.team_name) {
                createData.team_name = data.team_name as string;
              } else if (goalType === 'group' && data.group_name) {
                createData.group_name = data.group_name as string;
              }
              
              // Use appropriate API method based on scope type
              if (scopeType === 'pi') {
                await apiService.createPIGoal(createData);
              } else if (scopeType === 'sprint') {
                await apiService.createSprintGoal(createData);
              } else {
                // For release, we can use createPIGoal as it's generic now
                await apiService.createPIGoal(createData);
              }
              
              // Refresh the goals data
              if (onRefresh) {
                await onRefresh();
              }
              
              // Show success toast message
              setToastType('success');
              setToastMessage('Goal was created successfully');
              
              // Auto-hide toast after 3 seconds
              setTimeout(() => setToastMessage(null), 3000);
              
              // Close modal
              setIsCreateModalOpen(false);
            } else if (editGoal && editGoal.id) {
              // Update existing goal
              // Convert priority_bv to number if it's a string (from select dropdown)
              const priorityBv = data.priority_bv !== undefined && data.priority_bv !== null
                ? (typeof data.priority_bv === 'string' ? parseInt(data.priority_bv, 10) : (data.priority_bv as number))
                : null;

              const updateData: any = {
                goal_text: data.goal_text as string,
                status: data.status as string,
                priority_bv: priorityBv,
              };
              
              // Update team_name or group_name based on goal_type
              const goalType = (data.goal_type as string) || 'team';
              if (goalType === 'team' && data.team_name !== undefined) {
                updateData.team_name = data.team_name as string | null;
                updateData.group_name = null; // Clear group_name if switching to team
              } else if (goalType === 'group' && data.group_name !== undefined) {
                updateData.group_name = data.group_name as string | null;
                updateData.team_name = null; // Clear team_name if switching to group
              }
              // else if (goalType === 'overall') {
              //   updateData.team_name = null;
              //   updateData.group_name = null;
              // }
              
              await apiService.updatePIGoal(editGoal.id, updateData);
              
              // Refresh the goals data first
              if (onRefresh) {
                await onRefresh();
              }
              
              // Show success toast message
              setToastType('success');
              setToastMessage('Goal was updated successfully');
              
              // Auto-hide toast after 3 seconds
              setTimeout(() => setToastMessage(null), 3000);
              
              // Close modal
              setIsEditModalOpen(false);
              setEditGoal(null);
            }
          }}
        />
      )}

      {/* Disconnect Epic Confirmation Modal */}
      <GoalsConfirmationModal
        isOpen={showRemoveEpicModal}
        onClose={() => {
          setShowRemoveEpicModal(false);
          setEpicToRemove(null);
        }}
        onConfirm={handleDisconnectEpic}
        title="Disconnect Issue from Goal"
        message={
          epicToRemove ? (
            <>
              <p className="mb-3">
                Do you want to disconnect this issue from the goal?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 mb-3">
                {scopeType === 'pi' && piName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[80px]">PI:</span>
                    <span className="text-xs text-gray-900">{piName}</span>
                  </div>
                )}
                {scopeType === 'sprint' && sprintId && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Sprint:</span>
                    <span className="text-xs text-gray-900">Sprint ID {sprintId}</span>
                  </div>
                )}
                {isGroup && teamName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Group:</span>
                    <span className="text-xs text-gray-900">{teamName}</span>
                  </div>
                )}
                {!isGroup && teamName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Team:</span>
                    <span className="text-xs text-gray-900">{teamName}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Goal:</span>
                  <span className="text-xs text-gray-900 break-words">{epicToRemove.goalText}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Issue Key:</span>
                  <span className="text-xs font-bold text-gray-900">{epicToRemove.epicKey}</span>
                </div>
                {epicToRemove.issueType && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Issue Type:</span>
                    <span className="text-xs text-gray-900">{epicToRemove.issueType}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-600 min-w-[80px]">Issue Summary:</span>
                  <span className="text-xs text-gray-900 break-words">{epicToRemove.epicSummary}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                The issue will be disconnected from this goal and can be reconnected later.
              </p>
            </>
          ) : (
            ''
          )
        }
        confirmButtonText="Disconnect Issue"
        variant="danger"
        isLoading={isDisconnectingEpic}
      />

      {/* Delete Goals Confirmation Modal */}
      <GoalsConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGoals}
        title="Delete Goals"
        message={
          <>
            <p className="mb-2">
              You are about to delete <span className="font-bold">{checkedGoalIds.size}</span> goal(s). Do you want to continue?
            </p>
            <p className="text-xs text-gray-600">
              This action cannot be undone.
            </p>
          </>
        }
        confirmButtonText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Delete Single Goal Confirmation Modal (User panel) */}
      <GoalsConfirmationModal
        isOpen={showDeleteGoalModal}
        onClose={() => {
          setShowDeleteGoalModal(false);
          setGoalToDelete(null);
        }}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message={
          goalToDelete ? (
            <>
              <p className="mb-3">
                Are you sure you want to delete this goal?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
                {scopeType === 'pi' && piName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[50px]">PI:</span>
                    <span className="text-xs text-gray-900">{piName}</span>
                  </div>
                )}
                {scopeType === 'sprint' && sprintId && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[50px]">Sprint:</span>
                    <span className="text-xs text-gray-900">Sprint ID {sprintId}</span>
                  </div>
                )}
                {goalToDelete.groupName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[50px]">Group:</span>
                    <span className="text-xs text-gray-900">{goalToDelete.groupName}</span>
                  </div>
                )}
                {goalToDelete.teamName && !goalToDelete.groupName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-600 min-w-[50px]">Team:</span>
                    <span className="text-xs text-gray-900">{goalToDelete.teamName}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-600 min-w-[50px]">Goal:</span>
                  <span className="text-xs text-gray-900 break-words">{goalToDelete.text}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                This action cannot be undone.
              </p>
            </>
          ) : (
            ''
          )
        }
        confirmButtonText="Delete"
        variant="danger"
        isLoading={isDeletingGoal}
      />

      {/* Connect Issues to Goal Modal */}
      {goalToConnectEpics && (
        <ConnectIssuesDialog
          isOpen={showConnectEpicsModal}
          onClose={() => {
            setShowConnectEpicsModal(false);
            setGoalToConnectEpics(null);
          }}
          goal={{
            id: goalToConnectEpics.id,
            text: goalToConnectEpics.text,
            teamName: goalToConnectEpics.teamName,
            groupName: goalToConnectEpics.groupName,
            isGroup: goalToConnectEpics.isGroup,
          }}
          scopeType={scopeType}
          scopeContext={{
            piName,
            sprintId,
            releaseId,
          }}
          connectedEpicKeys={goalToConnectEpics.connectedEpicKeys || []}
          onConnect={handleConnectEpics}
        />
      )}
    </>
  );
}

