// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  
  endpoints: {
    // Team endpoints
    teams: {
      getNames: '/api/v1/teams/getNames',
    },
    
    // PI endpoints
    pis: {
      getPis: '/api/v1/pis/getPis',
      getPredictability: '/api/v1/pis/predictability',
      getBurndown: '/api/v1/pis/burndown',
      getScopeChanges: '/api/v1/pis/scope-changes',
    },
    
    // Burndown endpoints
    burndown: {
      sprintBurndown: '/api/v1/team-metrics/sprint-burndown',
    },
    
    // AI Cards endpoints
    aiCards: {
      getCards: '/api/v1/team-ai-cards/getCards',
    },
    
    // Recommendations endpoints
    recommendations: {
      getTop: '/api/v1/recommendations/getTeamTop',
    },
    
    // Team Metrics endpoints
    teamMetrics: {
      avgSprintMetrics: '/api/v1/team-metrics/get-avg-sprint-metrics',
      countInProgress: '/api/v1/team-metrics/count-in-progress',
      currentSprintCompletion: '/api/v1/team-metrics/current-sprint-completion',
      closedSprints: '/api/v1/team-metrics/closed-sprints',
      issuesTrend: '/api/v1/team-metrics/issues-trend',
    },
    
    // General Data endpoints
    generalData: {
      agentJobs: '/api/v1/agent-jobs',
      agentJobDetail: '/api/v1/agent-jobs',
      teamAICards: '/api/v1/team-ai-cards',
      teamAICardDetail: '/api/v1/team-ai-cards',
      createTeamJob: '/api/v1/agent-jobs/create-team-job',
      createPiJob: '/api/v1/agent-jobs/create-pi-job',
    },
    
    // Transcript Upload endpoints
    transcripts: {
      uploadTeam: '/api/v1/transcripts/upload-team',
      uploadPI: '/api/v1/transcripts/upload-pi',
    },

    // Settings endpoints
    settings: {
      get: '/api/v1/settings/getAll',
      update: '/api/v1/settings',
      batch: '/api/v1/settings/batch',
    },

    // Users endpoints
  },
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
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
  date: string;
  team_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: string | number;
  description: string;
  full_information: string;
  information_json?: string;
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
  date: string;
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

export interface SprintMetrics {
  velocity: number;
  cycle_time: number;
  predictability: number;
  team_name: string;
  sprint_count: number;
}

export interface CompletionRate {
  completion_rate: number;
  team_name: string;
}

export interface InProgressCount {
  total_in_progress: number;
  count_by_type: {
    Task: number;
    Story: number;
  };
  team_name: string;
}

export interface ClosedSprint {
  sprint_id: number;
  sprint_name: string;
  start_date: string;
  end_date: string;
  sprint_goal: string;
  completion_percentage: number;
  issues_planned: number;
  issues_added: number;
  issues_done: number;
  issues_remaining: number;
  velocity: number;
  predictability: number;
  cycle_time: number;
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
}

export interface ScopeChangesResponse {
  scope_data: ScopeChangesDataPoint[];
  count: number;
  quarters: string[];
}
