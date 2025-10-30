import { 
  API_CONFIG, 
  buildApiUrl, 
  ApiResponse,
  TeamsResponse,
  PIsResponse,
  AICardsResponse,
  RecommendationsResponse,
  SprintMetrics,
  CompletionRate,
  InProgressCount,
  ClosedSprintsResponse,
  IssuesTrendResponse,
  IssuesTrendDataPoint,
  PIPredictabilityResponse,
  PIPredictabilityData,
  ScopeChangesResponse,
  ScopeChangesDataPoint
} from './config';

// Re-export types for convenience
export type { IssuesTrendDataPoint, IssuesTrendResponse, PIPredictabilityResponse, PIPredictabilityData, ScopeChangesResponse, ScopeChangesDataPoint };

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
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.teams.getNames));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const result: ApiResponse<TeamsResponse> = await response.json();
    return result.data;
  }

  // PIs API
  async getPIs(): Promise<PIsResponse> {
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.pis.getPis));
    
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

    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.burndown.sprintBurndown)}?${params}`);
    
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

    const url = `${buildApiUrl(API_CONFIG.endpoints.pis.getBurndown)}?${params}`;
    
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

    const response = await fetch(`${buildApiUrl('/api/v1/team-ai-cards/getTopCards')}?${params}`);
    
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

    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.recommendations.getTop)}?${params}`);
    
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

    const response = await fetch(`${buildApiUrl('/api/v1/pi-ai-cards/getTopCards')}?${params}`);
    
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

    const response = await fetch(`${buildApiUrl('/api/v1/recommendations/getPITop')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<RecommendationsResponse> = await response.json();
    return result.data;
  }

  // Team Metrics APIs
  async getSprintMetrics(teamName: string): Promise<SprintMetrics> {
    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.teamMetrics.avgSprintMetrics)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint metrics: ${response.statusText}`);
    }

    const result: ApiResponse<SprintMetrics> = await response.json();
    return result.data;
  }

  async getCompletionRate(teamName: string): Promise<CompletionRate> {
    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.teamMetrics.currentSprintCompletion)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch completion rate: ${response.statusText}`);
    }

    const result: ApiResponse<CompletionRate> = await response.json();
    return result.data;
  }

  async getInProgressCount(teamName: string): Promise<InProgressCount> {
    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.teamMetrics.countInProgress)}?team_name=${teamName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch in progress count: ${response.statusText}`);
    }

    const result: ApiResponse<InProgressCount> = await response.json();
    return result.data;
  }

  async getClosedSprints(teamName: string, months: number = 3): Promise<ClosedSprintsResponse> {
    const params = new URLSearchParams({
      team_name: teamName,
      months: months.toString(),
    });

    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.teamMetrics.closedSprints)}?${params}`);
    
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

    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.teamMetrics.issuesTrend)}?${params}`);
    
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

    const response = await fetch(`${buildApiUrl(API_CONFIG.endpoints.pis.getScopeChanges)}?${params}`);
    
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

    const url = `${buildApiUrl(API_CONFIG.endpoints.pis.getPredictability)}?${params}`;
    console.log('PI Predictability URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PI Predictability API Error:', response.status, errorText);
      throw new Error(`Failed to fetch PI predictability data: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('PI Predictability Raw Response:', result);
    console.log('Result keys:', Object.keys(result));
    console.log('Result.data:', result.data);
    console.log('Result.data type:', typeof result.data);
    console.log('Result.data isArray:', Array.isArray(result.data));
    
    // Handle the actual API response structure
    // The API returns: { success: bool, data: { predictability_data: [...], count: number, ... }, message: string }
    if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
      console.log('Result.data keys:', Object.keys(result.data));
      
      // Check if predictability_data exists and is an array
      if ('predictability_data' in result.data && Array.isArray(result.data.predictability_data)) {
        console.log('Found predictability_data array with length:', result.data.predictability_data.length);
        return result.data.predictability_data;
      }
    }
    
    // Fallback for other possible structures
    if (result.data && Array.isArray(result.data)) {
      console.log('Returning result.data array with length:', result.data.length);
      return result.data;
    } else if (Array.isArray(result)) {
      console.log('Returning result array directly with length:', result.length);
      return result;
    }
    
    // Last resort
    console.log('No suitable data structure found, returning empty array');
    return [];
  }

  // Team AI Cards API
  async getTeamAICards(): Promise<any[]> {
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.generalData.teamAICards));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team AI cards: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Debug logging to see the actual response structure
    console.log('=== TEAM AI CARDS API DEBUG ===');
    console.log('Full API response:', result);
    console.log('Response type:', typeof result);
    console.log('Response keys:', Object.keys(result || {}));
    console.log('===============================');
    
    // Handle the specific API response structure: { success: true, data: { cards: [...], count: number }, message: string }
    if (result.success && result.data && result.data.cards && Array.isArray(result.data.cards)) {
      console.log('Returning result.data.cards array with length:', result.data.cards.length);
      return result.data.cards;
    }
    
    // Fallback for other possible response structures
    if (result.success && result.data && Array.isArray(result.data)) {
      console.log('Returning result.data array with length:', result.data.length);
      return result.data;
    }
    
    if (Array.isArray(result)) {
      console.log('Returning result array directly with length:', result.length);
      return result;
    }
    
    // Fallback: return empty array
    console.warn('Unexpected response structure for team AI cards:', result);
    return [];
  }

  // PI AI Cards API (list)
  async getPIAICardsList(): Promise<any[]> {
    const response = await fetch(buildApiUrl('/api/v1/pi-ai-cards'));
    
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
    const url = `${buildApiUrl('/api/v1/pi-ai-cards')}/${id}`;
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
    const url = `${buildApiUrl(API_CONFIG.endpoints.generalData.teamAICardDetail)}/${id}`;
    
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
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.generalData.agentJobs));
    
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
    const url = `${buildApiUrl(API_CONFIG.endpoints.generalData.agentJobDetail)}/${jobId}`;
    console.log('=== API DEBUG ===');
    console.log('Fetching job detail from URL:', url);
    
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent job detail: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    console.log('Raw API result:', result);
    console.log('Result data:', result.data);
    console.log('Result data.job:', result.data?.job);
    console.log('================');
    
    // Handle the nested structure: result.data.job
    if (result.success && result.data && result.data.job) {
      return result.data.job;
    }
    
    // Fallback to direct data if structure is different
    return result.data;
  }

  // Combined team metrics (for parallel fetching)
  async getTeamMetrics(teamName: string) {
    const [sprintMetrics, completionRate, inProgressCount] = await Promise.all([
      this.getSprintMetrics(teamName),
      this.getCompletionRate(teamName),
      this.getInProgressCount(teamName),
    ]);

    return {
      sprintMetrics,
      completionRate,
      inProgressCount,
    };
  }

  // Create Team Agent Job
  async createTeamAgentJob(jobType: string, teamName: string): Promise<any> {
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.generalData.createTeamJob), {
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
    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.generalData.createPiJob), {
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

    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.transcripts.uploadTeam), {
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

    const response = await fetch(buildApiUrl(API_CONFIG.endpoints.transcripts.uploadPI), {
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

    const url = `${buildApiUrl('/api/v1/prompts')}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    
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
    const url = `${buildApiUrl('/api/v1/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    console.log('Fetching prompt detail from URL:', url);
    
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
    
    console.log('getPromptDetail raw result:', result);
    console.log('getPromptDetail result.data:', result.data);
    console.log('getPromptDetail result.data keys:', result.data ? Object.keys(result.data) : 'null');
    
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
    const url = buildApiUrl('/api/v1/prompts');
    
    console.log('Creating prompt at URL:', url);
    console.log('Creating prompt with data:', JSON.stringify(data, null, 2));
    
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
    
    const url = `${buildApiUrl('/api/v1/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    console.log('Updating prompt at URL:', url);
    console.log('Update data being sent:', JSON.stringify(data, null, 2));
    
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
    const url = `${buildApiUrl('/api/v1/prompts')}/${encodedEmail}/${encodedPromptName}`;
    
    console.log('Deleting prompt at URL:', url);
    
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
    username: string;
    selected_team: string;
    selected_pi?: string;
    chat_type: string;
    recommendation_id?: string;
    insights_id?: string;
  }): Promise<{
    success: boolean;
    data: {
      response: string;
      input_parameters: {
        conversation_id: string;
        question: string;
        username: string;
        selected_team: string;
        selected_pi?: string;
        chat_type: string;
        recommendation_id?: string;
        insights_id?: string;
      };
    };
    message: string;
  }> {
    const response = await fetch(buildApiUrl('/api/v1/ai-chat'), {
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
    const url = buildApiUrl(API_CONFIG.endpoints.settings.get);
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
    const url = buildApiUrl(API_CONFIG.endpoints.settings.batch);
    // Attempt 1: dict form { settings: { key: value }, updated_by }
    const bodyDict = { settings, updated_by: updatedBy || 'ui' } as any;
    console.log('updateSettings URL:', url);
    console.log('updateSettings body (dict):', bodyDict);
    let response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(bodyDict),
    });
    if (response.ok) {
      return response.json();
    }
    const text1 = await response.text();
    // If the server expects an array of {key, value}
    if (response.status === 422 || response.status === 400) {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const bodyArray = { settings: settingsArray, updated_by: updatedBy || 'ui' };
      console.warn('updateSettings retry with array payload due to', response.status, text1);
      console.log('updateSettings body (array):', bodyArray);
      response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(bodyArray),
      });
      if (response.ok) {
        return response.json();
      }
    }
    const text = await response.text();
    throw new Error(`Failed to update settings: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
  }
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
