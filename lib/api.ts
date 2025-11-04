import { 
  API_CONFIG, 
  buildBackendUrl,
  buildUserServiceUrl,
  ApiResponse,
  User,
  TeamsResponse,
  PIsResponse,
  AICardsResponse,
  RecommendationsResponse,
  SprintMetrics,
  CompletionRate,
  ClosedSprintsResponse,
  IssuesTrendResponse,
  IssuesTrendDataPoint,
  PIPredictabilityResponse,
  PIPredictabilityData,
  ScopeChangesResponse,
  ScopeChangesDataPoint,
  InsightTypesResponse,
  InsightType,
  InsightCategoriesResponse
} from './config';
import { getAuthHeaders, refreshAccessToken, clearTokens } from './auth';

// Re-export types for convenience
export type { IssuesTrendDataPoint, IssuesTrendResponse, PIPredictabilityResponse, PIPredictabilityData, ScopeChangesResponse, ScopeChangesDataPoint };

// Lightweight authorized fetch wrapper to add Authorization when available
const nativeFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return (globalThis as any).fetch(input as any, init as any);
};

// Shared refresh promise to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Detect localhost and bypass settings
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const bypassAuth = isLocalhost && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  
  const doFetch = async () => {
    const headers = bypassAuth 
      ? (init?.headers || {}) 
      : getAuthHeaders(init?.headers as HeadersInit);
    return nativeFetch(input, { ...(init || {}), headers });
  };
  
  let res = await doFetch();
  
  // Skip token refresh logic if bypassing auth
  if (bypassAuth) {
    return res;
  }
  
  // Handle both 401 and 403 - expired tokens might come as either
  if (res.status === 401 || res.status === 403) {
    // Use shared refresh promise so concurrent requests wait for the same refresh
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const refreshed = await refreshPromise;
    
    // Clear the promise after use (success or failure)
    refreshPromise = null;
    
    if (refreshed) {
      // Retry the original request with new token
      res = await doFetch();
      // If successful, return it
      if (res.status !== 401 && res.status !== 403) {
        return res;
      }
      // If still 401/403 after refresh:
      // - 401: Token still invalid, redirect to login
      // - 403: Might be a real permission issue, return to caller
      if (res.status === 401) {
        clearTokens();
        if (typeof window !== 'undefined') {
          try { window.location.assign('/login'); } catch {}
        }
      }
    } else {
      // Refresh failed - clear tokens and redirect
      clearTokens();
      if (typeof window !== 'undefined') {
        try { window.location.assign('/login'); } catch {}
      }
    }
  }
  return res;
}

// Shadow global fetch within this module so all below calls include auth automatically
const fetch = (input: RequestInfo | URL, init?: RequestInit) => authFetch(input, init);

export interface BurndownDataPoint {
  snapshot_date: string;
  pi_name?: string; // For PI burndown
  start_date: string;
  end_date: string;
  remaining_issues: number | null;
  ideal_remaining: number;
  total_issues: number;
  issues_added_on_day: number;
  issues_removed_on_day: number;
  issues_completed_on_day: number;
  planned_issues?: number; // For PI burndown
}

export interface BurndownResponse {
  success: boolean;
  data: {
    sprint_id?: number;
    sprint_name?: string;
    pi_name?: string;
    start_date: string;
    end_date: string;
    burndown_data: BurndownDataPoint[];
    team_name: string;
    issue_type: string;
    total_issues_in_sprint?: number;
    pi?: string;
    project?: string;
    team?: string;
  };
  message: string;
}

