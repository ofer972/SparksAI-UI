// API Configuration
// Get base URL for API calls
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
};

export const API_CONFIG = {
  get baseUrl() {
    return getBaseUrl();
  },
  version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  get jiraUrl() {
    return process.env.NEXT_PUBLIC_JIRA_URL || '';
  },
  
  endpoints: {
    // Team endpoints
    teams: {
      getNames: '/teams/getNames',
    },
    
    // PI endpoints
    pis: {
      getPis: '/pis/getPis',
      getPredictability: '/pis/predictability',
      getBurndown: '/pis/burndown',
      getScopeChanges: '/pis/scope-changes',
      getPIStatusForToday: '/pis/get-pi-status-for-today',
      getTopDependenciesSummary: '/pis/top-dependencies-summary',
      getAverageEpicCycleTime: '/pis/average-epic-cycle-time',
    },
    
    // Burndown endpoints
    burndown: {
      sprintBurndown: '/team-metrics/sprint-burndown',
    },
    
    // Reports endpoints
    reports: {
      list: '/reports',
      detail: '/reports',
    },
    
    // Issues endpoints
    issues: {
      cycleTimeWithIssueKeys: '/issues/cycle-time-with-issues-keys',
    },
    
    // AI Cards endpoints
    aiCards: {
      getCards: '/team-ai-cards/getCards',
    },
    
    // Recommendations endpoints
    recommendations: {
      getTop: '/recommendations/getTeamTop',
    },
    
    // Team Metrics endpoints
    teamMetrics: {
      avgSprintMetrics: '/team-metrics/get-avg-sprint-metrics',
      currentSprintProgress: '/team-metrics/current-sprint-progress',
      closedSprints: '/team-metrics/closed-sprints',
      issuesTrend: '/team-metrics/issues-trend',
    },
    
    // General Data endpoints
    generalData: {
      agentJobs: '/agent-jobs',
      agentJobDetail: '/agent-jobs',
      teamAICards: '/team-ai-cards',
      teamAICardDetail: '/team-ai-cards',
      createTeamJob: '/agent-jobs/create-team-job',
      createPiJob: '/agent-jobs/create-pi-job',
      createPiJobForTeam: '/agent-jobs/create-pi-job-for-team',
    },
    
    // Transcript Upload endpoints
    transcripts: {
      uploadTeam: '/transcripts/upload-team',
      uploadPI: '/transcripts/upload-pi',
    },

    // Settings endpoints
    settings: {
      get: '/llm-settings',
      update: '/settings',
      batch: '/llm-settings',
    },

    // Insight Types endpoints
    insightTypes: {
      get: '/insight-types',
      update: '/insight-types',
      getCategories: '/insight-types/categories',
    },

    // Groups endpoints
    groups: {
      getAll: '/groups',
      create: '/groups',
      update: '/groups',
      delete: '/groups',
      getTeams: '/groups',
    },
    
  },
} as const;

export const getJiraUrl = (): string => {
  return API_CONFIG.jiraUrl || '';
};

export const getCleanJiraUrl = (): string => {
  const jiraUrl = getJiraUrl();
  if (!jiraUrl) return '';
  return jiraUrl.endsWith('/') ? jiraUrl.slice(0, -1) : jiraUrl;
};

/**
 * Build URL for USER SERVICE / USER ENDPOINTS
 * These endpoints are handled by the gateway service at /api/* (NOT /api/v1/*)
 * Use for: /users/*, /roles, /allowlist, /login, /register, /auth/*, /oauth/*
 * 
 * @param endpoint - Resource path (will be prefixed with /api)
 * @returns Full URL: /api/{endpoint}
 * 
 * @example
 * buildUserServiceUrl('/users/verify-admin') → '/api/users/verify-admin'
 * buildUserServiceUrl('/roles') → '/api/roles'
 */
export const buildUserServiceUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;  // /api/users/verify-admin (no /v1)
};

/**
 * Build URL for BACKEND v1 API endpoints
 * Backend endpoints are proxied to backend services at /api/v1/* 
 * All endpoints in API_CONFIG.endpoints.* should use this.
 * Use for: teams, pis, transcripts, agent-jobs, team-ai-cards, settings, etc.
 * 
 * @param endpoint - Resource path (will be prefixed with /api/v1)
 * @returns Full URL: /api/v1/{endpoint}
 * 
 * @example
 * buildBackendUrl('/teams/getNames') → '/api/v1/teams/getNames'
 * buildBackendUrl(API_CONFIG.endpoints.teams.getNames) → '/api/v1/teams/getNames'
 */
