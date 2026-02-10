// Helper functions for BuildReportTab

export interface SortableField {
  column_name: string;
  display_name: string;
}

/**
 * Sorts fields to show selected fields first (in their current order),
 * then unselected fields alphabetically
 */
export function sortFieldsSelectedFirst<T extends SortableField>(
  fields: T[],
  selectedFieldNames: string[]
): T[] {
  const selected = fields.filter(f => selectedFieldNames.includes(f.column_name));
  const unselected = fields
    .filter(f => !selectedFieldNames.includes(f.column_name))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  return [...selected, ...unselected];
}

