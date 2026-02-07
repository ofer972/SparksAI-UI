import { 
  API_CONFIG, 
  buildBackendUrl,
  buildUserServiceUrl,
  ApiResponse,
  User,
  TeamsResponse,
  PIsResponse,
  AICardsResponse,
  SprintMetrics,
  CompletionRate,
  ClosedSprint,
  ClosedSprintsResponse,
  IssuesTrendResponse,
  IssuesTrendDataPoint,
  PIPredictabilityResponse,
  PIPredictabilityData,
  ScopeChangesResponse,
  ScopeChangesDataPoint,
  InsightTypesResponse,
  InsightType,
  InsightCategoriesResponse,
  CreateJobResponse,
  ReportDefinition,
  ReportInstancePayload,
  DashboardViewConfig,
  Group,
  Team,
  PIStatusForTodayResponse,
  PIStatusForTodayItem,
  AverageEpicCycleTimeResponse,
  IssueTypesHierarchyResponse,
  CycleTimeIssuesResponse,
  BurndownIssuesResponse
} from './config';
import { getAuthHeaders, refreshAccessToken, clearTokens, getCurrentUser } from './auth';

// Re-export types for convenience
export type { IssuesTrendDataPoint, IssuesTrendResponse, PIPredictabilityResponse, PIPredictabilityData, ScopeChangesResponse, ScopeChangesDataPoint };

// Lightweight authorized fetch wrapper to add Authorization when available
const nativeFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return (globalThis as any).fetch(input as any, init as any);
};

// Shared refresh promise to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const doFetch = async () => {
    const headers = getAuthHeaders(init?.headers as HeadersInit);
    return nativeFetch(input, { ...(init || {}), headers });
  };
  
  let res = await doFetch();
  
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
  start_date: string | null; // Can be null in new response format
  end_date: string | null; // Can be null in new response format
  remaining_issues: number | null;
  ideal_remaining: number;
  total_issues: number;
  issues_added_on_day: number;
  issues_removed_on_day: number;
  issues_completed_on_day: number;
  planned_issues?: number; // For PI burndown
  wip_issues_in_progress?: number | null; // Work in progress issues per day
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

export interface ReleaseBurndownResponse {
  success: boolean;
  data: {
    burndown_data: Array<{
      snapshot_date: string;
      release_name: string;
      start_date: string;
      release_date: string;
      planned_issues: number;
      issues_added_on_day: number;
      issues_removed_on_day: number;
      issues_completed_on_day: number;
      remaining_issues: number;
      ideal_remaining: number;
      total_issues: number;
      wip_issues_in_progress: number;
    }>;
    count: number;
    release: string;
    issue_type: string;
    isGroup: boolean;
    team_name?: string;
    group_name?: string;
    teams_in_group?: string[];
  };
  message: string;
}