export const buildBackendUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.baseUrl;
  const version = API_CONFIG.version;
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build versioned path: /v1/teams/getNames
  const versionedPath = `/${version}${cleanEndpoint}`;
  
  // Gateway mode: Next.js rewrite preserves /api, builds normal path
  // Result: /api/v1/teams/getNames
  return `${baseUrl}${versionedPath}`;
};

// Type definitions for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface User {
  user_id: string | number;
  user_name: string;
  user_type: string;
  // Keep for backward compatibility
  id?: string | number;
  email?: string;
  name?: string;
  username?: string;
  [key: string]: any; // Allow for additional fields from API
}

export interface Team {
  name: string;
}

export interface TeamsResponse {
  teams: string[];
  count: number;
}

export interface PI {
  pi_name: string;
  start_date: string;
  end_date: string;
  planning_grace_days: number;
  prep_grace_days: number;
  updated_at: string;
}

export interface PIsResponse {
  pis: PI[];
  count: number;
}

export interface AICard {
  id: number;
  updated_at: string;
  team_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: string | number;
  description: string;
  full_information: string;
  information_json?: string;
  recommendations?: Recommendation[];
  recommendations_count?: number;
}

export interface AICardsResponse {
  ai_cards: AICard[];
  count: number;
  team_name: string;
  limit: number;
}

export interface Recommendation {
  id: number;
  team_name: string;
  updated_at: string;
  action_text: string;
  rational: string;
  full_information: string;
  priority: string;
  status: string;
  information_json?: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  count: number;
  team_name: string;
  limit: number;
}

export interface TrendDataPoint {
  sprint_id: number;
  sprint_complete_date: string;
  velocity: number;
  cycle_time: number;
  predictability: number;
}

export interface SprintMetrics {
  velocity: number;
  cycle_time: number;
  predictability: number;
  velocity_status?: 'red' | 'yellow' | 'green';
  cycle_time_status?: 'red' | 'yellow' | 'green';
  predictability_status?: 'red' | 'yellow' | 'green';
  team_name: string;
  sprint_count: number;
  group_name?: string;
  teams_in_group?: string[];
  trend_data?: TrendDataPoint[];
}

export interface CompletionRate {
  days_left?: number;
  days_in_sprint?: number;
  total_issues: number;
  completed_issues: number;
  in_progress_issues: number;
  todo_issues: number;
  percent_completed: number;
  percent_completed_status?: 'red' | 'yellow' | 'green';
  in_progress_issues_status?: 'red' | 'yellow' | 'green';
  team_name: string;
}

export interface ClosedSprint {
  sprint_id: number;
  sprint_name: string;
  sprint_official_start_date: string;
  sprint_official_end_date: string;
  avg_story_cycle_time: string | number;
  issues_completed_in_sprint: number;
  total_issues_in_sprint: number;
  issues_not_completed: number;
  completed_issue_keys?: string[];
  total_committed_issue_keys?: string[];
  issues_not_completed_keys?: string[];
  sprint_predictability: string | number;
  sprint_goal?: string;
  team_name?: string;
  closed_sprint_url?: string;
}

export interface ClosedSprintsResponse {
  closed_sprints: ClosedSprint[];
  count: number;
  team_name: string;
  months_looked_back: number;
}

export interface IssuesTrendDataPoint {
  report_month: string;
  team_name: string;
  issue_type: string;
  issues_created: number;
  issues_resolved: number;
  cumulative_open_issues: number;
}

export interface IssuesTrendResponse {
  team_name: string;
  months: number;
  issue_type: string;
  trend_data: IssuesTrendDataPoint[];
  count: number;
}

export interface PIPredictabilityData {
  [key: string]: any; // Dynamic structure based on API response
}

export interface PIPredictabilityResponse {
  data: PIPredictabilityData[];
  count: number;
}

export interface ScopeChangesDataPoint {
  'Quarter Name': string;
  'Stack Group': string;
  'Metric Name': string;
  Value: number;
  [key: string]: any;
}

