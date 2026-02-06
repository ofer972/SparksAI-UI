'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { piLabel } from '@/lib/piTerminology';

interface Goal {
  id: number;
  goal_text: string;
  goal_progress_by_epics?: number | null;
  goal_progress_by_children?: number | null;
  issue_keys?: Array<{
    issue_key: string;
    status_category?: string | null;
    number_of_children?: number;
    number_of_completed_children?: number;
  }>;
}

interface GoalsProgressCompactProps {
  type: 'pi' | 'sprint';
  piName?: string;
  sprintId?: number;
  teamName?: string;
  isGroup?: boolean;
  onSetGoalProgressScope?: (scope: 'pi' | 'sprint') => void;
  onNavigate?: (navItem: string) => void;
}

export default function GoalsProgressCompact({
  type,
  piName,
  sprintId,
  teamName,
  isGroup = false,
  onSetGoalProgressScope,
  onNavigate,
}: GoalsProgressCompactProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ((type === 'pi' && !piName) || (type === 'sprint' && !sprintId)) {
      setGoals([]);
      return;
    }

    const fetchGoals = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiService = new ApiService();
        const response =
          type === 'pi'
            ? await apiService.getPIGoals(piName!, teamName, isGroup, false)
            : await apiService.getSprintGoals(sprintId!, teamName, isGroup, false);

        const allGoals: Goal[] = [];
        if (response.data?.overall_goals) {
          allGoals.push(...response.data.overall_goals);
        }
        if (response.data?.group_goals) {
          allGoals.push(...response.data.group_goals);
        }
        if (response.data?.team_goals) {
          response.data.team_goals.forEach((teamGoal: any) => {
            allGoals.push(...teamGoal.goals);
          });
        }

        setGoals(allGoals);
      } catch (err: any) {
        console.error(`Error fetching ${type} goals:`, err);
        setError(err.message || `Failed to fetch ${type} goals`);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [type, piName, sprintId, teamName, isGroup]);

  const getPIGoalCounts = (goal: Goal) => {
    if (!goal.issue_keys || goal.issue_keys.length === 0) {
      return { totalEpics: 0, completedEpics: 0, totalStories: 0, completedStories: 0 };
    }
    const completedEpics = goal.issue_keys.filter(epic => epic.status_category === 'Done').length;
    const totalStories = goal.issue_keys.reduce((sum, epic) => sum + (epic.number_of_children || 0), 0);
    const completedStories = goal.issue_keys.reduce((sum, epic) => sum + (epic.number_of_completed_children || 0), 0);
    return {
      totalEpics: goal.issue_keys.length,
      completedEpics,
      totalStories,
      completedStories,
    };
  };

  const getSprintGoalCounts = (goal: Goal) => {
    if (!goal.issue_keys || goal.issue_keys.length === 0) {
      return { totalIssues: 0, completedIssues: 0 };
    }
    const completedIssues = goal.issue_keys.filter(issue => issue.status_category === 'Done').length;
    return {
      totalIssues: goal.issue_keys.length,
      completedIssues,
    };
  };

  const ProgressBar: React.FC<{
    percent: number;
    completed: number;
    total: number;
    label?: string;
    compact?: boolean;
  }> = ({ percent, completed, total, label, compact = false }) => {
    const safePercent = Math.min(Math.max(percent, 0), 100);
    const formattedPercent = Math.round(safePercent).toString();
    const barHeight = compact ? 'h-2' : 'h-2.5';

    return (
      <div className="flex items-center gap-1 w-full">
        <div className={`flex-1 bg-gray-200 rounded-full ${barHeight} overflow-hidden min-w-[40px]`}>
          {total > 0 ? (
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${safePercent}%` }}
            />
          ) : (
            <div className="h-full bg-gray-300" style={{ width: '100%' }} />
          )}
        </div>
        {label && <span className="text-[10px] text-gray-600 whitespace-nowrap">{label}</span>}
        <span className="text-[10px] font-medium text-gray-900 whitespace-nowrap">
          {total === 0 ? '-' : safePercent > 0 ? `${formattedPercent}%` : ''}
        </span>
      </div>
    );
  };

  const title = type === 'pi' ? piLabel('Goals') : 'Sprint Goals';

  const handleClick = () => {
    if (onSetGoalProgressScope && onNavigate) {
      // Set the scope type first
      onSetGoalProgressScope(type);
      // Then navigate to goal-progress
      onNavigate('goal-progress');
    }
  };

  const isClickable = !!(onSetGoalProgressScope && onNavigate);

  return (
    <div 
      className={`bg-white border border-gray-300 rounded-lg shadow-sm p-3 flex flex-col relative ${isClickable ? 'hover:shadow-md hover:border-blue-400 transition-all' : ''}`}
      style={{ height: '221px', minHeight: '221px' }}
    >
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <h3 
          className={`text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide flex-shrink-0 ${isClickable ? 'cursor-pointer' : ''}`}
          onClick={isClickable ? handleClick : undefined}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={isClickable ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          } : undefined}
          aria-label={isClickable ? `Navigate to ${title}` : undefined}
        >{title}</h3>
      {loading ? (
        <div 
          className={`flex items-center justify-center py-4 flex-1 ${isClickable ? 'cursor-pointer' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div 
          className={`text-xs text-red-600 py-2 flex-1 ${isClickable ? 'cursor-pointer' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >Error loading {title.toLowerCase()}</div>
      ) : goals.length === 0 ? (
        <div 
          className={`text-xs text-gray-500 py-2 flex-1 ${isClickable ? 'cursor-pointer' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >No {title.toLowerCase()} found</div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pointer-events-auto">
          {goals.map((goal) => {
            const goalText = goal.goal_text || '';
            const progressByEpics = goal.goal_progress_by_epics ?? 0;
            const progressByChildren = goal.goal_progress_by_children ?? 0;

            if (type === 'pi') {
              const { totalEpics, completedEpics, totalStories, completedStories } = getPIGoalCounts(goal);
              return (
                <div
                  key={goal.id}
                  className="border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="text-xs font-medium text-gray-900 flex-1 line-clamp-1 pointer-events-auto"
                      title={goalText}
                    >
                      {goalText}
                    </div>
                    <div className="flex-shrink-0 w-24 pointer-events-auto" title={`${totalEpics} epics`}>
                      <ProgressBar
                        percent={progressByEpics}
                        completed={completedEpics}
                        total={totalEpics}
                        label="Epics"
                        compact={true}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"></div>
                    <div className="flex-shrink-0 w-24 pointer-events-auto" title={`${totalStories} stories`}>
                      <ProgressBar
                        percent={progressByChildren}
                        completed={completedStories}
                        total={totalStories}
                        label="Stories"
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              );
            } else {
              const { totalIssues, completedIssues } = getSprintGoalCounts(goal);
              return (
                <div
                  key={goal.id}
                  className="border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors pointer-events-auto"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="text-xs font-medium text-gray-900 flex-1 line-clamp-1 pointer-events-auto"
                      title={goalText}
                    >
                      {goalText}
                    </div>
                    <div className="flex-shrink-0 w-20 pointer-events-auto" title={`${totalIssues} issues`}>
                      <ProgressBar
                        percent={progressByChildren}
                        completed={completedIssues}
                        total={totalIssues}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
      </div>
    </div>
  );
}