type PrimitiveFilter = string | number | boolean;
type ReportFilterValue = PrimitiveFilter | null | undefined | PrimitiveFilter[];

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  private buildReportQuery(filters?: Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined>): string {
    if (!filters) {
      return '';
    }

    const queryParts: string[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      // Encode the key
      const encodedKey = encodeURIComponent(key);
      
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item !== null && item !== undefined && String(item).trim() !== '') {
            // Explicitly encode each value to ensure special characters like +, &, =, etc. are properly encoded
            const encodedValue = encodeURIComponent(String(item));
            queryParts.push(`${encodedKey}=${encodedValue}`);
          }
        });
      } else {
        const stringValue = String(value);
        if (stringValue.trim() === '') {
          continue;
        }
        // Explicitly encode the value to ensure special characters like +, &, =, etc. are properly encoded
        // This ensures values like "AutoDesign Dev+Test" are properly encoded as "AutoDesign%20Dev%2BTest"
        const encodedValue = encodeURIComponent(stringValue);
        queryParts.push(`${encodedKey}=${encodedValue}`);
      }
    }

    return queryParts.join('&');
  }

  private normalizeDashboardConfigs(payload: any): DashboardViewConfig[] {
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((entry) => {
        const view = typeof entry?.view === 'string'
          ? entry.view.trim()
          : typeof entry?.view_name === 'string'
            ? entry.view_name.trim()
            : '';

        const rawReportIds = Array.isArray(entry?.reportIds)
          ? entry.reportIds
          : Array.isArray(entry?.report_ids)
            ? entry.report_ids
            : Array.isArray(entry?.reportIDs)
              ? entry.reportIDs
              : [];

        const reportIds = (rawReportIds as unknown[])
          .filter((id: unknown) => id !== null && id !== undefined)
          .map((id: unknown) => String(id).trim())
          .filter((id: string) => id.length > 0);

        if (!view) {
          return null;
        }

        // Extract layout_config if present
        const layoutConfig = entry?.layout_config || entry?.layoutConfig || undefined;

        return {
          view,
          reportIds,
          layout_config: layoutConfig,
        } as DashboardViewConfig;
      })
      .filter((cfg): cfg is DashboardViewConfig => cfg !== null);
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

  // Reports API
  async getReportDefinitions(options?: {
    includeAudit?: boolean;
    auditOnly?: boolean;
  }): Promise<ReportDefinition[]> {
    const params = new URLSearchParams();
    if (options?.includeAudit) params.append('include_audit', 'true');
    if (options?.auditOnly) params.append('audit_only', 'true');
    
    const url = `${buildBackendUrl(API_CONFIG.endpoints.reports.list)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch report definitions: ${response.statusText}`);
    }

    const result = await response.json();

    if (result?.success === false) {
      throw new Error(result?.message || 'Failed to fetch report definitions');
    }

    if (result?.success && Array.isArray(result.data)) {
      return result.data as ReportDefinition[];
    }

    if (result?.success && result.data?.reports && Array.isArray(result.data.reports)) {
      return result.data.reports as ReportDefinition[];
    }

    return Array.isArray(result?.data) ? (result.data as ReportDefinition[]) : [];
  }

  async getReport<T = any>(
    reportId: string,
    filters?: Record<string, ReportFilterValue>
  ): Promise<ReportInstancePayload<T>> {
    const encodedId = encodeURIComponent(reportId);
    const baseUrl = buildBackendUrl(API_CONFIG.endpoints.reports.detail);
    const query = this.buildReportQuery(filters);
    const url = query ? `${baseUrl}/${encodedId}?${query}` : `${baseUrl}/${encodedId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch report '${reportId}': ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
      );
    }

    const result: ApiResponse<ReportInstancePayload<T>> = await response.json();

    if (!result.success) {
      throw new Error(result.message || `Failed to fetch report '${reportId}'`);
    }

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

  // Get current and next PIs
  async getCurrentAndNextPIs(): Promise<PIsResponse> {
    const response = await authFetch(buildBackendUrl(API_CONFIG.endpoints.pis.getCurrentAndNext));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current and next PIs: ${response.statusText}`);
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

  // PI Status For Today API
  async getPIStatusForToday(targetPiName: string, teamName?: string, isGroup?: boolean, bypassCache?: boolean): Promise<PIStatusForTodayResponse> {
    const params = new URLSearchParams({
      pi: targetPiName,
    });
    
    if (teamName) {
      params.set('team_name', teamName);
    }
    
    if (isGroup !== undefined) {
      params.set('isGroup', isGroup.toString());
    }
    
    if (bypassCache === true) {
      params.set('bypass_cache', 'true');
    }

    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.pis.getPIStatusForToday)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PI status for today: ${response.statusText}`);
    }

    const result: ApiResponse<PIStatusForTodayItem[]> = await response.json();
    
    if (result.success && result.data) {
      // result.data is an array of PIStatusForTodayItem
      // Wrap it in PIStatusForTodayResponse structure
      const responseData: PIStatusForTodayResponse = {
        data: result.data,
        count: result.data.length,
        message: result.message || '',
      };
      return responseData;
    }
    
    return { data: [], count: 0, message: '' };
  }

  // Average Epic Cycle Time API
  async getAverageEpicCycleTime(months: number = 6, teamName?: string, isGroup?: boolean, bypassCache?: boolean): Promise<AverageEpicCycleTimeResponse> {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    
    if (teamName) {
      params.append('team_name', teamName);
    }
    
    if (isGroup !== undefined) {
      params.append('isGroup', isGroup.toString());
    }
    
    if (bypassCache === true) {
      params.append('bypass_cache', 'true');
    }
    
    const url = `${buildBackendUrl(API_CONFIG.endpoints.pis.getAverageEpicCycleTime)}?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch average epic cycle time: ${response.statusText}`);
    }

    return response.json();
  }

  // Cycle Time Issues API
  async getCycleTimeIssues(
    periodStart: string,
    periodEnd: string,
    issuetypes: string[],
    teamName?: string,
    isGroup: boolean = false
  ): Promise<CycleTimeIssuesResponse> {
    const params = new URLSearchParams();
    params.append('period_start', periodStart);
    params.append('period_end', periodEnd);
    issuetypes.forEach(type => params.append('issue_type', type));

    if (teamName) {
      params.append('team_name', teamName);
    }
    params.append('isGroup', isGroup.toString());

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.cycleTimeWithIssueKeys)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch cycle time issues: ${response.statusText}`);
    }

    const result: CycleTimeIssuesResponse = await response.json();
    return result;
  }

  // Burndown Issues API
  async getBurndownIssues(
    date: string,
    sprintId: number,
    metricType: string,
    teamName?: string,
    isGroup: boolean = false,
    issueType?: string
  ): Promise<BurndownIssuesResponse> {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('sprint_id', sprintId.toString());
    params.append('metric_type', metricType);

    if (teamName) {
      params.append('team_name', teamName);
    }
    if (isGroup) {
      params.append('isGroup', 'true');
    }
    if (issueType && issueType !== 'all') {
      params.append('issue_type', issueType);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.getHistoryInfo)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch burndown issues: ${response.statusText}`);
    }

    const result: BurndownIssuesResponse = await response.json();
    return result;
  }

  // PI Burndown Issues API
  async getPIBurndownIssues(
    date: string,
    piName: string,
    metricType: string,
    teamName?: string,
    isGroup: boolean = false,
    issueType?: string
  ): Promise<BurndownIssuesResponse> {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('pi', piName);
    params.append('metric_type', metricType);

    if (teamName) {
      params.append('team_name', teamName);
    }
    if (isGroup) {
      params.append('isGroup', 'true');
    }
    if (issueType && issueType !== 'all') {
      params.append('issue_type', issueType);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.getPIHistoryInfo)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch PI burndown issues: ${response.statusText}`);
    }

    const result: BurndownIssuesResponse = await response.json();
    return result;
  }

  // Release Burndown Data API
  async getReleaseBurndownData(
    releaseName: string,
    issueType?: string,
    teamName?: string,
    isGroup: boolean = false
  ): Promise<ReleaseBurndownResponse> {
    const params = new URLSearchParams();
    params.append('release', releaseName);
    
    if (issueType && issueType !== 'all') {
      params.append('issue_type', issueType);
    }
    if (teamName) {
      params.append('team_name', teamName);
    }
    if (isGroup) {
      params.append('isGroup', 'true');
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.releases.getBurndown)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch release burndown data: ${response.statusText}`);
    }

    const result: ReleaseBurndownResponse = await response.json();
    return result;
  }

  // Release Burndown Issues API (for chart click dialog)
  async getReleaseBurndownIssues(
    date: string,
    releaseName: string,
    metricType: string,
    teamName?: string,
    isGroup: boolean = false,
    issueType?: string
  ): Promise<BurndownIssuesResponse> {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('release', releaseName);
    params.append('metric_type', metricType);

    if (teamName) {
      params.append('team_name', teamName);
    }
    if (isGroup) {
      params.append('isGroup', 'true');
    }
    if (issueType && issueType !== 'all') {
      params.append('issue_type', issueType);
    }

    const url = `${buildBackendUrl(API_CONFIG.endpoints.issues.getReleaseHistoryInfo)}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch release burndown issues: ${response.statusText}`);
    }

    const result: BurndownIssuesResponse = await response.json();
    return result;
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

  async getTeamAICardsWithRecommendations(teamName: string, categories?: string[], isGroup?: boolean): Promise<AICardsResponse> {
    // Determine insight_type based on isGroup flag
    const insightType = isGroup ? 'group' : 'team';
    const params = new URLSearchParams({
      insight_type: insightType,
    });

    // Add identifier parameter based on insight_type
    if (insightType === 'group') {
      params.append('group_name', teamName);
    } else {
      params.append('team_name', teamName);
    }

    // Add multiple category parameters if provided
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        params.append('category', cat);
      });
    }

    const response = await fetch(`${buildBackendUrl('/ai-insights/getTopCardsWithRecommendations')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI cards with recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // AI Cards API with recommendations
  async getAICardsWithRecommendations(
    piName?: string,
    teamName?: string,
    isGroup?: boolean,
    categories?: string[]
  ): Promise<AICardsResponse> {
    const params = new URLSearchParams();

    // Add PI parameter if provided
    if (piName) {
      params.append('pi', piName);
    }

    // Add team or group parameter if provided
    if (teamName) {
      if (isGroup) {
        params.append('group_name', teamName);
      } else {
        params.append('team_name', teamName);
      }
    }

    // Add category parameters if provided
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        params.append('category', cat);
      });
    }

    const response = await fetch(`${buildBackendUrl('/ai-insights/getTopCardsWithRecommendations')}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI cards with recommendations: ${response.statusText}`);
    }

    const result: ApiResponse<AICardsResponse> = await response.json();
    return result.data;
  }

  // Team Metrics APIs
  async getSprintMetrics(teamName: string, isGroup?: boolean, bypassCache?: boolean): Promise<SprintMetrics> {
    const params = new URLSearchParams({ team_name: teamName });
    if (isGroup !== undefined) {
      params.set('isGroup', isGroup.toString());
    }
    if (bypassCache === true) {
      params.set('bypass_cache', 'true');
    }
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.avgSprintMetrics)}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sprint metrics: ${response.statusText}`);
    }

    const result: ApiResponse<SprintMetrics> = await response.json();
    return result.data;
  }

  async getGeneralKPIs(
    scope: 'sprint' | 'pi',
    teamName: string,
    isGroup: boolean,
    pi?: string,
    metrics?: string,
    sprintCount: number = 5,
    bypassCache?: boolean
  ): Promise<any[]> {
    const params = new URLSearchParams({
      scope,
      team_name: teamName,
      isGroup: isGroup.toString(),
      sprint_count: sprintCount.toString(),
    });
    
    if (pi) {
      params.set('pi', pi);
    }
    
    if (metrics) {
      params.set('metrics', metrics);
    }
    
    if (bypassCache === true) {
      params.set('bypass_cache', 'true');
    }
    
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.generalKpis)}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ${scope} KPIs: ${errorText || response.statusText}`);
    }

    // Response is an array of metric objects
    return await response.json();
  }

  async getCompletionRate(teamName: string, isGroup?: boolean, bypassCache?: boolean): Promise<CompletionRate> {
    const params = new URLSearchParams({ team_name: teamName });
    if (isGroup !== undefined) {
      params.set('isGroup', isGroup.toString());
    }
    if (bypassCache === true) {
      params.set('bypass_cache', 'true');
    }
    const response = await fetch(`${buildBackendUrl(API_CONFIG.endpoints.teamMetrics.currentSprintProgress)}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch completion rate: ${response.statusText}`);
    }

    const result: ApiResponse<CompletionRate> = await response.json();
    return result.data;
  }

  // Note: In-progress count is part of CompletionRate API (in_progress_issues). No separate endpoint.

  async getClosedSprints(teamName: string, months: number = 3): Promise<ClosedSprintsResponse> {
    const payload = await this.getReport<ClosedSprint[]>('team-closed-sprints', {
      team_name: teamName,
      months,
    });

    const rows = Array.isArray(payload.result) ? payload.result : [];

    return {
      closed_sprints: rows,
      count: rows.length,
      team_name: teamName,
      months_looked_back: months,
    };
  }

  async getSprintVelocityAdvanced(teamName: string, months: number = 2, isGroup: boolean = false): Promise<{ data: ClosedSprint[]; meta: { average_velocity: number | null } }> {
    const payload = await this.getReport<ClosedSprint[]>('team-closed-sprints', {
      team_name: teamName,
      months,
      isGroup,
    });

    const rows = Array.isArray(payload.result) ? payload.result : [];
    const averageVelocity = payload.meta?.average_velocity ?? null;

    return {
      data: rows,
      meta: { average_velocity: averageVelocity },
    };
  }

  async getIssuesTrend(
    teamName: string | null,
    issueType: string = 'Bug',
    months: number = 6,
    isGroup: boolean = false
  ): Promise<IssuesTrendResponse> {
    const filters: Record<string, any> = {
      issue_type: issueType,
      months,
    };
    
    if (teamName) {
      filters.team_name = teamName;
      filters.isGroup = isGroup;
    }

    const payload = await this.getReport<{ [issueType: string]: IssuesTrendDataPoint[] }>('team-issues-trend', filters);

    // payload.result is now the data dict grouped by issue_type
    // payload.meta contains metadata
    const trendData = payload.result || {};
    const meta = payload.meta || {};

    return {
      data: trendData,
      meta: {
        months: meta.months || months,
        count: meta.count || 0,
        team_name: meta.team_name,
        group_name: meta.group_name,
        teams_in_group: meta.teams_in_group,
        isGroup: meta.isGroup || isGroup,
        issue_type: meta.issue_type || issueType,
      },
    };
  }

  // Scope Changes API
  async getScopeChanges(quarter: string | string[]): Promise<ScopeChangesResponse> {
    const quarters = Array.isArray(quarter) ? quarter : [quarter];
    const payload = await this.getReport<ScopeChangesDataPoint[]>('epic-scope-changes', {
      quarters,
    });

    const scopeData = Array.isArray(payload.result) ? payload.result : [];

    return {
      scope_data: scopeData,
      count: scopeData.length,
      quarters,
    };
  }

  // PI Predictability API
  async getPIPredictability(piNames: string | string[], teamName?: string): Promise<any> {
    const piList = Array.isArray(piNames) ? piNames : [piNames];
    const payload = await this.getReport<any[]>('pi-predictability', {
      pi_names: piList,
      team_name: teamName,
    });

    return Array.isArray(payload.result) ? payload.result : [];
  }

  // AI Cards API (unified endpoint for all AI cards)
  async getTeamAICards(): Promise<any[]> {
    // Use the unified /ai-insights endpoint to get all AI cards
    const response = await fetch(buildBackendUrl('/ai-insights?limit=1000'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI cards: ${response.statusText}`);
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
    console.warn('Unexpected response structure for AI cards:', result);
    return [];
  }

  async getTeamAICardDetail(id: string): Promise<any> {
    // Use the unified /ai-insights/{id} endpoint
    const url = `${buildBackendUrl('/ai-insights')}/${id}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AI card detail: ${response.statusText}`);
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
  async getTeamMetrics(teamName: string, isGroup?: boolean, bypassCache?: boolean) {
    const [sprintMetrics, completionRate] = await Promise.all([
      this.getSprintMetrics(teamName, isGroup, bypassCache),
      this.getCompletionRate(teamName, isGroup, bypassCache),
    ]);

    return {
      sprintMetrics,
      completionRate,
      inProgressCount: completionRate?.in_progress_issues ?? 0,
    };
  }

  // Create Agent Job (unified endpoint)
  async createAgentJob(
    jobType: string,
    teamName?: string,
    pi?: string,
    groupName?: string
  ): Promise<CreateJobResponse> {
    const response = await fetch(buildBackendUrl('/agent-jobs/create'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_type: jobType,
        team_name: teamName || null,
        pi: pi || null,
        group_name: groupName || null,
      }),
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
      throw new Error(errorMessage);
    }

    return response.json();
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

  async getPromptDetailById(promptId: number): Promise<any> {
    const url = `${buildBackendUrl('/prompts')}/${promptId}`;
    
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

  async updatePromptById(promptId: number, data: {
    email_address: string;
    prompt_name: string;
    prompt_description: string;
    prompt_type: string;
    prompt_active: boolean;
  }): Promise<any> {
    const url = `${buildBackendUrl('/prompts')}/${promptId}`;
    
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

  async deletePromptById(promptId: number): Promise<void> {
    const url = `${buildBackendUrl('/prompts')}/${promptId}`;
    
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
    dashboard_data?: any;
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
        dashboard_data?: any;
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
      
      // Handle 429 (rate limit) errors with user-friendly message
      if (response.status === 429) {
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorJson.error || errorMessage;
          throw new Error(errorMessage);
        } catch (parseError) {
          throw new Error('The AI service is currently experiencing high demand. Please try again in a few moments.');
        }
      }
      
      // Handle other errors
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorText && errorText.length < 200) {
          errorMessage = errorText;
        }
      }
      throw new Error(`Failed to send chat message: ${errorMessage}`);
    }

    return response.json();
  }

  // PI Goals API
  async generatePIGoals(piName: string, teamName?: string, isGroup?: boolean): Promise<any> {
    const url = buildBackendUrl('/goals/generate');
    const body: any = { 
      scope_type: 'pi',
      pi_name: piName 
    };
    
    if (teamName) {
      body.team_name = teamName;
      body.isGroup = isGroup || false;
    }
    
    // Set 90 second timeout for this endpoint only
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
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
        throw new Error(`Failed to generate PI goals: ${errorMessage}`);
      }
      
      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout: PI goals generation took longer than 90 seconds');
      }
      throw err;
    }
  }

  // Get PI Goals
  async getPIGoals(piName: string, teamName?: string, isGroup?: boolean, ai: boolean = true): Promise<any> {
    const params = new URLSearchParams({
      scope_type: 'pi',
      pi_name: piName,
      ai: ai.toString(),
    });
    
    if (teamName) {
      params.append('team_name', teamName);
      params.append('isGroup', (isGroup || false).toString());
    }
    
    const url = `${buildBackendUrl('/goals')}?${params}`;
    const response = await fetch(url);
    
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
      throw new Error(`Failed to fetch PI goals: ${errorMessage}`);
    }
    
    return response.json();
  }

  // Create PI Goal (POST)
  async createPIGoal(data: {
    pi: string;
    goal_text: string;
    status?: string;
    priority_bv?: number | null;
    team_name?: string;
    group_name?: string;
    epic_keys?: string[]; // UI may pass epic_keys, we convert to issue_keys
  }): Promise<any> {
    const url = buildBackendUrl('/goals');
    const body: any = {
      scope_type: 'pi',
      pi_name: data.pi,
      goal_text: data.goal_text,
      issue_keys: data.epic_keys || [], // Convert epic_keys to issue_keys
      status: data.status || 'Defined',
    };
    
    if (data.priority_bv !== undefined && data.priority_bv !== null) {
      body.priority_bv = data.priority_bv;
    }
    
    if (data.team_name) {
      body.team_name = data.team_name;
    }
    
    if (data.group_name) {
      body.group_name = data.group_name;
    }
    
    const response = await authFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
      throw new Error(`Failed to create PI goal: ${errorMessage}`);
    }

    return response.json();
  }

  // Update PI Goal (PATCH)
  async updatePIGoal(goalId: number, updates: {
    pi?: string;
    team_name?: string;
    group_name?: string;
    goal_text?: string;
    epic_keys?: string[];
    status?: string;
    priority_bv?: number | null;
  }): Promise<any> {
    const url = `${buildBackendUrl('/goals')}/${goalId}`;
    // Convert epic_keys to issue_keys for backend
    const backendUpdates: any = { ...updates };
    if (backendUpdates.epic_keys !== undefined) {
      backendUpdates.issue_keys = backendUpdates.epic_keys;
      delete backendUpdates.epic_keys;
    }
    
    // Add user email for audit log
    const user = getCurrentUser();
    if (user?.email) {
      backendUpdates.updated_by = user.email;
    }
    
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendUpdates),
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
      throw new Error(`Failed to update PI goal: ${errorMessage}`);
    }

    return response.json();
  }

  // Get Issues (GET)
  async getIssues(params: {
    issue_type?: string;
    team_name?: string;
    group_name?: string;
    pi?: string;
    isGroup?: boolean;
    limit?: number;
  }): Promise<any> {
    const urlParams = new URLSearchParams();
    
    if (params.issue_type) {
      urlParams.append('issue_type', params.issue_type);
    }
    if (params.team_name) {
      urlParams.append('team_name', params.team_name);
    }
    if (params.group_name) {
      urlParams.append('group_name', params.group_name);
    }
    if (params.pi) {
      urlParams.append('pi', params.pi);
    }
    if (params.isGroup !== undefined) {
      urlParams.append('isGroup', params.isGroup.toString());
    }
    if (params.limit) {
      urlParams.append('limit', params.limit.toString());
    }

    const url = `${buildBackendUrl('/issues')}?${urlParams}`;
    const response = await authFetch(url, {
      method: 'GET',
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
      throw new Error(`Failed to fetch issues: ${errorMessage}`);
    }

    return response.json();
  }

  // Get Issues for Scope (for goal selection dialog)
  async getIssuesForScope(params: {
    scope_type: 'pi' | 'sprint' | 'release';
    pi_name?: string;
    sprint_id?: number;
    release_id?: number;
    team_name?: string;
    isGroup?: boolean;
  }): Promise<any> {
    const urlParams = new URLSearchParams({
      scope_type: params.scope_type,
    });
    
    if (params.pi_name) {
      urlParams.append('pi_name', params.pi_name);
    }
    if (params.sprint_id !== undefined) {
      urlParams.append('sprint_id', params.sprint_id.toString());
    }
    if (params.release_id !== undefined) {
      urlParams.append('release_id', params.release_id.toString());
    }
    if (params.team_name) {
      urlParams.append('team_name', params.team_name);
    }
    if (params.isGroup !== undefined) {
      urlParams.append('isGroup', params.isGroup.toString());
    }

    const url = `${buildBackendUrl('/goals/issues-for-scope')}?${urlParams}`;
    const response = await authFetch(url, {
      method: 'GET',
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
      throw new Error(`Failed to fetch issues for scope: ${errorMessage}`);
    }

    return response.json();
  }

  // Update multiple PI Goals from AI to User (PATCH)
  async updatePIGoalsAiToUser(goalIds: number[]): Promise<any> {
    const url = `${buildBackendUrl('/goals/ai-to-user')}`;
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goal_ids: goalIds }),
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
      throw new Error(`Failed to update PI goals: ${errorMessage}`);
    }

    return response.json();
  }

  // Delete PI Goal (DELETE)
  async deletePIGoal(goalId: number): Promise<any> {
    const url = `${buildBackendUrl('/goals')}/${goalId}`;
    const response = await authFetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
      throw new Error(`Failed to delete PI goal: ${errorMessage}`);
    }

    return response.json();
  }

  // Get Available Sprints (for Sprint Goals selection)
  async getAvailableSprints(teamName?: string, isGroup?: boolean): Promise<any> {
    const params = new URLSearchParams();
    
    if (teamName) {
      params.append('team_name', teamName);
      params.append('isGroup', (isGroup || false).toString());
    }
    
    const url = `${buildBackendUrl('/goals/available-sprints')}?${params}`;
    const response = await fetch(url);
    
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
      throw new Error(`Failed to fetch available sprints: ${errorMessage}`);
    }
    
    return response.json();
  }

  // Generate Sprint Goals
  async generateSprintGoals(sprintId: number, teamName?: string, isGroup?: boolean): Promise<any> {
    const url = buildBackendUrl('/goals/generate');
    const body: any = { 
      scope_type: 'sprint',
      sprint_id: sprintId
    };
    
    if (teamName) {
      body.team_name = teamName;
      body.isGroup = isGroup || false;
    }
    
    // Set 90 second timeout for this endpoint only
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorJson.error || errorMessage;
        } catch {
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout: Sprint goals generation took longer than 90 seconds');
      }
      throw err;
    }
  }

  // Get Sprint Goals
  async getSprintGoals(sprintId: number, teamName?: string, isGroup?: boolean, ai: boolean = true): Promise<any> {
    const params = new URLSearchParams({
      scope_type: 'sprint',
      sprint_id: sprintId.toString(),
      ai: ai.toString(),
    });
    
    if (teamName) {
      params.append('team_name', teamName);
      params.append('isGroup', (isGroup || false).toString());
    }
    
    const url = `${buildBackendUrl('/goals')}?${params}`;
    const response = await fetch(url);
    
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
      throw new Error(`Failed to fetch Sprint goals: ${errorMessage}`);
    }
    
    return response.json();
  }

  // Create Sprint Goal (POST)
  async createSprintGoal(data: {
    sprint_id: number;
    goal_text: string;
    status?: string;
    priority_bv?: number | null;
    team_name?: string;
    group_name?: string;
    issue_keys?: string[];
  }): Promise<any> {
    const url = buildBackendUrl('/goals');
    const body: any = {
      scope_type: 'sprint',
      sprint_id: data.sprint_id,
      goal_text: data.goal_text,
      issue_keys: data.issue_keys || [],
      status: data.status || 'Defined',
    };
    
    if (data.priority_bv !== undefined && data.priority_bv !== null) {
      body.priority_bv = data.priority_bv;
    }
    
    if (data.team_name) {
      body.team_name = data.team_name;
    }
    
    if (data.group_name) {
      body.group_name = data.group_name;
    }
    
    const response = await authFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
      throw new Error(`Failed to create Sprint goal: ${errorMessage}`);
    }

    return response.json();
  }

  // Update Sprint Goal (PATCH) - uses same endpoint as PI goals
  async updateSprintGoal(goalId: number, updates: {
    sprint_id?: number;
    team_name?: string;
    group_name?: string;
    goal_text?: string;
    issue_keys?: string[];
    status?: string;
    priority_bv?: number | null;
  }): Promise<any> {
    const url = `${buildBackendUrl('/goals')}/${goalId}`;
    
    // Add user email for audit log
    const backendUpdates: any = { ...updates };
    const user = getCurrentUser();
    if (user?.email) {
      backendUpdates.updated_by = user.email;
    }
    
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendUpdates),
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
      throw new Error(`Failed to update Sprint goal: ${errorMessage}`);
    }

    return response.json();
  }

  // Delete Sprint Goal (DELETE) - uses same endpoint as PI goals
  async deleteSprintGoal(goalId: number): Promise<any> {
    return this.deletePIGoal(goalId); // Reuse same endpoint
  }

  // Update multiple Sprint Goals from AI to User (PATCH) - uses same endpoint
  async updateSprintGoalsAiToUser(goalIds: number[]): Promise<any> {
    return this.updatePIGoalsAiToUser(goalIds); // Reuse same endpoint
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

  async getSystemSettings(): Promise<{
    success: boolean;
    data: {
      settings_by_category: {
        [category: string]: Array<{
          setting_key: string;
          setting_value: string;
          setting_type: string;
          description: string;
          is_encrypted: boolean;
        }>;
      };
      categories: string[];
      count: number;
    };
  }> {
    const url = buildBackendUrl('/settings/getAll');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch system settings: ${response.statusText}`);
    }
    const result = await response.json();
    if (result?.success && result?.data) return result;
    throw new Error('Invalid response format from system settings API');
  }

  async updateSettings(settings: Record<string, any>, updatedBy?: string): Promise<any> {
    // Ensure all values are strings as backend expects Dict[str, str]
    const stringSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      stringSettings[key] = String(value);
    }
    
    const url = buildBackendUrl(API_CONFIG.endpoints.settings.batch);
    // Send object shape expected by backend: { settings: { ... }, updated_by }
    const body = { settings: stringSettings, updated_by: updatedBy || 'ui' };
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update settings: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
    }
    
    const result = await response.json();
    
    // Validate backend response structure
    if (!result || result.success !== true) {
      throw new Error(`Backend returned unsuccessful response: ${JSON.stringify(result)}`);
    }
    
    return result;
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

  async getActiveInsightTypes(): Promise<InsightTypesResponse> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.insightTypes.get)}?active=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch active insight types: ${errorText || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle wrapped response format
    if (result.success && result.data) {
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
        const categoryNames = result.data.categories.map((cat: { insight_category_name: string; class?: string }) => 
          typeof cat === 'string' ? cat : cat.insight_category_name
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
      const categoryNames = result.map((cat: string | { insight_category_name: string; class?: string }) => 
        typeof cat === 'string' ? cat : cat.insight_category_name
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

  async createInsightType(data: {
    insight_type: string;
    insight_description: string;
    insight_categories?: string[];
    active?: boolean;
    cron_config?: {
      day_of_week?: string;
      hour?: number;
      minute?: number;
    } | null;
  }): Promise<InsightType> {
    const url = buildBackendUrl(API_CONFIG.endpoints.insightTypes.update);
    
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
          console.error('Create insight type API error:', response.status, errorText);
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
      throw new Error(`Failed to create insight type: ${errorMessage}`);
    }

    const result: ApiResponse<InsightType> = await response.json();
    
    // Support both wrapped and direct response formats
    if (result.success && result.data) {
      return result.data;
    }
    
    return result as unknown as InsightType;
  }

  async updateInsightType(id: string, data: {
    insight_type?: string;
    insight_description?: string;
    insight_categories?: string[];
    active?: boolean;
    cron_config?: {
      day_of_week?: string;
      hour?: number;
      minute?: number;
    } | null;
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
    

  async getDashboardViewConfigs(): Promise<DashboardViewConfig[]> {
    const response = await fetch('/api/dashboard/views');
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard view configuration: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return this.normalizeDashboardConfigs(data);
  }

  async updateDashboardViewConfigs(configs: DashboardViewConfig[]): Promise<DashboardViewConfig[]> {
    const payload = configs.map((cfg) => ({
      view: cfg.view,
      report_ids: Array.isArray(cfg.reportIds)
        ? cfg.reportIds.filter((id) => id !== null && id !== undefined).map((id) => String(id))
        : [],
      layout_config: cfg.layout_config || undefined,
    }));
    const response = await fetch('/api/dashboard/views', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Failed to update dashboard view configuration: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return this.normalizeDashboardConfigs(data);
  }

  // Groups API
  async getAllGroups(): Promise<{ groups: Group[]; count: number }> {
    const url = buildBackendUrl(API_CONFIG.endpoints.groups.getAll);
    console.log('[getAllGroups] Fetching from URL:', url);
    const response = await authFetch(url);
    console.log('[getAllGroups] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAllGroups] Error response:', errorText);
      throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('[getAllGroups] Raw result:', result);
    
    // Handle both old field names (id, name, parent_id) and new ones (group_key, group_name, parent_group_key)
    const normalizedGroups = (result.data?.groups || []).map((g: any) => ({
      group_key: g.group_key ?? g.id,
      group_name: g.group_name ?? g.name,
      parent_group_key: g.parent_group_key ?? g.parent_id,
      ai_insight: g.ai_insight ?? false,
    }));
    
    console.log('[getAllGroups] Normalized groups:', normalizedGroups);
    return {
      groups: normalizedGroups,
      count: result.data?.count || normalizedGroups.length,
    };
  }

  async getGroups(): Promise<{ groups: string[] }> {
    const url = buildBackendUrl(API_CONFIG.endpoints.groups.getAll);
    const response = await authFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`);
    }

    const result = await response.json();
    // API returns: { success: true, data: { groups: [...], count: number }, message: string }
    if (result && result.success && result.data && Array.isArray(result.data.groups)) {
      const groupNames = result.data.groups.map((g: any) => g.name || g.group_name);
      return { groups: groupNames };
    }
    
    return { groups: [] };
  }

  async createGroup(groupName: string, parentGroupKey?: number | null): Promise<Group> {
    const url = buildBackendUrl(API_CONFIG.endpoints.groups.create);
    const response = await authFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_name: groupName, parent_group_key: parentGroupKey }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create group: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data.group;
  }

  async updateGroup(groupId: number, updates: { group_name?: string; parent_group_key?: number | null; ai_insight?: boolean }): Promise<Group> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.groups.update)}/${groupId}`;
    const body: { group_name?: string; parent_group_key?: number | null; ai_insight?: boolean } = {};
    if (updates.group_name !== undefined) {
      body.group_name = updates.group_name;
    }
    if (updates.parent_group_key !== undefined) {
      body.parent_group_key = updates.parent_group_key;
    }
    if (updates.ai_insight !== undefined) {
      body.ai_insight = updates.ai_insight;
    }
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Failed to update group: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data.group;
  }

  async deleteGroup(groupId: number): Promise<void> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.groups.delete)}/${groupId}`;
    const response = await authFetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete group: ${response.status} ${response.statusText}`);
    }
  }

  async getTeamsInGroup(groupId: number): Promise<{ teams: Team[]; count: number; group_key: number }> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.groups.getTeams)}/${groupId}/teams`;
    const response = await authFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch teams in group: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  // Teams API
  async getAllTeams(groupKey?: number | null, search?: string): Promise<{ teams: Team[]; count: number }> {
    const params = new URLSearchParams();
    if (groupKey !== undefined && groupKey !== null) {
      params.append('group_key', groupKey.toString());
    }
    if (search) {
      params.append('search', search);
    }
    const queryString = params.toString();
    const url = `${buildBackendUrl(API_CONFIG.endpoints.teams.getNames.replace('/getNames', ''))}${queryString ? `?${queryString}` : ''}`;
    console.log('[getAllTeams] Fetching from URL:', url);
    const response = await authFetch(url);
    console.log('[getAllTeams] Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAllTeams] Error response:', errorText);
      throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('[getAllTeams] Result:', result);
    return result.data;
  }

  async updateTeam(teamId: number, groupKeys: number[]): Promise<Team> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.teams.getNames.replace('/getNames', ''))}/${teamId}`;
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_keys: groupKeys }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update team: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data.team;
  }

  async updateTeamDetails(teamId: number, updates: { number_of_team_members?: number; ai_insight?: boolean }): Promise<Team> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.teams.getNames.replace('/getNames', ''))}/${teamId}`;
    const response = await authFetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Failed to update team details: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data.team;
  }

  async batchAssignTeamsToGroup(groupId: number, teamIds: number[]): Promise<{ updated_teams: number }> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.teams.getNames.replace('/getNames', ''))}/batch-assign`;
    const response = await authFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, team_ids: teamIds }),
    });
    if (!response.ok) {
      throw new Error(`Failed to batch assign teams: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async removeTeamFromGroup(teamId: number): Promise<Team> {
    const url = `${buildBackendUrl(API_CONFIG.endpoints.teams.getNames.replace('/getNames', ''))}/${teamId}/group`;
    const response = await authFetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to remove team from group: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    return result.data.team;
  }

  // Issue Types Hierarchy API
  async getIssueTypesHierarchy(): Promise<IssueTypesHierarchyResponse> {
    // Hardcoded endpoint since we're not modifying config.ts
    const url = buildBackendUrl('/issues/issue-types-hierarchy');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch issue types hierarchy: ${response.statusText}`);
    }

    const result: IssueTypesHierarchyResponse = await response.json();
    return result;
  }

  // Issues List API
  async getIssuesList(params: {
    team_name?: string;
    isGroup?: boolean;
    pi?: string;
    issue_type?: string;
    status?: string;
    dependency?: boolean;
    flagged?: boolean;
    sprint_id?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: { issues: any[]; count: number }; message?: string }> {
    const queryParams = new URLSearchParams();
    if (params.team_name) queryParams.append('team_name', params.team_name);
    if (params.isGroup) queryParams.append('isGroup', 'true');
    if (params.pi) queryParams.append('pi', params.pi);
    if (params.issue_type) queryParams.append('issue_type', params.issue_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.dependency !== undefined) queryParams.append('dependency', String(params.dependency));
    if (params.flagged !== undefined) queryParams.append('flagged', String(params.flagged));
    if (params.sprint_id !== undefined) queryParams.append('sprint_id', String(params.sprint_id));
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));

    const url = buildBackendUrl(`/issues/list?${queryParams.toString()}`);
    const response = await authFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch issues list: ${response.statusText}`);
    }

    return await response.json();
  }

  // Get Sprints List API
  async getSprintsList(params: {
    team_name?: string;
    isGroup?: boolean;
    months_back?: number;
  }): Promise<{ success: boolean; data: { sprints: Array<{ sprint_id: number; sprint_name: string; start_date: string | null; end_date: string | null }>; count: number }; message?: string }> {
    const queryParams = new URLSearchParams();
    if (params.team_name) queryParams.append('team_name', params.team_name);
    if (params.isGroup) queryParams.append('isGroup', 'true');
    if (params.months_back !== undefined) queryParams.append('months_back', String(params.months_back));

    const url = buildBackendUrl(`/goals/sprints/list?${queryParams.toString()}`);
    const response = await authFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sprints list: ${response.statusText}`);
    }

    return await response.json();
  }

  // Get Issue from Jira API
  async getIssueFromJira(issueKey: string): Promise<{ success: boolean; data: any; message?: string }> {
    const url = buildBackendUrl(`/issues/jira/${issueKey}`);
    const response = await authFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch issue from Jira: ${response.statusText}`);
    }

    return await response.json();
  }

  // Validation Reports APIs
  async getValidationSummaryMetrics(params?: {
    days_back?: number;
    team_name?: string;
    isGroup?: boolean;
    pi?: string;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.days_back) queryParams.append('days_back', params.days_back.toString());
    if (params?.team_name) queryParams.append('team_name', params.team_name);
    if (params?.isGroup) queryParams.append('isGroup', 'true');
    if (params?.pi) queryParams.append('pi', params.pi);

    const url = buildBackendUrl(`/issues/validations/summary?${queryParams.toString()}`);
    const response = await authFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch validation summary: ${response.statusText}`);
    }

    return await response.json();
  }

  async getValidationIssues(params: {
    validation_type?: string;
    days_back?: number;
    team_name?: string;
    isGroup?: boolean;
    pi?: string;
    hierarchy_level?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.validation_type) queryParams.append('validation_type', params.validation_type);
    if (params.days_back) queryParams.append('days_back', params.days_back.toString());
    if (params.team_name) queryParams.append('team_name', params.team_name);
    if (params.isGroup) queryParams.append('isGroup', 'true');
    if (params.pi) queryParams.append('pi', params.pi);
    if (params.hierarchy_level !== undefined) queryParams.append('hierarchy_level', params.hierarchy_level.toString());

    const url = buildBackendUrl(`/issues/validations/issues?${queryParams.toString()}`);
    const response = await authFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch validation issues: ${response.statusText}`);
    }

    return await response.json();
  }

  async getAuditLogsFilterValues(): Promise<{
    http_methods: string[];
    status_codes: number[];
    severities: string[];
    user_ids: string[];
    actions: string[];
  }> {
    const url = buildBackendUrl('/audit-logs/filter-values');
    const response = await authFetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch audit log filter values: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    
    const result = await response.json();
    // Handle both {success: true, data: {...}} and direct {...} formats
    if (result.success && result.data) {
      return result.data;
    }
    return result;
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

export async function verifySystem(): Promise<boolean> {
  try {
    const api = new ApiService();
    const user = await getCurrentUser();
    const userId = String(user?.id ?? '');
    if (!userId) {
      return false;
    }
    const roles = await getUserRoles(userId);
    return roles.some((role) => role.roleName === 'SYSTEM');
  } catch (error) {
    console.error('[verifySystem] Failed to verify system role:', error);
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

// User Settings API
export type PageType = 'team-dashboard' | 'pi-dashboard' | 'team-insight' | 'pi-insight';

export interface PageSettings {
  layoutConfig?: any;
  topBarFilters?: Record<string, any>;
  reportFilters?: Record<string, Record<string, any>>;
  pinnedFilters?: Record<string, string[]>;
  selectedCategories?: string[];
}

// Alias for backward compatibility
export interface DashboardConfig extends PageSettings {}

export interface UserPageSettings {
  user_id: string;
  page: PageType;
  settings: PageSettings;
  created_at?: string;
  updated_at?: string;
}

// Legacy interface for backward compatibility
export interface UserDashboardSettings {
  user_id: string;
  dashboard_settings?: {
    'team-dashboard'?: DashboardConfig;
    'pi-dashboard'?: DashboardConfig;
  };
  created_at?: string;
  updated_at?: string;
}

export async function getUserDashboardSettings(userId: string): Promise<UserDashboardSettings> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/settings`));
  if (!res.ok) throw new Error('Failed to fetch user settings');
  const data = await res.json();
  return data.data || data;
}

