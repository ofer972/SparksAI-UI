/**
 * Color utility functions for UI components
 */

/**
 * Get Tailwind CSS classes for issue type badges
 * @param type - Issue type (Epic, Story, Task, Bug, etc.)
 * @returns Tailwind CSS classes for badge styling
 */
export function getTypeColor(type: string): string {
  const typeLower = (type || '').toLowerCase();

  const colorMap: Record<string, string> = {
    epic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    story: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    // Task should be gray (not green) per new implementation
    task: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-600',
    bug: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
  };

  return colorMap[typeLower] || 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-600';
}

