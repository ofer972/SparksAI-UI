'use client';

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, addDays, differenceInDays } from 'date-fns';
import type { HierarchyItem } from '@/lib/config';
import type { GanttConfig, GanttViewMode, TimelineDate } from './types';

/**
 * Get bar color based on status category for stories/tasks/bugs
 * Colors match status badge background colors but slightly more green for done
 */
export function getStoryBarColor(statusCategory: string | null | undefined): string {
  const category = (statusCategory || '').toLowerCase().trim();
  
  // Done/Completed statuses - Green (slightly more green than bg-green-100)
  if (
    category === 'done' ||
    category === 'closed' ||
    category === 'resolved' ||
    category === 'completed' ||
    category === 'complete'
  ) {
    return '#86efac'; // green-300 (more green than bg-green-100 which is #dcfce7)
  }
  
  // In Progress statuses - Blue (deeper blue shades)
  if (
    category === 'in progress' ||
    category === 'in-progress' ||
    category === 'in_progress' ||
    category === 'in development' ||
    category === 'in review' ||
    category === 'in code review' ||
    category === 'development' ||
    category === 'review'
  ) {
    return '#60a5fa'; // blue-400 (deeper, more saturated blue)
  }
  
  // To Do or default - Dark gray for better visibility
  return '#6b7280'; // gray-500 (dark gray)
}

/**
 * Calculate timeline dates for month view
 * Shows only months (no days, no year)
 */
export function calculateMonthTimeline(startDate: Date, endDate: Date): TimelineDate[] {
  const dates: TimelineDate[] = [];
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  months.forEach((monthStart) => {
    // Add only month header (no days)
    dates.push({
      date: monthStart,
      label: format(monthStart, 'MMMM'),
      monthLabel: format(monthStart, 'MMMM'),
      isMonthStart: true,
    });
  });
  
  return dates;
}

/**
 * Calculate timeline dates for week view
 * Shows only week start dates in short format (e.g., "Jan 3")
 */
export function calculateWeekTimeline(startDate: Date, endDate: Date): TimelineDate[] {
  const dates: TimelineDate[] = [];
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 0 } // Sunday
  );
  
  weeks.forEach((weekStart) => {
    // Add only week start date in short format (e.g., "Jan 3")
    dates.push({
      date: weekStart,
      label: format(weekStart, 'MMM d'),
      isWeekStart: true,
    });
  });
  
  return dates;
}

/**
 * Calculate timeline dates for sprint view
 * Shows only sprints, no gap filling with weeks/months
 */
export function calculateSprintTimeline(
  sprints: Array<{ 'Sprint name': string; 'start date': string; 'end date': string }>,
  minDate: Date,
  maxDate: Date
): TimelineDate[] {
  const dates: TimelineDate[] = [];
  
  if (!sprints || sprints.length === 0) {
    // If no sprints, return empty array
    return [];
  }
  
  // Only add sprints, no gap filling
  sprints.forEach((sprint) => {
    const sprintStart = new Date(sprint['start date']);
    const sprintEnd = new Date(sprint['end date']);
    
    // Add sprint
    dates.push({
      date: sprintStart,
      label: sprint['Sprint name'],
      isSprint: true,
      sprintName: sprint['Sprint name'],
      sprintStartDate: sprintStart,
      sprintEndDate: sprintEnd,
    });
  });
  
  return dates;
}

/**
 * Get timeline dates based on view mode
 */
