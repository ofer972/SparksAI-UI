'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import HierarchyTable from './hierarchyTable/HierarchyTable';
import type { HierarchyItem } from '@/lib/config';
import { API_CONFIG } from '@/lib/config';
import { buildNodeChildrenMap } from './pigoals/utils';
import { ApiService } from '@/lib/api';
import { EditRecordModal } from './EditRecordModal';
import type { EditableEntityConfig, FormFieldConfig } from '@/lib/entityConfig';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import GoalsConfirmationModal from './pigoals/GoalsConfirmationModal';
import { getPITerminology } from '@/lib/piTerminology';
import ConnectIssuesDialog from './pigoals/ConnectIssuesDialog';
import { createGoalsPanelColumns, type GoalForEdit, type GoalsPanelActionOptions } from './GoalsPanelColumns';

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
 actionOptions?: GoalsPanelActionOptions;
}

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
 actionOptions,
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
    if (scopeType === 'pi') return `${getPITerminology()} Team Goal`;
    if (scopeType === 'sprint') return 'Sprint Team Goal';
    return 'Team Goal';
  };
 
  const getGroupLabel = () => {
    if (scopeType === 'pi') return `${getPITerminology()} Group Goal`;
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
          { value: 'Defined', label: 'Defined' },
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
      title: scopeType === 'pi' ? `${getPITerminology()} Goal` : scopeType === 'sprint' ? 'Sprint Goal' : 'Goal',
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


 // Calculate select all state
 const isSelectAllChecked = allGoalIds.length > 0 && checkedGoalIds.size === allGoalIds.length;
 const isSelectAllIndeterminate = checkedGoalIds.size > 0 && checkedGoalIds.size < allGoalIds.length;

 // Create columns based on type
 const columns = useMemo(() => {
 return createGoalsPanelColumns({
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
 onEditGoal: setEditGoal,
 onOpenEditModal: () => setIsEditModalOpen(true),
 onDeleteGoal: (goal) => {
 setGoalToDelete(goal);
 setShowDeleteGoalModal(true);
 },
 onConnectEpics: (goal) => {
 setGoalToConnectEpics(goal);
 setShowConnectEpicsModal(true);
 },
 onRemoveEpic: (epic) => {
 setEpicToRemove(epic);
 setShowRemoveEpicModal(true);
 },
 hierarchyData,
 scopeType,
 actionOptions,
 });
 }, [nodeHasChildrenMap, expanded, toggleExpanded, type, checkedGoalIds, toggleGoalCheck, allGoalIds, toggleSelectAll, isSelectAllChecked, isSelectAllIndeterminate, hierarchyData, scopeType, actionOptions]);

 // Show loading state
 if (loading && hierarchyData.length === 0) {
 return (
 <div className={`flex flex-col h-full bg-surface border border-outline rounded-lg ${className}`} style={style}>
 <div className="p-4 border-b border-outline bg-surface-elevated flex-shrink-0">
 <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
 </div>
 <div className="flex-1 flex items-center justify-center p-8">
 <p className="text-sm text-content-muted">Loading...</p>
 </div>
 </div>
 );
 }

 // Show error state
 if (error) {
 return (
 <div className={`flex flex-col min-h-0 ${className}`} style={style}>
 <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-danger-border rounded-lg">
 <div className="flex items-center">
 <svg className="w-5 h-5 text-danger-text mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span className="text-sm font-medium text-red-800 text-red-300">Error</span>
 </div>
 <p className="mt-2 text-sm text-red-700 text-red-400">{error}</p>
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
 <div className={`${toastType === 'success' ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
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
 className="text-white hover:text-gray-200 dark:hover:text-gray-300 transition-colors"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 </div>
 )}

 <div className={`flex flex-col h-full bg-surface border border-outline rounded-lg overflow-hidden ${className}`} style={style}>
 <div className="p-2 md:p-4 border-b border-outline bg-surface-elevated flex-shrink-0">
 <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 md:justify-between">
 <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
 <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
 {type === 'user' && actionOptions?.allowCreate !== false && (
 <button
 onClick={() => {
 // Set default goal_type based on filter (default to 'team' if nothing selected)
 const defaultGoalType = isGroup ? 'group' : 'team';
 setEditGoal({
 goal_type: defaultGoalType,
 team_name: teamName || null,
 group_name: isGroup ? (teamName || null) : null,
 goal_text: '',
        status: 'Defined',
 priority_bv: null,
 });
 setIsCreateModalOpen(true);
 }}
 className="px-2 md:px-3 py-1 md:py-1 rounded-lg font-medium text-xs transition-colors whitespace-nowrap bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
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
 px-2 md:px-3 py-1 rounded-lg font-medium text-xs transition-colors whitespace-nowrap
 ${checkedGoalIds.size > 0 && !isConfirming
 ? 'bg-brand text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2'
 : 'bg-gray-300 bg-surface-secondary text-content-muted cursor-not-allowed'
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
 ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-danger-text border-transparent hover:border-red-200 dark:hover:border-red-800'
 : 'bg-surface-secondary text-content-muted cursor-not-allowed border-outline'
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
 <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-4 min-h-0">
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
        status: (data.status as string) || 'Defined',
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
 // Update existing goal - only send fields that have changed
 const updateData: any = {};
 
 // Check if goal_text changed
 if (data.goal_text !== editGoal.goal_text) {
 updateData.goal_text = data.goal_text as string;
 }
 
 // Check if status changed
 if (data.status !== editGoal.status) {
 updateData.status = data.status as string;
 }
 
 // Check if priority_bv changed
 // Convert priority_bv to number if it's a string (from select dropdown)
 const priorityBv = data.priority_bv !== undefined && data.priority_bv !== null
 ? (typeof data.priority_bv === 'string' ? parseInt(data.priority_bv, 10) : (data.priority_bv as number))
 : null;
 
 // Compare with original priority_bv (handle null/undefined cases)
 const originalPriorityBv = editGoal.priority_bv ?? null;
 if (priorityBv !== originalPriorityBv) {
 updateData.priority_bv = priorityBv;
 }
 
 // Only send update if at least one field changed
 if (Object.keys(updateData).length === 0) {
 // No changes detected, just close the modal
 setIsEditModalOpen(false);
 setEditGoal(null);
 return;
 }
 
 // Use appropriate API method based on scope type (same pattern as CREATE)
 if (scopeType === 'pi') {
 await apiService.updatePIGoal(editGoal.id, updateData);
 } else if (scopeType === 'sprint') {
 await apiService.updateSprintGoal(editGoal.id, updateData);
 } else {
 // For release, we can use updatePIGoal as it's generic now
 await apiService.updatePIGoal(editGoal.id, updateData);
 }
        
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
 <div className="bg-surface-elevated border border-outline rounded-lg p-3 space-y-2 mb-3">
 {scopeType === 'pi' && piName && (
 <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">{getPITerminology()}:</span>
 <span className="text-xs text-content-primary text-content-secondary">{piName}</span>
 </div>
 )}
 {scopeType === 'sprint' && sprintId && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Sprint:</span>
 <span className="text-xs text-content-primary text-content-secondary">Sprint ID {sprintId}</span>
 </div>
 )}
 {isGroup && teamName && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Group:</span>
 <span className="text-xs text-content-primary text-content-secondary">{teamName}</span>
 </div>
 )}
 {!isGroup && teamName && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Team:</span>
 <span className="text-xs text-content-primary text-content-secondary">{teamName}</span>
 </div>
 )}
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Goal:</span>
 <span className="text-xs text-content-primary text-content-secondary break-words">{epicToRemove.goalText}</span>
 </div>
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Issue Key:</span>
 <span className="text-xs font-bold text-content-primary">{epicToRemove.epicKey}</span>
 </div>
 {epicToRemove.issueType && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Issue Type:</span>
 <span className="text-xs text-content-primary text-content-secondary">{epicToRemove.issueType}</span>
 </div>
 )}
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[80px]">Issue Summary:</span>
 <span className="text-xs text-content-primary text-content-secondary break-words">{epicToRemove.epicSummary}</span>
 </div>
 </div>
 <p className="text-xs text-content-tertiary">
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
 <p className="text-xs text-content-secondary">
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
 <div className="bg-surface-elevated border border-outline rounded-lg p-3 mb-3 space-y-2">
 {scopeType === 'pi' && piName && (
 <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-content-tertiary min-w-[50px]">{getPITerminology()}:</span>
 <span className="text-xs text-content-primary text-content-secondary">{piName}</span>
 </div>
 )}
 {scopeType === 'sprint' && sprintId && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[50px]">Sprint:</span>
 <span className="text-xs text-content-primary text-content-secondary">Sprint ID {sprintId}</span>
 </div>
 )}
 {goalToDelete.groupName && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[50px]">Group:</span>
 <span className="text-xs text-content-primary text-content-secondary">{goalToDelete.groupName}</span>
 </div>
 )}
 {goalToDelete.teamName && !goalToDelete.groupName && (
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[50px]">Team:</span>
 <span className="text-xs text-content-primary text-content-secondary">{goalToDelete.teamName}</span>
 </div>
 )}
 <div className="flex items-start gap-2">
 <span className="text-xs font-semibold text-content-tertiary min-w-[50px]">Goal:</span>
 <span className="text-xs text-content-primary text-content-secondary break-words">{goalToDelete.text}</span>
 </div>
 </div>
 <p className="text-xs text-content-tertiary">
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

