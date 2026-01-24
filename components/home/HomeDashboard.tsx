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
        {/* Compact Header with context badges */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-surface to-surface-elevated flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-semibold text-content-primary">Home</span>
                <span className="ml-2 text-xs text-content-tertiary hidden sm:inline">Your at-a-glance board for metrics, insights, and dashboards.</span>
              </div>
              {hasDefaultContext ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {isGroup ? 'Group' : 'Team'}: {contextLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('user-settings')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/40 text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                >
                  Set team/group
                </button>
              )}
              {currentPIName && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/40 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                  PI: {currentPIName}
                </span>
              )}
            </div>
          </div>

          {!hasDefaultContext && (
            <div className="px-3 py-2 border-t border-outline bg-gradient-to-r from-surface-elevated to-brand/5">
              <div className="text-xs text-content-secondary">
                <button type="button" className="text-brand hover:text-brand-hover font-medium" onClick={() => onNavigate('user-settings')}>Set your default team/group</button> to personalize this view.
              </div>
            </div>
          )}
        </div>

      {/* Insights Row */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sprint Insights Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-950/50 dark:to-sky-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Sprint Insights</span>
                <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 hidden sm:inline">· Sprint Events & Status</span>
              </div>
              <button type="button" onClick={() => onNavigate('team-ai-insights')} className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 font-medium">
                View All →
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[160px]">
            <SprintInsightsPreview
              teamOrGroupName={hasDefaultContext ? contextLabel : undefined}
              isGroup={isGroup}
              onOpenAll={() => onNavigate('team-ai-insights')}
              onOpenCard={(card) => onOpenInsight(card)}
            />
          </div>
        </div>

        {/* PI Insights Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">PI Insights</span>
                <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70 hidden sm:inline">· PI Events & Status {currentPIName ? `· ${currentPIName}` : ''}</span>
              </div>
              <button type="button" onClick={() => onNavigate('team-ai-insights')} className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium">
                View All →
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[160px]">
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

      {/* Metrics Row */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sprint Metrics Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-950/50 dark:to-sky-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Sprint Metrics</span>
                <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 hidden sm:inline">· From Team Dashboard</span>
              </div>
              <button type="button" onClick={() => onNavigate('team-dashboard')} className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 font-medium">
                Open →
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[100px]" style={{ zoom: 0.9 }}>
            {hasDefaultContext ? (
              <TeamMetrics teamName={contextLabel} isGroup={isGroup} singleRowLayout={true} />
            ) : (
              <div className="text-xs text-content-tertiary">Set a default team/group to view metrics.</div>
            )}
          </div>
        </div>

        {/* PI Metrics Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">PI Metrics</span>
                <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70 hidden sm:inline">· From PI Dashboard {currentPIName ? `· ${currentPIName}` : ''}</span>
              </div>
              <button type="button" onClick={() => onNavigate('pi-dashboard')} className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium">
                Open →
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[100px]" style={{ zoom: 0.9 }}>
            {hasDefaultContext && currentPIName ? (
              <PIMetrics piName={currentPIName} teamName={contextLabel} isGroup={isGroup} singleRowLayout={true} />
            ) : (
              <div className="text-xs text-content-tertiary">
                {hasDefaultContext ? 'Loading PI…' : 'Set a default team/group to view metrics.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Goals Row */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sprint Goals Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-950/50 dark:to-sky-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Sprint Goals</span>
                <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 hidden sm:inline">· {homeSprintName || 'Current / upcoming sprint'}</span>
              </div>
              <button type="button" onClick={() => onNavigate('sprint-goals')} className="text-[10px] text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 font-medium">
                {sprintGoalRows.length > 0 ? 'Manage →' : 'Define →'}
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[160px]">
            {!hasDefaultContext ? (
              <div className="text-xs text-content-tertiary">Set your default team/group to view goals.</div>
            ) : homeSprintsError ? (
              <div className="text-xs text-danger-text">Failed to load: {homeSprintsError}</div>
            ) : homeSprintsLoading || sprintGoalsLoading ? (
              <div className="flex items-center gap-2 text-xs text-content-tertiary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
                Loading…
              </div>
            ) : sprintGoalRows.length === 0 ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-2">
                <div className="text-xs font-medium text-amber-900 dark:text-amber-300">No sprint goals defined</div>
                <button type="button" onClick={() => onNavigate('sprint-goals')} className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium hover:underline">
                  Define Goals →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sprintGoalRows.slice(0, 3).map((g: any) => {
                  const progress = g['Progress'] || g['Progress%'] || g['Progress (%)'] || 0;
                  const progressNum = typeof progress === 'number' ? progress : parseFloat(progress) || 0;
                  const progressInt = Math.floor(progressNum);
                  return (
                    <div key={g.key} className="rounded-lg border border-outline bg-surface-elevated/50 p-2">
                      <div className="text-xs font-medium text-content-primary line-clamp-1 mb-1">{g['Section / Goal / Issues'] || 'Goal'}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${Math.min(progressInt, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-content-tertiary font-medium">{progressInt}%</span>
                      </div>
                    </div>
                  );
                })}
                {sprintGoalRows.length > 3 && (
                  <button type="button" onClick={() => onNavigate('sprint-goals')} className="text-[10px] text-brand hover:text-brand-hover font-medium">
                    +{sprintGoalRows.length - 3} more →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PI Goals Panel */}
        <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">PI Goals</span>
                <span className="text-[10px] text-violet-600/70 dark:text-violet-400/70 hidden sm:inline">· {currentPIName || 'Current PI'}</span>
              </div>
              <button type="button" onClick={() => onNavigate('pi-goals')} className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium">
                {piGoalRows.length > 0 ? 'Manage →' : 'Define →'}
              </button>
            </div>
          </div>
          <div className="p-3 min-h-[160px]">
            {!hasDefaultContext ? (
              <div className="text-xs text-content-tertiary">Set your default team/group to view goals.</div>
            ) : !currentPIName ? (
              <div className="flex items-center gap-2 text-xs text-content-tertiary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
                Loading…
              </div>
            ) : piGoalsError ? (
              <div className="text-xs text-danger-text">Failed to load: {piGoalsError}</div>
            ) : piGoalsLoading ? (
              <div className="flex items-center gap-2 text-xs text-content-tertiary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
                Loading…
              </div>
            ) : piGoalRows.length === 0 ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-2">
                <div className="text-xs font-medium text-amber-900 dark:text-amber-300">No PI goals defined</div>
                <button type="button" onClick={() => onNavigate('pi-goals')} className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium hover:underline">
                  Define Goals →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {piGoalRows.slice(0, 3).map((g: any) => {
                  const progress = g['Progress'] || g['Progress%'] || g['Progress (%)'] || 0;
                  const progressNum = typeof progress === 'number' ? progress : parseFloat(progress) || 0;
                  const progressInt = Math.floor(progressNum);
                  return (
                    <div key={g.key} className="rounded-lg border border-outline bg-surface-elevated/50 p-2">
                      <div className="text-xs font-medium text-content-primary line-clamp-1 mb-1">{g['Section / Goal / Issues'] || 'Goal'}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${Math.min(progressInt, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-content-tertiary font-medium">{progressInt}%</span>
                      </div>
                    </div>
                  );
                })}
                {piGoalRows.length > 3 && (
                  <button type="button" onClick={() => onNavigate('pi-goals')} className="text-[10px] text-brand hover:text-brand-hover font-medium">
                    +{piGoalRows.length - 3} more →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

 {/* Key Reports preview */}
 <div className="mt-3">
 <div className="bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
 <div className="px-3 py-2 border-b border-outline bg-gradient-to-r from-surface to-surface-elevated">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">Key Reports</span>
 <button
 type="button"
 onClick={() => onNavigate('team-dashboard')}
 className="text-xs text-brand hover:text-brand-hover font-medium"
 >
 Open all reports →
 </button>
 </div>
 </div>
 <div className="p-2">
 {hasDefaultContext ? (
 <div className="h-[380px] overflow-hidden">
 <ReportRenderer
 reportId="team-issues-trend"
 filters={{
 team_name: contextLabel,
 isGroup: isGroup,
 issue_type: 'Bug',
 months: 6,
 }}
 enabled
 componentProps={{ componentProps: { hideHeader: true } }}
 />
 </div>
 ) : (
 <div className="p-3 text-xs text-content-tertiary">Set a default team/group to see report previews.</div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

