// ETL API Configuration and Types for SparksAI-UI
import { authFetch } from './api';

// ETL Settings Types
export interface ETLSettings {
  history_retention_months: number;
  selected_pi_custom_field_id: string | null;
  enable_sync: boolean | string;
  selected_sprint_field_id: string;
  selected_sizing_field_id: string | null;
  selected_team_name_field_id: string | null;
  selected_flagged_field_id: string | null;
  selected_epic_target_completion_field_id: string | null;
  etl_start_months_back: number;
  history_default_backfill_days: number;
  periodic_sync_of_data_minutes: number;
  selected_project_keys: string[] | null;
  selected_custom_fields: string[];
  last_import_timestamp: string | null;
  history_last_backfill_timestamp: string | null;
  etl_last_success_time: string | null;
  field_definitions_yaml_content: string;
  jql_scope?: string | null;
  jira_url?: string | null;
  jira_email?: string | null;
  jira_api_token?: string | null; // Backend won't return this, always null
  jira_cloud?: boolean;
}

export interface ETLSettingsResponse {
  success: boolean;
  data: {
    settings: ETLSettings;
  };
  message: string;
}

// PI Types
export interface PIDefinition {
  start_date: string;
  end_date: string;
  planning_grace_days: number;
  prep_grace_days: number;
}

export interface PIsResponse {
  success: boolean;
  data: {
    pis: { [pi_name: string]: PIDefinition };
  };
  message: string;
}

// Job Status Types
export interface JobProgressDetails {
  message: string;
  processed_count?: number;
  upserted_count?: number;
  progress_percent?: number;
  last_update: string;
  is_error?: boolean;
  api_calls?: number;
  total_expected?: number | string;
}

export interface Job {
  job_id: string;
  job_type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  job_args?: any;
  progress_details: JobProgressDetails;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_details?: string;
}

export interface JobStatusResponse {
  success: boolean;
  data: {
    current_job: Job | null;
    last_finished_job: Job | null;
  };
  message: string;
}

// JIRA Metadata Types
export interface JIRAProjectsResponse {
  success: boolean;
  data: {
    projects: { [key: string]: string };
  };
  message: string;
}

export interface JIRACustomFieldsResponse {
  success: boolean;
  data: {
    custom_fields: { [field_id: string]: string };
  };
  message: string;
}

// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// JIRA Configuration Types
export interface JiraConfigResponse {
  configured: boolean;
  has_url: boolean;
  url_valid: boolean;
  connection_valid: boolean;
  url: string | null;
  error: string | null;
  error_type: string | null;
}

export interface JiraConfigCheckResult {
  configured: boolean;
  backendAvailable: boolean;
  data?: JiraConfigResponse;
  error?: string;
}

/**
 * Build URL for ETL API endpoints
 * Routes through Gateway: /api/v1/etl/{endpoint}
 */
const buildETLUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `/api/v1/etl${cleanEndpoint}`;
};

/**
 * ETL API Service Class
 * Handles all API calls to the ETL-Backend via the Gateway
 */
