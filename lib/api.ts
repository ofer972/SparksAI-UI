export interface BurndownDataPoint {
  snapshot_date: string;
  start_date: string;
  end_date: string;
  remaining_issues: number | null;
  ideal_remaining: number;
  total_issues: number;
  issues_added_on_day: number;
  issues_removed_on_day: number;
  issues_completed_on_day: number;
}

export interface BurndownResponse {
  success: boolean;
  data: {
    sprint_id: number;
    sprint_name: string;
    start_date: string;
    end_date: string;
    burndown_data: BurndownDataPoint[];
    team_name: string;
    issue_type: string;
    total_issues_in_sprint: number;
  };
  message: string;
}

export class BurndownApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://sparksai-backend-production.up.railway.app') {
    this.baseUrl = baseUrl;
  }

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

    const response = await fetch(`${this.baseUrl}/api/v1/team-metrics/sprint-burndown?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch burndown data: ${response.statusText}`);
    }

    return response.json();
  }
}