export function getTimelineDates(
  items: HierarchyItem[],
  ganttConfig: GanttConfig,
  viewMode: GanttViewMode,
  sprints?: Array<{ 'Sprint name': string; 'start date': string; 'end date': string }>
): TimelineDate[] {
  // Find min and max dates from all items
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  
  items.forEach((item) => {
    const startDateStr = (item as any)[ganttConfig.startDateField];
    const endDateStr = (item as any)[ganttConfig.endDateField];
    
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      if (!minDate || startDate < minDate) {
        minDate = startDate;
      }
    }
    
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      if (!maxDate || endDate > maxDate) {
        maxDate = endDate;
      }
    }
  });
  
  // For sprint mode, also consider sprint dates
  if (viewMode === 'sprint' && sprints && sprints.length > 0) {
    sprints.forEach((sprint) => {
      const sprintStart = new Date(sprint['start date']);
      const sprintEnd = new Date(sprint['end date']);
      if (!minDate || sprintStart < minDate) {
        minDate = sprintStart;
      }
      if (!maxDate || sprintEnd > maxDate) {
        maxDate = sprintEnd;
      }
    });
  }
  
  if (!minDate || !maxDate) {
    // Default to current month if no dates found
    const now = new Date();
    minDate = startOfMonth(now);
    maxDate = endOfMonth(now);
  }
  
  // Add some padding
  minDate = addDays(minDate, -7);
  maxDate = addDays(maxDate, 7);
  
  if (viewMode === 'month') {
    return calculateMonthTimeline(minDate, maxDate);
  } else if (viewMode === 'sprint') {
    return calculateSprintTimeline(sprints || [], minDate, maxDate);
  } else {
    return calculateWeekTimeline(minDate, maxDate);
  }
}

/**
 * Calculate bar position and width for a task
 */