export class ETLApiService {
  // Settings API
  async getSettings(): Promise<ETLSettings> {
    const response = await authFetch(buildETLUrl('/settings'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.statusText}`);
    }

    const result: ETLSettingsResponse = await response.json();
    return result.data.settings;
  }

  async updateSettings(settings: { [key: string]: any }): Promise<void> {
    const response = await authFetch(buildETLUrl('/settings'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update settings: ${errorText}`);
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const response = await authFetch(buildETLUrl(`/settings/${key}`));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch setting: ${response.statusText}`);
    }

    const result: ApiResponse<{ setting_key: string; setting_value: string | null }> = await response.json();
    return result.data.setting_value;
  }

  async updateSetting(key: string, value: any): Promise<void> {
    const response = await authFetch(buildETLUrl(`/settings/${key}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ setting_value: value }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update setting: ${errorText}`);
    }
  }

  // PI API
  async getPIs(): Promise<{ [pi_name: string]: PIDefinition }> {
    const response = await authFetch(buildETLUrl('/pis'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PIs: ${response.statusText}`);
    }

    const result: PIsResponse = await response.json();
    return result.data.pis;
  }

  async createPI(
    name: string,
    startDate: string,
    endDate: string,
    planningGraceDays: number,
    prepGraceDays: number
  ): Promise<void> {
    const response = await authFetch(buildETLUrl('/pis'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        start_date: startDate,
        end_date: endDate,
        planning_grace_days: planningGraceDays,
        prep_grace_days: prepGraceDays,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create PI: ${errorText}`);
    }
  }

  async updatePI(
    piName: string,
    startDate: string,
    endDate: string,
    planningGraceDays: number,
    prepGraceDays: number
  ): Promise<void> {
    const response = await authFetch(buildETLUrl(`/pis/${piName}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        planning_grace_days: planningGraceDays,
        prep_grace_days: prepGraceDays,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update PI: ${errorText}`);
    }
  }

  async deletePI(piName: string): Promise<void> {
    const response = await authFetch(buildETLUrl(`/pis/${piName}`), {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete PI: ${errorText}`);
    }
  }

  // Jobs API
  async getJobStatus(): Promise<JobStatusResponse['data']> {
    const response = await authFetch(buildETLUrl('/jobs/status'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.statusText}`);
    }

    const result: JobStatusResponse = await response.json();
    return result.data;
  }

  async queueJob(jobType: string, jobArgs?: any): Promise<string> {
    const response = await authFetch(buildETLUrl('/jobs/queue'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_type: jobType,
        job_args: jobArgs,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to queue job: ${errorText}`);
    }

    const result: ApiResponse<{ job_id: string }> = await response.json();
    return result.data.job_id;
  }

  async resetJobsQueue(): Promise<void> {
    const response = await authFetch(buildETLUrl('/jobs/reset'), {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset jobs queue: ${errorText}`);
    }
  }

  async truncateTables(tableNames: string[]): Promise<void> {
    const response = await authFetch(buildETLUrl('/jobs/truncate-tables'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ table_names: tableNames }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to truncate tables: ${errorText}`);
    }
  }

  // JIRA Metadata API
  async getJIRAProjects(): Promise<{ [key: string]: string }> {
    const response = await authFetch(buildETLUrl('/jira/projects'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JIRA projects: ${response.statusText}`);
    }

    const result: JIRAProjectsResponse = await response.json();
    return result.data.projects;
  }

  async getJIRACustomFields(): Promise<{ [field_id: string]: string }> {
    const response = await authFetch(buildETLUrl('/jira/custom-fields'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch custom fields: ${response.statusText}`);
    }

    const result: JIRACustomFieldsResponse = await response.json();
    return result.data.custom_fields;
  }

  async validateJQL(jql: string): Promise<{ valid: boolean; message?: string; errors?: string[]; error?: string }> {
    const response = await authFetch(buildETLUrl('/jira/validate-jql'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jql }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate JQL: ${response.statusText}`);
    }

    const result: ApiResponse<{ valid: boolean; message?: string; errors?: string[]; error?: string }> = await response.json();
    return result.data;
  }

  // History Backfill
  async getLastHistoryBackfill(): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      return settings.history_last_backfill_timestamp;
    } catch (error) {
      console.error('Failed to get last history backfill:', error);
      return null;
    }
  }

  // Health Check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await authFetch(buildETLUrl('/status'), { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // JIRA Configuration Check (reads from database - for startup check)
  async checkJiraConfiguration(): Promise<JiraConfigCheckResult> {
    try {
      // First check if backend is available
      const backendAvailable = await this.checkHealth();
      if (!backendAvailable) {
        // Backend not available - treat as configured to avoid blocking
        return { configured: true, backendAvailable: false };
      }
      
      // Call the jira-is-configured endpoint with POST and empty body
      const response = await authFetch(buildETLUrl('/jira-is-configured'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        // If endpoint fails, treat as backend unavailable
        return { configured: true, backendAvailable: false };
      }
      
      const result: ApiResponse<JiraConfigResponse> = await response.json();
      const configData = result.data;
      
      return {
        configured: configData.configured,
        backendAvailable: true,
        data: configData
      };
    } catch (error: any) {
      // Network errors, timeouts, 503, etc. - backend unavailable
      // Treat as configured to avoid blocking UI
      return { 
        configured: true, 
        backendAvailable: false, 
        error: error.message 
      };
    }
  }

  // JIRA Settings Validation (validates form values - for Validate button)
  async validateJiraSettings(
    jiraUrl: string,
    email: string,
    apiToken: string,
    jiraCloud: boolean
  ): Promise<JiraConfigResponse> {
    const response = await authFetch(buildETLUrl('/jira-is-configured'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jira_url: jiraUrl,
        jira_email: email,
        jira_api_token: apiToken,
        jira_cloud: jiraCloud,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to validate JIRA settings: ${errorText}`);
    }

    const result: ApiResponse<JiraConfigResponse> = await response.json();
    return result.data;
  }
}

// Export singleton instance
export const etlApiService = new ETLApiService();

