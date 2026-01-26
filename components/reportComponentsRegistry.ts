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
import ReleaseBurndownView from './reportViews/ReleaseBurndownView';
import SprintPredictabilityView from './reportViews/SprintPredictabilityView';
import PIMetricsSummaryView from './reportViews/PIMetricsSummaryView';
import CurrentSprintProgressView from './reportViews/CurrentSprintProgressView';
import TeamVelocityView from './reportViews/TeamVelocityView';
import ActiveSprintSummaryView from './reportViews/ActiveSprintSummaryView';
import WIPOverTimeView from './reportViews/WIPOverTimeView';
import CycleTimeView from './reportViews/CycleTimeView';
import GoalProgressView from './reportViews/GoalProgressView';
import PIRoadmapView from './reportViews/PIRoadmapView';
import DeploymentFrequencyCard from './github/DeploymentFrequencyCard';
import ChangeFailureRateCard from './github/ChangeFailureRateCard';
import RecoveryTimeCard from './github/RecoveryTimeCard';
import LeadTimeCard from './github/LeadTimeCard';
import ReworkRateCard from './github/ReworkRateCard';
import PickupTimeCard from './github/PickupTimeCard';
import PRSizeCard from './github/PRSizeCard';
import PRMaturityCard from './github/PRMaturityCard';
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
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => {
      // Handle new response format where result is an object with burndown_data
      if (result && typeof result === 'object' && 'burndown_data' in result && Array.isArray(result.burndown_data)) {
        // Extract sprint_id and sprint_name into meta
        const enhancedMeta = {
          ...meta,
          ...(result.sprint_id && { sprint_id: result.sprint_id }),
          ...(result.sprint_name && { sprint_name: result.sprint_name }),
          ...(result.start_date && { start_date: result.start_date }),
          ...(result.end_date && { end_date: result.end_date }),
        };
        return {
          data: result.burndown_data,
          loading,
          error,
          meta: enhancedMeta,
          filters,
          refresh,
        };
      }
      return {
        data: [],
        loading,
        error,
        meta,
        filters,
        refresh,
      };
    },
  },
  'pi-burndown': {
    component: PIBurndownView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => {
      // Handle new response format where result is an object with burndown_data
      if (result && typeof result === 'object' && 'burndown_data' in result && Array.isArray(result.burndown_data)) {
        // Extract dates from result object if they exist
        const enhancedMeta = {
          ...meta,
          ...(result.start_date && { start_date: result.start_date }),
          ...(result.end_date && { end_date: result.end_date }),
          ...(result.pi_name && { pi: result.pi_name }),
        };
        return {
          data: result.burndown_data,
          loading,
          error,
          meta: enhancedMeta,
          filters,
          refresh,
        };
      }
      return {
        data: [],
        loading,
        error,
        meta,
        filters,
        refresh,
      };
    },
  },
  'release-burndown': {
    component: ReleaseBurndownView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => {
      // Handle response format where result is an object with burndown_data
      if (result && typeof result === 'object' && 'burndown_data' in result && Array.isArray(result.burndown_data)) {
        // Extract dates from result object if they exist
        const enhancedMeta = {
          ...meta,
          ...(result.release_start_date && { release_start_date: result.release_start_date }),
          ...(result.release_end_date && { release_end_date: result.release_end_date }),
          ...(result.release_name && { release: result.release_name }),
        };
        return {
          data: result.burndown_data,
          loading,
          error,
          meta: enhancedMeta,
          filters,
          refresh,
        };
      }
      return {
        data: [],
        loading,
        error,
        meta,
        filters,
        refresh,
      };
    },
  },
  'team-closed-sprints': {
    component: ClosedSprintsView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'team-issues-trend': {
    component: IssuesTrendChartView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh, meta }) => ({
      data: result || {},
      loading,
      error,
      filters,
      refresh,
      meta,
    }),
  },
  'pi-predictability': {
    component: PIPredictabilityView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'epic-scope-changes': {
    component: EpicScopeChangesView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'bugs-by-priority': {
    component: IssuesByPriorityView,
    requiredFilters: ['team_name'],
    mapProps: ({ result, loading, error, filters, refresh, meta }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      filters,
      refresh,
      meta,
    }),
  },
  'flow-status-duration': {
    component: FlowStatusDurationView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: result,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'epics-hierarchy': {
    component: EpicsHierarchyView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-bugs-by-priority': {
    component: IssuesByPriorityView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-bugs-by-team': {
    component: IssuesByTeamView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-flow-status-duration': {
    component: FlowStatusDurationView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-epics-hierarchy': {
    component: EpicsHierarchyView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-epic-dependencies': {
    component: EpicDependenciesView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'issues-release-predictability': {
    component: ReleasePredictabilityView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? (result as any[]) : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'sprint-predictability': {
    component: SprintPredictabilityView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? (result as any[]) : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'pi-metrics-summary': {
    component: PIMetricsSummaryView,
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
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
  'sprint-velocity-advanced': {
    component: TeamVelocityView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'active-sprint-summary': {
    component: ActiveSprintSummaryView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh, meta }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      filters,
      refresh,
      meta,
    }),
  },
  'wip-over-time': {
    component: WIPOverTimeView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'cycle-time-over-time': {
    component: CycleTimeView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: Array.isArray(result) ? result : [],
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'goal-progress': {
    component: GoalProgressView,
    requiredFilters: ['scope_type'],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => {
      // The backend returns { data: {...}, meta: {...} }
      // Handle both cases: result might be the full response or just the data
      let goalsData = null;
      
      if (result) {
        // If result has a 'data' property, extract it (full response format)
        if (result.data && typeof result.data === 'object') {
          goalsData = result.data;
        } 
        // Otherwise, result might already be the data (if report system extracted it)
        else if (result.scope_type || result.overall_goals || result.team_goals || result.group_goals) {
          goalsData = result;
        }
      }
      
      // Wrap in the format expected by transformGoalsToHierarchy
      // which expects { success: boolean, data: {...}, message: string }
      const wrappedData = goalsData ? {
        success: true,
        data: goalsData,
        message: 'Goal progress data retrieved successfully'
      } : null;
      
      return {
        data: wrappedData,
        loading,
        error,
        meta,
        filters,
        refresh,
      };
    },
  },
  'pi-roadmap': {
    component: PIRoadmapView,
    requiredFilters: [],
    mapProps: ({ result, loading, error, meta, filters, refresh }) => ({
      data: (result as any) ?? null,
      loading,
      error,
      meta,
      filters,
      refresh,
    }),
  },
  'dora-deployment-frequency': {
    component: DeploymentFrequencyCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'dora-change-failure-rate': {
    component: ChangeFailureRateCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'dora-recovery-time': {
    component: RecoveryTimeCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'dora-lead-time': {
    component: LeadTimeCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'pr-workflow-rework-rate': {
    component: ReworkRateCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'pr-workflow-pickup-time': {
    component: PickupTimeCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'pr-workflow-pr-size': {
    component: PRSizeCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
  'pr-workflow-pr-maturity': {
    component: PRMaturityCard,
    requiredFilters: [],
    mapProps: ({ result, loading, error, filters, refresh }) => ({
      data: result,
      loading,
      error,
      filters,
      refresh,
    }),
  },
};