export async function updateUserDashboardSettings(userId: string, settings: Partial<UserDashboardSettings>): Promise<UserDashboardSettings> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/settings`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to update user settings');
  const data = await res.json();
  return data.data || data;
}

// Backend health check with timeout - used on startup
export async function checkBackendHealth(timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const response = await fetch(buildBackendUrl('/health'), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error: any) {
    // Timeout, network error, or abort - backend unavailable
    return false;
  }
}

// New page-based settings functions
export async function getPageSettings(userId: string, page: PageType): Promise<PageSettings | null> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/settings/page/${page}`));
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch page settings');
  }
  const data = await res.json();
  return data.data || data;
}

export async function updatePageSettings(userId: string, page: PageType, settings: PageSettings): Promise<UserPageSettings> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/settings/page/${page}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to update page settings');
  const data = await res.json();
  return data.data || data;
}

// Legacy functions - use new page-based functions internally
export async function getDashboardSettings(userId: string, dashboardType: 'team-dashboard' | 'pi-dashboard'): Promise<DashboardConfig | null> {
  return getPageSettings(userId, dashboardType);
}

export async function updateDashboardSettings(userId: string, dashboardType: 'team-dashboard' | 'pi-dashboard', settings: DashboardConfig): Promise<UserDashboardSettings> {
  const result = await updatePageSettings(userId, dashboardType, settings);
  // Convert to legacy format for backward compatibility
  return {
    user_id: result.user_id,
    dashboard_settings: {
      [dashboardType]: result.settings
    },
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

export async function resetUserSettings(userId: string): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/users/${userId}/settings/reset`), {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to reset user settings');
}

// Meeting Names API
export interface MeetingName {
  id: number;
  name: string;
  team_name?: string;
  is_group: boolean;
  type?: string;
  organizer_email?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingNamesResponse {
  success: boolean;
  data: MeetingName[];
  count: number;
  message?: string;
}

export interface MeetingNameResponse {
  success: boolean;
  data?: MeetingName;
  message?: string;
}

export async function getMeetingNames(includeInactive: boolean = false): Promise<MeetingName[]> {
  const url = buildUserServiceUrl(`/v1/meeting-names${includeInactive ? '?includeInactive=true' : ''}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text() || 'Failed to fetch meeting names');
  const data: MeetingNamesResponse = await res.json();
  return data.data || [];
}

