'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CustomDashboard, AICard } from '@/lib/config';
import type { NavItemId } from '@/lib/nav';
import TeamMetrics from '@/components/TeamMetrics';
import PIMetrics from '@/components/PIMetrics';
import ReportRenderer from '@/components/ReportRenderer';
import SprintInsightsPreview from './SprintInsightsPreview';
import PIInsightsPreview from './PIInsightsPreview';
import { ApiService } from '@/lib/api';
import { useUserGoals } from '@/hooks/useUserGoals';
import { useUserSprintGoals } from '@/hooks/useUserSprintGoals';
import type { HierarchyItem } from '@/lib/config';

export type HomeDetail = {
  id: string;
  title: string;
  description?: string;
  kind?: 'metric' | 'insight' | 'goal' | 'shortcut';
};

export default function HomeDashboard({
  onOpenDetail,
  onOpenInsight,
  onNavigate,
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
  customDashboards,
}: {
  onOpenDetail: (detail: HomeDetail) => void;
  onOpenInsight: (card: AICard) => void;
  onNavigate: (navItem: NavItemId | string) => void;
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
  customDashboards?: CustomDashboard[];
}) {
 const hasDefaultContext = !!defaultTeamOrGroupName && (defaultTreeType === 'team' || defaultTreeType === 'group');
 const isGroup = defaultTreeType === 'group';
 const contextLabel = defaultTeamOrGroupName || '';

 // Sprint selection for Sprint Goals panel (current or upcoming sprint)
 const [homeSprintId, setHomeSprintId] = useState<number | null>(null);
 const [homeSprintName, setHomeSprintName] = useState<string>('');
 const [homeSprintsLoading, setHomeSprintsLoading] = useState(false);
 const [homeSprintsError, setHomeSprintsError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 const api = new ApiService();

 const fetchSprints = async () => {
 if (!hasDefaultContext) {
 setHomeSprintId(null);
 setHomeSprintName('');
 setHomeSprintsError(null);
 return;
 }

 try {
 setHomeSprintsLoading(true);
 setHomeSprintsError(null);

 const response = await api.getAvailableSprints(contextLabel, isGroup);
 const sprints: Array<{
 sprint_id: number;
 sprint_name: string;
 start_date: string | null;
 end_date: string | null;
 }> = response?.data?.sprints || [];

 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const filtered = sprints
 .filter((s) => {
 if (!s.start_date || !s.end_date) return false;
 const startDate = new Date(s.start_date);
 startDate.setHours(0, 0, 0, 0);
 const endDate = new Date(s.end_date);
 endDate.setHours(0, 0, 0, 0);

 const isCurrent = startDate <= today && today <= endDate;
 const fourteenDaysBeforeStart = new Date(startDate);
 fourteenDaysBeforeStart.setDate(fourteenDaysBeforeStart.getDate() - 14);
 const isUpcoming = today >= fourteenDaysBeforeStart && today < startDate;

 return isCurrent || isUpcoming;
 })
 .sort((a, b) => {
 if (!a.start_date || !b.start_date) return 0;
 return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
 });

 const selected = filtered[0];
 if (cancelled) return;

 if (selected) {
 setHomeSprintId(selected.sprint_id);
 setHomeSprintName(selected.sprint_name);
 } else {
 setHomeSprintId(null);
 setHomeSprintName('');
 }
 } catch (err) {
 if (cancelled) return;
 console.warn('[Home] Failed to fetch available sprints:', err);
 setHomeSprintsError(err instanceof Error ? err.message : 'Failed to fetch sprints');
 setHomeSprintId(null);
 setHomeSprintName('');
 } finally {
 if (!cancelled) setHomeSprintsLoading(false);
 }
 };

 fetchSprints();

 return () => {
 cancelled = true;
 };
 }, [contextLabel, hasDefaultContext, isGroup]);

 const {
 hierarchyData: piGoalsHierarchy,
 loading: piGoalsLoading,
 error: piGoalsError,
 } = useUserGoals(
 currentPIName || undefined,
 hasDefaultContext ? contextLabel : undefined,
 isGroup,
 hasDefaultContext && !!currentPIName
 );

 const {
 hierarchyData: sprintGoalsHierarchy,
 loading: sprintGoalsLoading,
 error: sprintGoalsError,
 } = useUserSprintGoals(
 homeSprintId || undefined,
 hasDefaultContext ? contextLabel : undefined,
 isGroup,
 hasDefaultContext && !!homeSprintId
 );

 const getGoalRows = (items: HierarchyItem[]) =>
 items.filter((i: any) => typeof i?._goalId === 'number') as Array<HierarchyItem & { _goalId: number }>;

 const piGoalRows = useMemo(() => getGoalRows(piGoalsHierarchy), [piGoalsHierarchy]);
 const sprintGoalRows = useMemo(() => getGoalRows(sprintGoalsHierarchy), [sprintGoalsHierarchy]);

 return (
 <div className="min-h-full">
 <div className="grid grid-cols-12 gap-3">
 {/* Main column */}
 <div className="col-span-12">
 {/* Header */}
 <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden">
 <div className="p-4 bg-gradient-to-r from-surface to-surface-elevated border-b border-outline">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="text-sm font-semibold text-content-primary truncate">Overview</div>
 <div className="text-xs text-content-tertiary">
 Your at-a-glance board for metrics, insights, and dashboards.
 </div>
 </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasDefaultContext ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isGroup ? 'Group' : 'Team'}: {contextLabel}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('user-settings')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors"
              >
                Set default team/group
              </button>
            )}
            {currentPIName ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/40 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Current PI: {currentPIName}
              </span>
            ) : null}
          </div>
 </div>
 </div>

        {!hasDefaultContext ? (
          <div className="p-4">
            <div className="rounded-2xl border border-outline bg-gradient-to-r from-surface-elevated to-brand/10 p-4">
              <div className="text-sm font-semibold text-content-primary">Welcome</div>
              <div className="mt-1 text-sm text-content-secondary">
                To personalize this Home screen, set your default team/group in <button type="button" className="text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium" onClick={() => onNavigate('user-settings')}>Settings</button>.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Insights Row - Sprint and PI side by side */}
      <div className="mt-3 grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated flex-shrink-0">
              <div className="text-base font-semibold text-content-primary">Sprint</div>
            </div>
            <div className="p-3 flex-1 flex flex-col min-h-0">
              <SprintInsightsPreview
                teamOrGroupName={hasDefaultContext ? contextLabel : undefined}
                isGroup={isGroup}
                onOpenAll={() => onNavigate('team-ai-insights')}
                onOpenCard={(card) => onOpenInsight(card)}
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated flex-shrink-0">
              <div className="text-base font-semibold text-content-primary">PI</div>
            </div>
            <div className="p-3 flex-1 flex flex-col min-h-0">
              <PIInsightsPreview
                piName={currentPIName || undefined}
                teamOrGroupName={hasDefaultContext ? contextLabel : undefined}
                isGroup={isGroup}
                onOpenAll={() => onNavigate('team-ai-insights')}
                onOpenCard={(card) => onOpenInsight(card)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row - Sprint and PI side by side */}
      <div className="mt-3 grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-content-primary">Sprint metrics</div>
                  <div className="text-xs text-content-tertiary">From Team Metrics</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('team-dashboard')}
                  className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium"
                >
                  Open
                </button>
              </div>
            </div>
            <div className="p-3 flex-1" style={{ zoom: 0.92 }}>
              {hasDefaultContext ? (
                <TeamMetrics teamName={contextLabel} isGroup={isGroup} singleRowLayout={true} />
              ) : (
                <div className="text-sm text-content-tertiary p-3">Set a default team/group to view sprint metrics.</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-content-primary">PI metrics</div>
                  <div className="text-xs text-content-tertiary">From PI Metrics</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('pi-dashboard')}
                  className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium"
                >
                  Open
                </button>
              </div>
            </div>
            <div className="p-3 flex-1" style={{ zoom: 0.92 }}>
              {hasDefaultContext && currentPIName ? (
                <PIMetrics
                  piName={currentPIName}
                  teamName={contextLabel}
                  isGroup={isGroup}
                  singleRowLayout={true}
                />
              ) : (
                <div className="text-sm text-content-tertiary p-3">
                  {hasDefaultContext ? 'Loading current PI…' : 'Set a default team/group to view PI metrics.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goals Row - Sprint and PI side by side */}
      <div className="mt-3 grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-content-primary">Sprint Goals</div>
                  <div className="text-xs text-content-tertiary truncate">
                    {homeSprintName ? homeSprintName : homeSprintsLoading ? 'Loading sprint…' : 'Current / upcoming sprint'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('sprint-goals')}
                  className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium whitespace-nowrap"
                >
                  {sprintGoalRows.length > 0 ? 'Manage' : 'Define'}
                </button>
              </div>
            </div>
            <div className="p-4 flex-1">
              {!hasDefaultContext ? (
                <div className="text-sm text-content-tertiary">
                  Set your default team/group to view and manage sprint goals.
                </div>
              ) : homeSprintsError ? (
                <div className="text-sm text-danger-text">Failed to load sprints: {homeSprintsError}</div>
              ) : homeSprintsLoading ? (
                <div className="flex items-center gap-3 text-sm text-content-tertiary">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  Loading sprint goals…
                </div>
              ) : sprintGoalsError ? (
                <div className="text-sm text-danger-text">Failed to load sprint goals: {sprintGoalsError}</div>
              ) : sprintGoalsLoading ? (
                <div className="flex items-center gap-3 text-sm text-content-tertiary">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  Loading sprint goals…
                </div>
              ) : sprintGoalRows.length === 0 ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3">
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-300">Don't forget to define your sprint goals</div>
                  <div className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                    Sprint goals help your team align on outcomes and track progress.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('sprint-goals')}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-900 dark:bg-amber-700 text-white text-sm hover:bg-amber-800 dark:hover:bg-amber-600 transition-colors"
                  >
                    Define Sprint Goals
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-content-muted">{sprintGoalRows.length} goal(s) defined</div>
                  </div>
                  {sprintGoalRows.slice(0, 3).map((g: any) => {
                    const progress = g['Progress'] || g['Progress%'] || g['Progress (%)'] || 0;
                    const progressNum = typeof progress === 'number' ? progress : parseFloat(progress) || 0;
                    const progressInt = Math.floor(progressNum);
                    
                    return (
                      <div key={g.key} className="rounded-xl border border-outline bg-surface-elevated/50 p-3">
                        <div className="text-sm font-semibold text-content-primary line-clamp-2 mb-2">
                          {g['Section / Goal / Issues'] || 'Goal'}
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 bg-surface-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand dark:bg-blue-400 transition-all duration-300"
                              style={{ width: `${Math.min(progressInt, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-content-tertiary font-medium min-w-[32px] text-right">
                            {progressInt}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {sprintGoalRows.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('sprint-goals')}
                      className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium"
                    >
                      View all goals →
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-content-primary">PI Goals</div>
                  <div className="text-xs text-content-tertiary truncate">
                    {currentPIName ? `Current PI: ${currentPIName}` : 'Loading current PI…'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('pi-goals')}
                  className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium whitespace-nowrap"
                >
                  {piGoalRows.length > 0 ? 'Manage' : 'Define'}
                </button>
              </div>
            </div>
            <div className="p-4 flex-1">
              {!hasDefaultContext ? (
                <div className="text-sm text-content-tertiary">
                  Set your default team/group to view and manage PI goals.
                </div>
              ) : !currentPIName ? (
                <div className="flex items-center gap-3 text-sm text-content-tertiary">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  Loading PI goals…
                </div>
              ) : piGoalsError ? (
                <div className="text-sm text-danger-text">Failed to load PI goals: {piGoalsError}</div>
              ) : piGoalsLoading ? (
                <div className="flex items-center gap-3 text-sm text-content-tertiary">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  Loading PI goals…
                </div>
              ) : piGoalRows.length === 0 ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-3">
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-300">Don't forget to define your PI goals</div>
                  <div className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                    PI goals connect execution to outcomes and improve predictability.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('pi-goals')}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-900 dark:bg-amber-700 text-white text-sm hover:bg-amber-800 dark:hover:bg-amber-600 transition-colors"
                  >
                    Define PI Goals
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-content-muted">{piGoalRows.length} goal(s) defined</div>
                  </div>
                  {piGoalRows.slice(0, 3).map((g: any) => {
                    const progress = g['Progress'] || g['Progress%'] || g['Progress (%)'] || 0;
                    const progressNum = typeof progress === 'number' ? progress : parseFloat(progress) || 0;
                    const progressInt = Math.floor(progressNum);
                    
                    return (
                      <div key={g.key} className="rounded-xl border border-outline bg-surface-elevated/50 p-3">
                        <div className="text-sm font-semibold text-content-primary line-clamp-2 mb-2">
                          {g['Section / Goal / Issues'] || 'Goal'}
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 bg-surface-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand dark:bg-blue-400 transition-all duration-300"
                              style={{ width: `${Math.min(progressInt, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-content-tertiary font-medium min-w-[32px] text-right">
                            {progressInt}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {piGoalRows.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('pi-goals')}
                      className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium"
                    >
                      View all goals →
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

 {/* Key report preview */}
 <div className="mt-3">
 <div className="bg-surface border border-outline rounded-2xl shadow-sm overflow-hidden">
 <div className="px-4 py-3 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <div className="text-sm font-semibold text-content-primary">Key report</div>
 <div className="text-xs text-content-tertiary">A live report preview from your Team Dashboard</div>
 </div>
 <button
 type="button"
 onClick={() => onNavigate('team-dashboard')}
 className="text-sm text-brand text-indigo-400 hover:text-indigo-700 hover:text-indigo-300 font-medium whitespace-nowrap"
 >
 Open all reports
 </button>
 </div>
 </div>
 <div className="p-2">
 {hasDefaultContext ? (
 <div className="h-[420px] overflow-hidden">
 <ReportRenderer
 reportId="team-issues-trend"
 filters={{
 team_name: contextLabel,
 isGroup: isGroup,
 issue_type: 'Bug',
 months: 6,
 }}
 enabled
 />
 </div>
 ) : (
 <div className="p-4 text-sm text-content-tertiary">Set a default team/group to see report previews.</div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