export interface PIBurndownResponse {
  success: boolean;
  data: {
    burndown_data: BurndownDataPoint[];
    count: number;
    pi: string;
    project?: string | null;
    issue_type?: string | null;
    team?: string | null;
  };
  message: string;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  // Teams API
  async getTeams(): Promise<TeamsResponse> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.teams.getNames));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const result: ApiResponse<TeamsResponse> = await response.json();
    return result.data;
  }

  // PIs API
  async getPIs(): Promise<PIsResponse> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.pis.getPis));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PIs: ${response.statusText}`);
    }

    const result: ApiResponse<PIsResponse> = await response.json();
    return result.data;
  }

  // Burndown API
  async getBurndownData(
    teamName: string,
    issueType: string = 'all',
    sprintName?: string
  ): Promise<BurndownResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      issue_type: issueType,
    });

    if (sprintName) {
      params.append('sprint_name', sprintName);
    }

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.burndown.sprintBurndown)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch burndown data: ${response.statusText}`);
    }

    return response.json();
  }

  // PI Burndown API
  async getPIBurndownData(
    piName: string,
    issueType?: string,
    teamName?: string,
    project?: string
  ): Promise<PIBurndownResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    if (issueType) {
      params.append('issue_type', issueType);
    }

    // Don't send team parameter if not provided - backend expects array format
    // if (teamName) {
    //   params.append('team', teamName);
    // }

    if (project) {
      params.append('project', project);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.pis.getBurndown)}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PI Burndown API Error:', response.status, errorText);
      throw new Error(`Failed to fetch PI burndown data: ${response.statusText}`);
    }

    return response.json();
  }

  // AI Cards API
  async getAICards(teamName: string): Promise<AICardsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
    });

    const response = await fetch(`${buildBackendUrl('/team-ai-cards/getTopCards')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI cards: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // Recommendations API
  async getRecommendations(teamName: string): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.recommendations.getTop)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<RecommendationsResponse> = await response.json();
    return result.data;
  }

  // PI AI Cards API
  async getPIAICards(piName: string): Promise<AICardsResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    const response = await fetch(`${buildBackendUrl('/pi-ai-cards/getTopCards')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI AI cards: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // PI Recommendations API
  async getPIRecommendations(piName: string): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({
      pi: piName,
    });

    const response = await fetch(`${buildBackendUrl('/recommendations/getPITop')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<RecommendationsResponse> = await response.json();
    return result.data;
  }

  // Team Metrics APIs
  async getSprintMetrics(teamName: string): Promise<SprintMetrics> {
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.avgSprintMetrics)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint metrics: ${response.statusText}`);
    }

    const result: ApiResponse<SprintMetrics> = await response.json();
    return result.data;
  }

  async getCompletionRate(teamName: string): Promise<CompletionRate> {
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.currentSprintProgress)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch completion rate: ${response.statusText}`);
    }

    const result: ApiResponse<CompletionRate> = await response.json();
    return result.data;
  }

  // Note: In-progress count is part of CompletionRate API (in_progress_issues). No separate endpoint.

  async getClosedSprints(teamName: string, months: number = 3): Promise<ClosedSprintsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      months: months.toString(),
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.closedSprints)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch closed sprints: ${response.statusText}`);
    }

    const result: ApiResponse<ClosedSprintsResponse> = await response.json();
    return result.data;
  }

  async getIssuesTrend(
    teamName: string,
    issueType: string = 'Bug',
    months: number = 6
  ): Promise<IssuesTrendResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      issue_type: issueType,
      months: months.toString(),
    });

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.issuesTrend)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch issues trend data: ${response.statusText}`);
    }

    const result: ApiResponse<IssuesTrendResponse> = await response.json();
    return result.data;
  }

  // Scope Changes API
  async getScopeChanges(quarter: string | string[]): Promise<ScopeChangesResponse> {
    const params = new URLSearchParams();
    
    if (Array.isArray(quarter)) {
      quarter.forEach(q => params.append('quarter', q));
    } else {
      params.append('quarter', quarter);
    }

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.pis.getScopeChanges)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch scope changes data: ${response.statusText}`);
    }

    const result: ApiResponse<ScopeChangesResponse> = await response.json();
    return result.data;
  }

  // PI Predictability API
  async getPIPredictability(piNames: string | string[], teamName?: string): Promise<any> {
    const params = new URLSearchParams();
    
    if (Array.isArray(piNames)) {
      params.append('pi_names', piNames.join(','));
    } else {
      params.append('pi_names', piNames);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.pis.getPredictability)}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PI Predictability API Error:', response.status, errorText);
      throw new Error(`Failed to fetch PI predictability data: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the actual API response structure
    // The API returns: { success: bool, data: { predictability_data: [...], count: number, ... }, message: string }
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      // Check if predictability_data exists and is an array
      if ('predictability_data' in result.data && Array.isArray(result.data.predictability_data)) {
        return result.data.predictability_data;
      }
    }
    
    // Fallback for other possible structures
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    }
    
    // Last resort
    return [];
  }

  // Team AI Cards API
  async getTeamAICards(): Promise<any[]> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.generalData.teamAICards));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team AI cards: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the specific API response structure: { success: true, data: { cards: [...], count: number }, message: string }
    if (result.success && result.data && result.data.cards && Array.isArray(result.data.cards)) {
      return result.data.cards;
    }
    
    // Fallback for other possible response structures
    if (result.success && result.data && Array.isArray(result.data)) {
      return result.data;
    }
    
    if (Array.isArray(result)) {
      return result;
    }
    
    // Fallback: return empty array
    console.warn('Unexpected response structure for team AI cards:', result);
    return [];
  }

  // PI AI Cards API (list)
  async getPIAICardsList(): Promise<any[]> {
    const response = await fetch(buildBackendUrl('/pi-ai-cards'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI AI cards: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data && Array.isArray(result.data.cards)) {
      return result.data.cards;
    }
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  }

  // PI AI Card detail
  async getPIAICardDetail(id: string): Promise<any> {
    const url = `${buildBackendUrl('/pi-ai-cards')}/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PI AI card detail: ${response.statusText}`);
    }
    const result: ApiResponse<any> = await response.json();
    if (result.success && result.data) {
      return result.data.card || result.data;
    }
    return result.data;
  }

  async getTeamAICardDetail(id: string): Promise<any> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.generalData.teamAICardDetail)}/${id}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team AI card detail: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    // Handle the nested structure: result.data.card or direct data
    if (result.success && result.data) {
      return result.data.card || result.data;
    }
    
    // Fallback to direct data if structure is different
    return result.data;
  }

  // Agent Jobs API
  async getAgentJobs(): Promise<any[]> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.generalData.agentJobs));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent jobs: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle the specific API response structure: { success: true, data: { jobs: [...], count: number }, message: string }
    if (result.success && result.data && result.data.jobs && Array.isArray(result.data.jobs)) {
      return result.data.jobs;
    }
    
    // Fallback for other possible response structures
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    } else if (result.success && result.data) {
      // If data is not an array, wrap it in an array
      return Array.isArray(result.data) ? result.data : [result.data];
    }
    
    // Fallback: return empty array
    console.warn('Unexpected response structure for agent jobs:', result);
    return [];
  }

  async getAgentJobDetail(jobId: string): Promise<any> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.generalData.agentJobDetail)}/${jobId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent job detail: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    // Handle the nested structure: result.data.job
    if (result.success && result.data && result.data.job) {
      return result.data.job;
    }
    
    // Fallback to direct data if structure is different
    return result.data;
  }

  // Combined team metrics (for parallel fetching)
  async getTeamMetrics(teamName: string) {
    const [sprintMetrics, completionRate] = await Promise.all([
      this.getSprintMetrics(teamName),
      this.getCompletionRate(teamName),
    ]);

    return {
      sprintMetrics,
      completionRate,
      inProgressCount: completionRate?.in_progress_issues ?? 0,
    };
  }

  // Create Team Agent Job
  async createTeamAgentJob(jobType: string, teamName: string): Promise<any> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.generalData.createTeamJob), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_type: jobType,
        team_name: teamName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create team agent job: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Create PI Agent Job
  async createPiAgentJob(jobType: string, pi: string): Promise<any> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.generalData.createPiJob), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_type: jobType,
        pi: pi,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create PI agent job: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Create PI Job for Team
  async createPiJobForTeam(jobType: string, pi: string, teamName: string): Promise<any> {
    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.generalData.createPiJobForTeam), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pi: pi,
        team_name: teamName,
        job_type: jobType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create PI job for team: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Upload Team Transcript
  async uploadTeamTranscript(
    file: File, 
    teamName: string, 
    type: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('raw_data', file);
    formData.append('file_name', file.name);
    formData.append('team_name', teamName);
    formData.append('type', type);
    formData.append('origin', 'UI');
    formData.append('transcript_date', new Date().toISOString().substring(0, 10));

    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.transcripts.uploadTeam), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload team transcript: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Upload PI Transcript
  async uploadPITranscript(
    file: File, 
    piName: string, 
    type: string,
    fileName?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('raw_data', file);
    formData.append('pi', piName);
    formData.append('type', type);
    formData.append('origin', 'UI');
    formData.append('transcript_date', new Date().toISOString().substring(0, 10));
    if (fileName) {
      formData.append('file_name', fileName);
    }

    const response = await fetch(buildBackendUrl(API_CONFIG.endpoints.transcripts.uploadPI), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload PI transcript: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Prompts API
  async getPrompts(params?: {
    email_address?: string;
    prompt_type?: string;
    active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const urlParams = new URLSearchParams();
    
    if (params?.email_address) urlParams.append('email_address', params.email_address);
    if (params?.prompt_type) urlParams.append('prompt_type', params.prompt_type);
    if (params?.active !== undefined) urlParams.append('active', String(params.active));
    if (params?.search) urlParams.append('search', params.search);
    if (params?.limit) urlParams.append('limit', String(params.limit));
    if (params?.offset) urlParams.append('offset', String(params.offset));

    const url = `${buildBackendUrl('/prompts')}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.statusText}`);
    }

    const result = await response.json();

    // Common structures we may receive:
    // 1) { success: true, data: [...] }
    if (result?.success && Array.isArray(result.data)) {
      return result.data;
    }

    // 2) { success: true, data: { prompts: [...], count: number } }
    if (result?.success && result?.data && Array.isArray(result.data.prompts)) {
      return result.data.prompts;
    }

    // 3) Direct array
    if (Array.isArray(result)) {
      return result;
    }

    // 4) { prompts: [...] }
    if (Array.isArray(result?.prompts)) {
      return result.prompts;
    }

    return [];
  }

  async getPromptDetail(email: string, promptName: string): Promise<any> {
    // URL encode email and promptName to handle special characters like @ in emails
    const encodedEmail = encodeURIComponent(email);
    const encodedPromptName = encodeURIComponent(promptName);
    const url = `${buildBackendUrl('/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error('Prompt detail API error:', response.status, errorText);
          // Try to parse as JSON for structured error messages
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to fetch prompt detail: ${errorMessage}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    // Handle different response structures
    if (result.data) {
      // If data has a nested prompt structure
      if (result.data.prompt) {
        return result.data.prompt;
      }
      // If data is an object with prompt fields directly
      if (typeof result.data === 'object' && !Array.isArray(result.data)) {
        return result.data;
      }
    }
    
    return result.data;
  }

  async createPrompt(data: {
    email_address: string;
    prompt_name: string;
    prompt_description: string;
    prompt_type: string;
    prompt_active: boolean;
  }): Promise<any> {
    const url = buildBackendUrl('/prompts');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error('Create prompt API error:', response.status, errorText);
          // Try to parse as JSON for structured error messages
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to create prompt: ${errorMessage}`);
    }

    const result = await response.json();
    return result;
  }

  async updatePrompt(email: string, promptName: string, data: {
    email_address: string;
    prompt_name: string;
    prompt_description: string;
    prompt_type: string;
    prompt_active: boolean;
  }): Promise<any> {
    // URL encode email and promptName to handle special characters
    const encodedEmail = encodeURIComponent(email);
    const encodedPromptName = encodeURIComponent(promptName);
    
    const url = `${buildBackendUrl('/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error('Update prompt API error:', response.status, errorText);
          // Try to parse as JSON for structured error messages
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to update prompt: ${errorMessage}`);
    }

    const result = await response.json();
    return result;
  }

  async deletePrompt(email: string, promptName: string): Promise<void> {
    // URL encode email and promptName to handle special characters
    const encodedEmail = encodeURIComponent(email);
    const encodedPromptName = encodeURIComponent(promptName);
    const url = `${buildBackendUrl('/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error('Delete prompt API error:', response.status, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to delete prompt: ${errorMessage}`);
    }
  }

  // AI Chat API
  async chatWithInsight(request: {
    conversation_id?: string | null;
    question: string;
    user_id: string;
    selected_team: string;
    selected_pi?: string;
    chat_type: string;
    recommendation_id?: string;
    insights_id?: string;
    prompt_name?: string;
  }): Promise<{
    success: boolean;
    data: {
      response: string;
      input_parameters: {
        conversation_id: string;
        question: string;
        user_id: string;
        selected_team: string;
        selected_pi?: string;
        chat_type: string;
        recommendation_id?: string;
        insights_id?: string;
        prompt_name?: string;
      };
    };
    message: string;
  }> {
    const response = await fetch(buildBackendUrl('/ai-chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorText && errorText.length < 200) {
          errorMessage = errorText;
        }
      }
      throw new Error(`Failed to send chat message: ${errorMessage}`);
    }

    return response.json();
  }

  // Settings API
  async getSettings(): Promise<any> {
    const url = buildBackendUrl(API_CONFIG.endpoints.settings.get);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }
    const result = await response.json();
    // Support common shapes
    if (result?.success && result?.data) return result.data;
    return result;
  }

  async updateSettings(settings: Record<string, any>, updatedBy?: string): Promise<any> {
    // Ensure all values are strings as backend expects Dict[str, str]
    const stringSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      stringSettings[key] = String(value);
    }
    
    const url = buildBackendUrl(API_CONFIG.endpoints.settings.batch);
    // Send object shape expected by batch endpoint: { settings: { ... }, updated_by }
    const body = { settings: stringSettings, updated_by: updatedBy || 'ui' };
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (response.ok) {
      return response.json();
    }
    
    const text = await response.text();
    throw new Error(`Failed to update settings: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
  }

  // Insight Types API
  async getInsightTypes(): Promise<InsightTypesResponse> {
    const url = buildBackendUrl(API_CONFIG.endpoints.insightTypes.get);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch insight types: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle array response directly
    if (Array.isArray(result)) {
      return {
        insight_types: result,
        count: result.length,
      };
    }
    
    // Support wrapped response format
    if (result.success && result.data) {
      // Check if data is an array
      if (Array.isArray(result.data)) {
        return {
          insight_types: result.data,
          count: result.data.length,
        };
      }
      // If data has insight_types property
      return result.data;
    }
    
    // If response is direct object with insight_types
    if (result.insight_types) {
      return result;
    }
    
    // Fallback: assume it's an array
    return {
      insight_types: Array.isArray(result) ? result : [],
      count: Array.isArray(result) ? result.length : 0,
    };
  }

  async getInsightCategories(): Promise<InsightCategoriesResponse> {
    const url = buildBackendUrl(API_CONFIG.endpoints.insightTypes.getCategories);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch insight categories: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle wrapped response format: { success: true, data: { categories: [{name: string, class: string}], count: N } }
    if (result.success && result.data) {
      if (result.data.categories && Array.isArray(result.data.categories)) {
        // Extract name from each category object (ignore class for now)
        const categoryNames = result.data.categories.map((cat: { name: string; class?: string }) => 
          typeof cat === 'string' ? cat : cat.name
        );
        return {
          categories: categoryNames,
          count: result.data.count || categoryNames.length,
        };
      }
    }
    
    // Handle direct array response (legacy format - array of strings)
    if (Array.isArray(result)) {
      // Check if it's an array of objects or strings
      const categoryNames = result.map((cat: string | { name: string; class?: string }) => 
        typeof cat === 'string' ? cat : cat.name
      );
      return {
        categories: categoryNames,
        count: categoryNames.length,
      };
    }
    
    // Fallback
    return {
      categories: [],
      count: 0,
    };
  }

  async updateInsightType(id: number, data: {
    insight_type?: string;
    insight_description?: string;
    insight_categories?: string[];
    active?: boolean;
  }): Promise<InsightType> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.insightTypes.update)}/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error('Update insight type API error:', response.status, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to update insight type: ${errorMessage}`);
    }

    const result: ApiResponse<InsightType> = await response.json();
    
    // Support both wrapped and direct response formats
    if (result.success && result.data) {
      return result.data;
    }
    
    return result as unknown as InsightType;
  }

  // Users API
  async getCurrentUser(): Promise<User> {
    const response = await fetch(buildUserServiceUrl(API_CONFIG.endpoints.users.getCurrentUser));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current user: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Check if response is wrapped in ApiResponse format
    if (result.success && result.data) {
      return result.data as User;
    }
    
    // If response is direct object (no wrapper), return it directly
    return result as User;
  }
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
}

