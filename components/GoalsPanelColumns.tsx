'use client';

import React from 'react';
import type { ColumnConfig } from './hierarchyTable/types';
import type { TreeNode } from './hierarchyTable/types';
import type { HierarchyItem } from '@/lib/config';
import { API_CONFIG } from '@/lib/config';
import { getStatusCategoryColor, getTypeColor } from './hierarchyTable/utils';

// Progress Bar Component (following Release Predictability style)
interface ProgressBarProps {
  percent: number;
  completed: number;
  total: number;
  label?: string;
  showLabel?: boolean;
  compact?: boolean; // For epic progress bars - makes them 30% smaller
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, completed, total, label, showLabel = false, compact = false }) => {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  const formattedPercent = safePercent.toFixed(1);
  const displayLabel = label || 'items';
  const tooltip = total > 0 
    ? `${completed} of ${total} ${displayLabel} completed`
    : `No ${displayLabel} connected`;
  
  // h-3 = 12px (normal), h-2.5 = 10px (25% bigger than h-2 for epics)
  const barHeight = compact ? 'h-2.5' : 'h-3';
  // min-w-[140px] * 0.7 = 98px (30% smaller width)
  const minWidth = compact ? 'min-w-[98px]' : 'min-w-[140px]';
  // For PI goals (showLabel=true), use smaller gaps between progress bar, label, and percentage
  const gap = showLabel ? 'gap-1' : (compact ? 'gap-1.5' : 'gap-2');
  // Use CSS transform scaleX to make compact version 30% smaller in width only (scaleX 0.7)
  // Height is controlled separately via barHeight class (h-2.5 = 10px, 25% bigger than h-2)
  const scaleStyle = compact ? { transform: 'scaleX(0.7)', transformOrigin: 'left center' } : {};

  return (
    <div className={`flex items-center ${gap} w-full ${minWidth}`} style={scaleStyle} title={tooltip}>
      <div className={`flex-1 bg-gray-200 rounded-full ${barHeight} overflow-hidden`}>
        {total > 0 ? (
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${safePercent}%` }}
          />
        ) : (
          <div className="h-full bg-gray-300" style={{ width: '100%' }} />
        )}
      </div>
      {showLabel && label && (
        <span className="text-xs text-content-secondary min-w-[50px] text-right whitespace-nowrap">{label}</span>
      )}
      <span className="text-xs font-medium text-content-primary min-w-[40px] text-right">
        {total === 0 ? '-' : safePercent > 0 ? `${formattedPercent}%` : ''}
      </span>
    </div>
  );
};

// Goal type for editing
export interface GoalForEdit {
  id?: number;
  goal_text: string;
  status: string;
  priority_bv?: number | null;
  goal_type?: string;
  team_name?: string | null;
  group_name?: string | null;
}

export interface GoalsPanelActionOptions {
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowConnect?: boolean;
  allowDisconnect?: boolean;
  allowCreate?: boolean;
}

export interface CreateColumnsParams {
  nodeHasChildrenMap: Map<string, boolean>;
  expanded: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
  type: 'ai' | 'user';
  checkedGoalIds: Set<number>;
  toggleGoalCheck: (goalId: number) => void;
  allGoalIds: number[];
  toggleSelectAll: () => void;
  isSelectAllChecked: boolean;
  isSelectAllIndeterminate: boolean;
  onEditGoal: (goal: GoalForEdit) => void;
  onOpenEditModal: () => void;
  onDeleteGoal: (goal: { id: number; text: string; teamName: string | null; groupName: string | null }) => void;
  onConnectEpics: (goal: { id: number; text: string; teamName?: string; groupName?: string; isGroup?: boolean; connectedEpicKeys?: string[] }) => void;
  onRemoveEpic: (epic: { epicKey: string; epicSummary: string; issueType?: string | null; goalId: number; goalText: string }) => void;
  hierarchyData: HierarchyItem[];
  scopeType: 'pi' | 'sprint' | 'release';
  actionOptions?: GoalsPanelActionOptions;
}

export function createGoalsPanelColumns(params: CreateColumnsParams): ColumnConfig[] {
  const {
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
    onEditGoal,
    onOpenEditModal,
    onDeleteGoal,
    onConnectEpics,
    onRemoveEpic,
    hierarchyData,
    scopeType,
    actionOptions = {},
  } = params;

  const {
    allowEdit = true,
    allowDelete = true,
    allowConnect = true,
    allowDisconnect = true,
  } = actionOptions;

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
              className="text-xs text-content-tertiary hover:text-content-primary flex items-center justify-center w-6 h-6 flex-shrink-0 cursor-pointer"
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
                <span className="text-content-secondary">{displaySummary}</span>
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
                      <span className="text-[13px] text-content-secondary">
                        {prefix} <span className="font-bold">{name}</span>
                      </span>
                    );
                  }
                }
                // Regular value (not a section header)
                return <span className="text-[13px] text-content-secondary">{valueStr}</span>;
              })()
            )}
          </div>

          {/* Connect Epics Button - Only for goal rows in User panel */}
          {isGoalRow && type === 'user' && goalId && allowConnect && (
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

                onConnectEpics({
                  id: goalId,
                  text: String(value || ''),
                  teamName,
                  groupName,
                  isGroup: isGroupGoal,
                  connectedEpicKeys,
                });
              }}
              className="p-0.5 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              title="Connect issues to goal"
            >
              <svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {/* Disconnect Epic Button - Only for epic rows in User panel */}
          {isEpicRow && type === 'user' && displayEpicKey && parentGoalId && allowDisconnect && (
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
            className="w-4 h-4 text-brand border-outline rounded focus:ring-brand cursor-pointer"
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
              className="w-4 h-4 text-brand border-outline rounded focus:ring-brand cursor-pointer"
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
      minWidth: 200, // Wider to accommodate progress bars
      maxWidth: 250,
      size: 220,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const item = row.original as TreeNode;
        const level = item.level || 0;
        const goalId = (item as any)._goalId;
        
        // For goals (level 1), show progress bars
        const isGoalRow = goalId && typeof goalId === 'number' && level === 1;
        
        if (isGoalRow) {
          const progressByEpics = (item as any)._goalProgressByEpics ?? 0;
          const progressByChildren = (item as any)._goalProgressByChildren ?? 0;
          
          // Calculate counts from epic items in hierarchy
          const epicItems = hierarchyData.filter((h: HierarchyItem) => {
            const parentGoalId = (h as any)._parentGoalId;
            return parentGoalId === goalId;
          });
          
          // For epics progress
          const totalEpics = epicItems.length;
          const completedEpics = epicItems.filter((e: HierarchyItem) => 
            (e as any).status_category === 'Done'
          ).length;
          
          // For stories progress
          const totalStories = epicItems.reduce((sum: number, e: HierarchyItem) => 
            sum + ((e as any)._numberOfChildren || 0), 0
          );
          const completedStories = epicItems.reduce((sum: number, e: HierarchyItem) => 
            sum + ((e as any)._numberOfCompletedChildren || 0), 0
          );
          
          // Sprint goals: single progress bar
          if (scopeType === 'sprint') {
            // For sprint, connected issues are in epicItems (they're not epics, but connected issues/stories)
            const totalIssues = epicItems.length;
            const completedIssues = epicItems.filter((e: HierarchyItem) => 
              (e as any).status_category === 'Done'
            ).length;
            
            return (
              <div className="flex items-center justify-start w-full px-2">
                <ProgressBar
                  percent={progressByChildren}
                  completed={completedIssues}
                  total={totalIssues}
                />
              </div>
            );
          }
          
          // PI goals: two stacked progress bars
          return (
            <div className="flex flex-col gap-1.5 px-2">
              <ProgressBar
                percent={progressByEpics}
                completed={completedEpics}
                total={totalEpics}
                label="Epics"
                showLabel={true}
              />
              <ProgressBar
                percent={progressByChildren}
                completed={completedStories}
                total={totalStories}
                label="Stories"
                showLabel={true}
              />
            </div>
          );
        }
        
        // For epics (level 2), show progress bar
        if (level === 2) {
          const progressNum = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
          
          if (isNaN(progressNum) || progressNum === 0) {
            return <div className="text-center"></div>;
          }
          
          const numberOfChildren = (item as any)._numberOfChildren || 0;
          const numberOfCompletedChildren = (item as any)._numberOfCompletedChildren || 0;
          
          return (
            <div className="flex items-center justify-start w-full px-2">
              <ProgressBar
                percent={progressNum}
                completed={numberOfCompletedChildren}
                total={numberOfChildren}
                label="stories"
                compact={true}
              />
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
            <span className="text-[13px] text-content-secondary">{String(value || '')}</span>
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
          }
        }

        return (
          <div className="flex items-center justify-center gap-1">
            {allowEdit && (
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
                  onOpenEditModal();
                }}
                className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-all duration-150 border border-transparent hover:border-green-200"
                title="Edit Goal"
                aria-label="Edit Goal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {type === 'user' && allowDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGoal({ 
                    id: goalId, 
                    text: String(goalText),
                    teamName: teamName || null,
                    groupName: groupName || null,
                  });
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
}

