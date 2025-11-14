import ClosedSprintsView from './reportViews/ClosedSprintsView';
import IssuesTrendChartView from './reportViews/IssuesTrendChartView';
import PIPredictabilityView from './reportViews/PIPredictabilityView';
import EpicScopeChangesView from './reportViews/EpicScopeChangesView';
import SprintBurndownView from './reportViews/SprintBurndownView';
import PIBurndownView from './reportViews/PIBurndownView';
import IssuesByPriorityView from './reportViews/IssuesByPriorityView';
import IssuesByTeamView from './reportViews/IssuesByTeamView';
import FlowStatusDurationView from './reportViews/FlowStatusDurationView';
import EpicsHierarchyView from './reportViews/EpicsHierarchyView';
import EpicDependenciesView from './reportViews/EpicDependenciesView';
import ReleasePredictabilityView from './reportViews/ReleasePredictabilityView';
import SprintPredictabilityView from './reportViews/SprintPredictabilityView';
import PIMetricsSummaryView from './reportViews/PIMetricsSummaryView';
import CurrentSprintProgressView from './reportViews/CurrentSprintProgressView';
import type { ReportDefinition } from '@/lib/config';

export interface ReportRenderContext {
  loading: boolean;
  error: string | null;
  result: any;
  meta: Record<string, any> | null;
  definition: ReportDefinition | null;
  filters: Record<string, any>;
  missingFilters: string[];
  requiredFilters: string[];
  refresh: () => void;
}

export type ReportFilters = Record<string, any>;

export type ReportFiltersUpdater =
  | ReportFilters
  | ((prev: ReportFilters) => ReportFilters);

export interface ReportComponentConfig {
  component: React.ComponentType<any>;
  requiredFilters?: string[];
  mapProps?: (context: ReportRenderContext) => Record<string, any>;
}

export type ReportComponentRegistry = Record<string, ReportComponentConfig>;

export const DEFAULT_REPORT_COMPONENT_REGISTRY: ReportComponentRegistry = {
  'team-sprint-burndown': {
    component: SprintBurndownView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error, meta }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
    }),
  },
  'pi-burndown': {
    component: PIBurndownView,
    requiredFilters: ['pi'],
    mapProps: ({ result, loading, error, meta }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
    }),
  },
  'team-closed-sprints': {
    component: ClosedSprintsView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'team-issues-trend': {
    component: IssuesTrendChartView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'pi-predictability': {
    component: PIPredictabilityView,
    requiredFilters: ['pi_names'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'epic-scope-changes': {
    component: EpicScopeChangesView,
    requiredFilters: ['quarters'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'bugs-by-priority': {
    component: IssuesByPriorityView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'flow-status-duration': {
    component: FlowStatusDurationView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'epics-hierarchy': {
    component: EpicsHierarchyView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
    }),
  },
  'issues-bugs-by-priority': {
    component: IssuesByPriorityView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
    }),
  },
  'issues-bugs-by-team': {
    component: IssuesByTeamView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
    }),
  },
  'issues-flow-status-duration': {
    component: FlowStatusDurationView,
    mapProps: ({ result, loading, error }) => ({
      data: (result as any) ?? null,
      loading,
      error,
    }),
  },
  'issues-epics-hierarchy': {
    component: EpicsHierarchyView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
    }),
  },
  'issues-epic-dependencies': {
    component: EpicDependenciesView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
    }),
  },
  'issues-release-predictability': {
    component: ReleasePredictabilityView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: Array.isArray(result) ? (result as any[]) : [],
      loading,
      error,
      meta,
    }),
  },
  'sprint-predictability': {
    component: SprintPredictabilityView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: Array.isArray(result) ? (result as any[]) : [],
      loading,
      error,
      meta,
    }),
  },
  'pi-metrics-summary': {
    component: PIMetricsSummaryView,
    mapProps: ({ result, loading, error, meta }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
    }),
  },
  'team-current-sprint-progress': {
    component: CurrentSprintProgressView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
};