export interface IssueByPriority {
  priority: string;
  status_category: string;
  issue_count: number;
}

export interface IssuesByTeamPriority {
  priority: string;
  issue_count: number;
}

export interface IssuesByTeam {
  team_name: string;
  priorities: IssuesByTeamPriority[];
  total_issues: number;
}

export interface StatusDuration {
  status_name: string;
  avg_duration_days: number;
}

export interface IssueStatusDurationIssue {
  issue_key: string;
  summary: string | null;
  duration_days: number;
  time_entered?: string | null;
  time_exited?: string | null;
  team_name?: string | null;
  issue_type?: string | null;
}

export interface MonthlyStatusDurationDataset {
  label: string;
  data: number[];
}

export interface SprintPredictabilityItem {
  team_name?: string;
  sprint_name: string;
  sprint_actual_complete_date?: string;
  sprint_predictability?: number;
  avg_story_cycle_time?: number;
  completed_issue_keys?: string[];
  total_committed_issue_keys?: string[];
  issues_not_completed_keys?: string[];
}

export interface ReleasePredictabilityItem {
  version_name?: string;
  project_key?: string;
  release_start_date?: string;
  release_date?: string;
  total_epics_in_scope?: number;
  epics_completed?: number;
  epic_percent_completed?: number;
  total_other_issues_in_scope?: number;
  other_issues_completed?: number;
  other_issues_percent_completed?: number;
}

export interface EpicDependencyItem {
  [key: string]: any;
}

export interface HierarchyItem {
  key: string;
  parent: string | null;
  [key: string]: any;
}

export interface IssueTypesHierarchyResponse {
  success: boolean;
  data: {
    levels: Array<{
      hierarchyLevel: number;
      issue_types: string[];
    }>;
    count: number;
  };
  message: string;
}

export interface PIMetricsSummaryData {
  pi_name?: string;
  progress_delta_pct?: number;
  progress_delta_pct_status?: 'red' | 'yellow' | 'green' | 'gray';
  total_issues?: number;
  remaining_epics?: number;
  ideal_remaining?: number;
  [key: string]: any;
}

export interface PIStatusForTodayItem {
  pi_name?: string;
  pi_start_date?: string;
  pi_end_date?: string;
  latest_snapshot_date?: string;
  planned_epics?: number;
  added_epics?: number;
  removed_epics?: number;
  closed_epics?: number;
  remaining_epics?: number;
  ideal_remaining?: number;
  total_issues?: number;
  progress_delta_pct: number;
  progress_delta_pct_status: 'red' | 'yellow' | 'green';
  in_progress_percentage?: number;
  count_in_progress_status?: 'red' | 'yellow' | 'green';
  [key: string]: any; // Allow other fields in response
}

export interface PIStatusForTodayResponse {
  data: PIStatusForTodayItem[];
  count: number;
  message: string;
}

export interface ScopeChangesResponse {
  scope_data: ScopeChangesDataPoint[];
  count: number;
  quarters: string[];
}

export interface ReportDefinition {
  report_id: string;
  report_name: string;
  chart_type: string;
  data_source: string;
  description: string;
  default_filters: Record<string, any>;
  meta_schema: {
    required_filters: string[];
    optional_filters: string[];
    parameters: Record<string, { type: string; description: string; items?: { type: string } }>;
    allowed_views?: string[];
  };
}

export interface ReportInstancePayload<T = any> {
  definition: ReportDefinition;
  filters: Record<string, any>;
  result: T;
  meta: Record<string, any>;
}

export interface LayoutRow {
  id: string;
  reportIds: string[];
}

export interface LayoutConfig {
  rows: LayoutRow[];
}

export interface DashboardViewConfig {
  view: string;
  reportIds: string[];
  layout_config?: LayoutConfig;
}

