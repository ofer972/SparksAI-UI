// Issue Types Configuration
// This will later be replaced with a server endpoint call

export interface IssueType {
  value: string;
  label: string;
}

/**
 * Get the list of available issue types
 * Currently returns hardcoded constants, but will be replaced with server endpoint call
 * @returns Array of issue type objects with value and label
 */
export function getIssueTypes(): IssueType[] {
  return [
    { value: 'Epic', label: 'Epic' },
    { value: 'Story', label: 'Story' },
    { value: 'Task', label: 'Task' },
    { value: 'Bug', label: 'Bug' },
    { value: 'all', label: 'All' }
  ];
}

/**
 * Get the default issue type for different chart types
 * @param chartType - The type of chart (e.g., 'burndown', 'trend')
 * @returns Default issue type value
 */
export function getDefaultIssueType(chartType: 'burndown' | 'trend' = 'burndown'): string {
  switch (chartType) {
    case 'burndown':
      return 'Epic';
    case 'trend':
      return 'Bug';
    default:
      return 'Epic';
  }
}
