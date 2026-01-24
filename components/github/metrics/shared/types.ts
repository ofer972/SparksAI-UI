/**
 * Shared types for GitHub metrics (DORA and PR Workflow)
 */

export interface Repository {
  id: number;
  github_repo_id: number;
  name: string;
  full_name: string;
}

export interface FilterBadge {
  label: string;
  value: string;
}



