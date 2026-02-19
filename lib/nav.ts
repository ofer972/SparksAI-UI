export type NavItemId =
  | 'home'
  | 'home-detail'
  | 'team-ai-insights'
  | 'team-dashboard'
  | 'pi-dashboard'
  | 'custom-dashboards'
  | 'custom-dashboard-editor'
  | 'settings'
  | 'general-data'
  | 'create-agent-job'
  | 'upload-transcripts'
  | 'users-admin'
  | 'teams-and-meetings'
  | 'jira-settings'
  | 'github-settings'
  | 'user-settings'
  | 'goal-progress'
  | 'pi-goals'
  | 'sprint-goals'
  | 'github-analysis';

export const VALID_NAV_ITEMS: Set<string> = new Set<NavItemId>([
  'home', 'home-detail', 'team-ai-insights', 'team-dashboard',
  'pi-dashboard', 'custom-dashboards', 'custom-dashboard-editor',
  'settings', 'general-data', 'create-agent-job', 'upload-transcripts',
  'users-admin', 'teams-and-meetings', 'jira-settings', 'github-settings',
  'user-settings', 'goal-progress', 'pi-goals', 'sprint-goals', 'github-analysis',
]);

export type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

