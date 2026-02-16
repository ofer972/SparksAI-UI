/**
 * Shared constants for Build Report (bar chart and multi-bar).
 * Single source for bar/segment colors and stack-by option list.
 */

export const BUILD_REPORT_BAR_COLORS: { value: string; label: string }[] = [
  { value: '#dc2626', label: 'Red' },
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#171717', label: 'Black' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#737373', label: 'Gray' },
];

export const BUILD_REPORT_MULTI_BAR_METRICS: { value: string; label: string }[] = [
  { value: 'created', label: 'Issues created' },
  { value: 'resolved', label: 'Issues resolved' },
  { value: 'updated', label: 'Issues updated' },
];

export interface StackByFieldOption {
  column_name: string;
  display_name: string;
}

/**
 * Returns the list of fields that can be used for "Stack by" (dropdown-type + Team/Group).
 * Used by both bar chart and multi-bar so the list is defined in one place.
 */
export function getBuildReportStackByOptions(
  filterableFields: Array<{ column_name: string; display_name: string; filter_type?: string }>
): StackByFieldOption[] {
  const dropdown = filterableFields.filter((f) => f.filter_type === 'dropdown');
  const hasTeam = dropdown.some((f) => f.column_name === 'team_name');
  const teamOption: StackByFieldOption = { column_name: 'team_name', display_name: 'Team/Group' };
  return hasTeam ? dropdown : [...dropdown, teamOption];
}