export interface RoleDto {
  id: string;
  roleName: string;  // Backend returns camelCase
  createdAt: string;
}

export async function verifyAdmin(): Promise<boolean> {
  const url = buildUserServiceUrl('/users/verify-admin');
  console.log('[verifyAdmin] Calling:', url);
  const res = await authFetch(url); // Use authFetch for protected route
  console.log('[verifyAdmin] Response status:', res.status, res.statusText);
  if (!res.ok) {
    console.log('[verifyAdmin] Request failed - returning false');
    return false;
  }
  try {
    const data = await res.json();
    console.log('[verifyAdmin] Response data:', data);
    const isAdmin = !!data.isAdmin;
    console.log('[verifyAdmin] Final result:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('[verifyAdmin] Error parsing response:', error);
    return false;
  }
}

export async function listUsers(): Promise<UserDto[]> {
  const res = await fetch(buildUserServiceUrl('/users'));
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function getUserRoles(userId: string): Promise<RoleDto[]> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/roles`));
  if (!res.ok) throw new Error('Failed to fetch user roles');
  return res.json();
}

export type AllowlistEntry = { id: string; pattern: string; type: string; created_by?: string; created_at: string };

export async function getAllowlist(search: string = ''): Promise<AllowlistEntry[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(buildUserServiceUrl(`/allowlist${q}`));
  if (!res.ok) throw new Error('Failed to fetch allowlist');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}

export async function addAllowlist(pattern: string): Promise<AllowlistEntry> {
  const res = await fetch(buildUserServiceUrl('/allowlist'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAllowlist(id: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/allowlist/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete allowlist entry');
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}`), { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text() || 'Failed to delete user');
}

export async function listRoles(): Promise<RoleDto[]> {
  const res = await fetch(buildUserServiceUrl('/roles'));
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/roles`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId }),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to assign role');
}

export async function unassignRoleFromUser(userId: string, roleId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/roles/${roleId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to unassign role');
}

// Pending role assignments for invited users (by email)
export async function getPendingRoles(email: string): Promise<RoleDto[]> {
  const res = await fetch(buildUserServiceUrl(`/pending-roles?email=${encodeURIComponent(email)}`));
  if (!res.ok) throw new Error('Failed to fetch pending roles');
  return res.json();
}

export async function assignPendingRole(email: string, roleId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl('/pending-roles'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role_id: roleId }),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to assign pending role');
}

export async function unassignPendingRole(email: string, roleId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl('/pending-roles'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role_id: roleId }),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to unassign pending role');
}

// Legacy class for backward compatibility
export class BurndownApiService {
  private apiService: ApiService;

  constructor(baseUrl?: string) {
    this.apiService = new ApiService();
  }

  async getBurndownData(
    teamName: string,
    issueType: string = 'all',
    sprintName?: string
  ): Promise<BurndownResponse> {
    return this.apiService.getBurndownData(teamName, issueType, sprintName);
  }
}

