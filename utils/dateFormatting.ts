/**
 * Shared date formatting utilities
 * Used by metric cards for chart labels
 */

/**
 * Formats a date string for chart labels
 * @param period - Date string (ISO format or similar)
 * @returns Formatted date string (e.g., "Jan 15")
 */
export function formatChartDateLabel(period: string): string {
  const date = new Date(period);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}