export function calculateBarPosition(
  item: HierarchyItem,
  ganttConfig: GanttConfig,
  timelineStart: Date,
  columnWidth: number,
  timelineDates: TimelineDate[],
  viewMode: GanttViewMode
): { left: number; width: number } | null {
  const startDateStr = (item as any)[ganttConfig.startDateField];
  const endDateStr = (item as any)[ganttConfig.endDateField];
  
  // Explicitly check for null, undefined, or empty string
  if (startDateStr == null || endDateStr == null || startDateStr === '' || endDateStr === '') {
    return null;
  }
  
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }
  
  // Find which column the start date falls into
  let startColumnIndex = -1;
  let endColumnIndex = -1;
  
  for (let i = 0; i < timelineDates.length; i++) {
    const timelineDate = timelineDates[i];
    const colDate = timelineDate.date;
    
    if (viewMode === 'sprint' && timelineDate.isSprint && timelineDate.sprintStartDate && timelineDate.sprintEndDate) {
      // For sprint view, check if the task's date range overlaps with the sprint
      // A sprint overlaps if: sprintStart <= taskEnd && sprintEnd >= taskStart
      const sprintStart = timelineDate.sprintStartDate;
      const sprintEnd = timelineDate.sprintEndDate;
      
      const sprintOverlaps = sprintStart <= endDate && sprintEnd >= startDate;
      
      if (sprintOverlaps) {
        // First overlapping sprint becomes the start column
        if (startColumnIndex === -1) {
          startColumnIndex = i;
        }
        // Last overlapping sprint becomes the end column
        endColumnIndex = i;
      }
    } else if (viewMode === 'month') {
      // For month view, check if date falls within the month
      const monthStart = startOfMonth(colDate);
      const monthEnd = endOfMonth(colDate);
      
      if (startColumnIndex === -1 && startDate >= monthStart && startDate <= monthEnd) {
        startColumnIndex = i;
      }
      if (endDate >= monthStart && endDate <= monthEnd) {
        endColumnIndex = i;
      }
    } else {
      // For week view, check if date falls within the week
      const weekStart = startOfWeek(colDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(colDate, { weekStartsOn: 0 });
      
      if (startColumnIndex === -1 && startDate >= weekStart && startDate <= weekEnd) {
        startColumnIndex = i;
      }
      if (endDate >= weekStart && endDate <= weekEnd) {
        endColumnIndex = i;
      }
    }
  }
  
  if (startColumnIndex === -1) {
    return null;
  }
  
  // If end column not found, use the last column
  if (endColumnIndex === -1) {
    endColumnIndex = timelineDates.length - 1;
  }
  
  // If start and end are the same (short bar for items without dates), use minimum width
  const isSameDate = startDateStr === endDateStr;
  
  let left: number;
  let width: number;
  
  if (viewMode === 'month') {
    // Calculate exact position within months
    const startMonthDate = timelineDates[startColumnIndex].date;
    const startMonthStart = startOfMonth(startMonthDate);
    const startMonthEnd = endOfMonth(startMonthDate);
    const startMonthDays = differenceInDays(startMonthEnd, startMonthStart) + 1;
    
    // Calculate offset within the start month (0 to 1)
    const startDayOffset = Math.max(0, differenceInDays(startDate, startMonthStart));
    const startOffsetRatio = startDayOffset / startMonthDays;
    
    // Calculate position in the end month
    const endMonthDate = timelineDates[endColumnIndex].date;
    const endMonthStart = startOfMonth(endMonthDate);
    const endMonthEnd = endOfMonth(endMonthDate);
    const endMonthDays = differenceInDays(endMonthEnd, endMonthStart) + 1;
    
    // Calculate offset within the end month (0 to 1)
    const endDayOffset = Math.min(endMonthDays - 1, differenceInDays(endDate, endMonthStart));
    const endOffsetRatio = (endDayOffset + 1) / endMonthDays; // +1 to include the end day
    
    // Calculate left position: start column position + offset within that month
    left = startColumnIndex * columnWidth + startOffsetRatio * columnWidth;
    
    // Calculate width: spans from start offset to end offset across all columns
    const fullColumnsWidth = (endColumnIndex - startColumnIndex) * columnWidth;
    const endColumnOffset = endOffsetRatio * columnWidth;
    width = fullColumnsWidth - (startOffsetRatio * columnWidth) + endColumnOffset;
  } else if (viewMode === 'week') {
    // Calculate exact position within weeks
    const startWeekDate = timelineDates[startColumnIndex].date;
    const startWeekStart = startOfWeek(startWeekDate, { weekStartsOn: 0 });
    
    // Calculate offset within the start week (0 to 6 days)
    const startDayOffset = Math.max(0, differenceInDays(startDate, startWeekStart));
    const startOffsetRatio = startDayOffset / 7;
    
    // Calculate position in the end week
    const endWeekDate = timelineDates[endColumnIndex].date;
    const endWeekStart = startOfWeek(endWeekDate, { weekStartsOn: 0 });
    
    // Calculate offset within the end week (0 to 6 days)
    const endDayOffset = Math.min(6, differenceInDays(endDate, endWeekStart));
    const endOffsetRatio = (endDayOffset + 1) / 7; // +1 to include the end day
    
    // Calculate left position: start column position + offset within that week
    left = startColumnIndex * columnWidth + startOffsetRatio * columnWidth;
    
    // Calculate width: spans from start offset to end offset across all columns
    const fullColumnsWidth = (endColumnIndex - startColumnIndex) * columnWidth;
    const endColumnOffset = endOffsetRatio * columnWidth;
    width = fullColumnsWidth - (startOffsetRatio * columnWidth) + endColumnOffset;
  } else {
    // Sprint mode: use full column width (sprints are already handled above)
    const columnSpan = endColumnIndex - startColumnIndex + 1;
    left = startColumnIndex * columnWidth;
    width = columnSpan * columnWidth;
  }
  
  // Apply minimum width and handle same-date case
  if (isSameDate) {
    width = 10; // Short bar for items without dates
  } else {
    width = Math.max(width, 10); // Minimum 10px width
  }
  
  return { left, width };
}

/**
 * Get progress percentage from item
 */
export function getProgress(item: HierarchyItem, ganttConfig: GanttConfig): number {
  if (!ganttConfig.progressField) {
    return 0;
  }
  
  const progress = (item as any)[ganttConfig.progressField];
  if (typeof progress === 'number') {
    return Math.max(0, Math.min(100, progress));
  }
  if (typeof progress === 'string') {
    const parsed = parseFloat(progress);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
  }
  return 0;
}

/**
 * Get bar color for an item based on status category
 * All hierarchy levels use the same color logic based on status category
 * PIs use light purple color
 */
export function getBarColor(item: HierarchyItem, ganttConfig: GanttConfig): string {
  // Check if this is a PI item
  if ((item as any).isPI) {
    return '#c084fc'; // light purple (purple-400)
  }
  
  const statusCategory = ganttConfig.statusCategoryField ? (item as any)[ganttConfig.statusCategoryField] : null;
  
  // All hierarchy levels use the same status category colors
  return getStoryBarColor(statusCategory);
}