export interface InsightType {
  id: number;
  name?: string; // Display name for the insight type
  insight_type: string;
  insight_description: string;
  description?: string; // Alias for insight_description
  insight_category?: string; // Legacy field, may not be present
  insight_categories?: string[]; // Array of category names this insight type uses
  categories?: string[]; // Alias for insight_categories for backward compatibility
  requirePI?: boolean; // Whether this insight requires a PI
  require_pi?: boolean; // Snake case variant
  requires_pi?: boolean; // Alternative snake case variant
  requireTeam?: boolean; // Whether this insight requires a Team
  require_team?: boolean; // Snake case variant
  requires_team?: boolean; // Alternative snake case variant
  requireGroup?: boolean; // Whether this insight requires a Group
  require_group?: boolean; // Snake case variant
  requires_group?: boolean; // Alternative snake case variant
  requireSprint?: boolean; // Whether this insight is a Sprint insight
  sprint_insight?: boolean; // Snake case variant from API
  active: boolean;
  is_active?: boolean; // Alternative field name
  cron_config?: {
    day_of_week?: string;
    hour?: number;
    minute?: number;
  } | null;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow for additional fields from API
}

export interface InsightTypesResponse {
  insight_types: InsightType[];
  count: number;
}

export interface CreateJobResponse {
  success: boolean;
  data?: any;
  message: string;
}

export interface InsightCategoriesResponse {
  categories: string[];
  count: number;
}

export interface Group {
  group_key: number;
  group_name: string;
  parent_group_key: number | null;
  ai_insight?: boolean;
}

export interface Team {
  team_key: number;
  team_name: string;
  number_of_team_members: number;
  group_keys: number[];  // Changed from group_key to group_keys (array)
  group_names?: string[];  // Changed from group_name to group_names (array)
  ai_insight?: boolean;
}

export interface TopInboundDependency {
  assignee_team: string;
  volume_of_work_relied_upon: number;
  completed_issues_dependent_count: number;
  uncompleted_issues: number;
}

export interface TopOutboundDependency {
  owned_team: string;
  number_of_epics_owned: number;
  number_of_dependent_issues: number;
  completed_dependent_issues_count: number;
  uncompleted_issues: number;
}

export interface TopDependenciesSummaryResponse {
  success: boolean;
  data: {
    top_inbound_dependencies: TopInboundDependency[];
    top_outbound_dependencies: TopOutboundDependency[];
    pi: string;
    count: {
      inbound: number;
      outbound: number;
    };
  };
  message: string;
}

export interface AverageEpicCycleTimeResponse {
  success: boolean;
  data: {
    average_epic_cycle_time: number;
    average_epic_cycle_time_status: 'red' | 'yellow' | 'green';
    months: number;
    epic_count: number;
    team_name: string | null;
  };
  message: string;
}

export interface ActiveSprintSummaryItem {
  sprint_id: number;
  sprint_name: string;
  team_name: string;
  start_date: string;
  end_date: string;
  // Can be null when backend cannot calculate progress yet
  overall_progress_pct: number | null;
  // Controls the color of overall_progress_pct (red, yellow, green or null)
  overall_progress_pct_color: 'green' | 'yellow' | 'red' | null;
  issues_at_start: number;
  issues_at_start_keys: string[];
  issues_added: number;
  issues_added_keys: string[];
  // Optional color for issues_added column
  issues_added_color?: 'red' | 'yellow' | 'default';
  // New total issue counts for status categories
  total_issues_to_do: number;
  total_issues_in_progress: number;
  total_issues_done: number;
  // Keys for issues that were done in the sprint
  issues_done_keys: string[];
  flagged_issues: number;
  // Backend may return null when there are no flagged issues
  flagged_issues_keys: string[] | null;
  issues_remaining: number;
  issues_remaining_keys: string[];
  sprint_goal: string;
  active_sprint_url?: string;
  [key: string]: any; // Allow for additional fields
}

// WIP Over Time types
export interface WIPOverTimeDataPoint {
  snapshot_day: string;
  issuetype: string;
  work_in_progress: number;
  [key: string]: string | number; // Index signature for TimeSeriesDataPoint compatibility
}

// Cycle Time types
export interface CycleTimeDataPoint {
  snapshot_day: string;
  issuetype: string;
  avg_cycle_time: number;
  issue_count: number;
  [key: string]: string | number; // Index signature for TimeSeriesDataPoint compatibility
}

// Cycle Time Issues types
export interface CycleTimeIssue {
  issue_key: string;
  summary: string;
  cycle_time: number;
  resolved_at: string;
  issue_type: string;
  team_name: string;
}

export interface CycleTimeIssuesResponse {
  success: boolean;
  data: {
    issues: CycleTimeIssue[];
  };
  message?: string;
}