export async function getMeetingName(id: number): Promise<MeetingName> {
  const res = await fetch(buildUserServiceUrl(`/v1/meeting-names/${id}`));
  if (!res.ok) throw new Error(await res.text() || 'Failed to fetch meeting name');
  const data: MeetingNameResponse = await res.json();
  if (!data.data) throw new Error('Meeting name not found');
  return data.data;
}

export async function createMeetingName(meetingName: {
  name: string;
  team_name?: string;
  is_group?: boolean;
  type?: string;
  organizer_email?: string;
  active?: boolean;
}): Promise<MeetingName> {
  const res = await fetch(buildUserServiceUrl('/v1/meeting-names'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meetingName),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to create meeting name');
  const data: MeetingNameResponse = await res.json();
  if (!data.data) throw new Error('Failed to create meeting name');
  return data.data;
}

export async function updateMeetingName(id: number, meetingName: {
  name?: string;
  team_name?: string;
  is_group?: boolean;
  type?: string;
  organizer_email?: string;
  active?: boolean;
}): Promise<MeetingName> {
  const res = await fetch(buildUserServiceUrl(`/v1/meeting-names/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meetingName),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to update meeting name');
  const data: MeetingNameResponse = await res.json();
  if (!data.data) throw new Error('Failed to update meeting name');
  return data.data;
}

export async function deleteMeetingName(id: number): Promise<void> {
  const res = await fetch(buildUserServiceUrl(`/v1/meeting-names/${id}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to delete meeting name');
}

// User Preferences API
export interface UserPreferences {
  user_id: string;
  default_team_or_group?: string | null;
  default_type?: 'team' | 'group' | 'none' | null;
  has_completed_onboarding: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdatePreferencesRequest {
  default_team_or_group?: string | null;
  default_type?: 'team' | 'group' | 'none' | null;
  has_completed_onboarding?: boolean;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/preferences`));
  if (!res.ok) throw new Error('Failed to fetch user preferences');
  const data = await res.json();
  return data.data || data;
}

export async function updateUserPreferences(userId: string, preferences: UpdatePreferencesRequest): Promise<UserPreferences> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/preferences`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to update user preferences');
  const data = await res.json();
  return data.data || data;
}

// Custom Dashboards API
import type { 
  CustomDashboard, 
  DashboardWidget, 
  CreateDashboardRequest, 
  UpdateDashboardRequest,
  DashboardLayoutConfig
} from './config';

export async function getUserDashboards(userId: string): Promise<CustomDashboard[]> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/dashboards`));
  if (!res.ok) throw new Error('Failed to fetch user dashboards');
  const data = await res.json();
  return data.data || [];
}

export async function getDashboard(userId: string, dashboardId: string): Promise<CustomDashboard> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/dashboards/${dashboardId}`));
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  const data = await res.json();
  return data.data || data;
}

export async function createDashboard(userId: string, dashboardData: CreateDashboardRequest): Promise<CustomDashboard> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/dashboards`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dashboardData),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to create dashboard');
  const data = await res.json();
  return data.data || data;
}

export async function updateDashboard(userId: string, dashboardId: string, dashboardData: UpdateDashboardRequest): Promise<CustomDashboard> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/dashboards/${dashboardId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dashboardData),
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to update dashboard');
  const data = await res.json();
  return data.data || data;
}

export async function deleteDashboard(userId: string, dashboardId: string): Promise<void> {
  const res = await authFetch(buildUserServiceUrl(`/users/${userId}/dashboards/${dashboardId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to delete dashboard');
}

// Widget operations are now handled through dashboard updates
// All widget data is stored in layout_config

// Epics by PI API
export interface EpicByPiItem {
  epic_key: string;
  epic_name: string;
  epic_status_category: string;
  dependent_issues_total: number;
  [key: string]: any;
}

export interface EpicsByPiResponse {
  success: boolean;
  data: {
    epics: EpicByPiItem[];
    count: number;
  };
  message?: string;
}

export async function getEpicsByPi(
  pi: string,
  teamName?: string,
  isGroup: boolean = false
): Promise<EpicsByPiResponse> {
  const params = new URLSearchParams({ pi });
  if (teamName) {
    params.append('team_name', teamName);
    if (isGroup) {
      params.append('isGroup', 'true');
    }
  }
  
  const url = buildBackendUrl(`/issues/epics-by-pi?${params.toString()}`);
  const res = await authFetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to fetch epics by PI');
  }
  return await res.json();
}

export async function getEpicsByPiSummary(
  pi: string,
  teamName?: string,
  isGroup: boolean = false
): Promise<EpicsByPiResponse> {
  const params = new URLSearchParams({ pi });
  if (teamName) {
    params.append('team_name', teamName);
    if (isGroup) {
      params.append('isGroup', 'true');
    }
  }
  
  const url = buildBackendUrl(`/issues/epics-by-pi-summary?${params.toString()}`);
  const res = await authFetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to fetch epics by PI summary');
  }
  return await res.json();
}

export async function getDependencyHeatmapStories(
  pi: string,
  owningTeam: string,
  blockingTeam?: string
): Promise<{
  success: boolean;
  data: { issues: any[] };
  message?: string;
}> {
  const params = new URLSearchParams({
    pi,
    owning_team: owningTeam,
  });
  if (blockingTeam) {
    params.append('blocking_team', blockingTeam);
  }
  
  const url = buildBackendUrl(`/issues/dependency-heatmap-stories?${params.toString()}`);
  const res = await authFetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch dependency heatmap stories: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return await res.json();
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

