'use client';

import type { ReactNode } from 'react';
import type { HierarchyItem } from '@/lib/config';
import type { ColumnConfig, TreeNode } from '../hierarchyTable/types';

export type GanttViewMode = 'month' | 'week' | 'sprint';

export interface GanttConfig {
  /** Field name in HierarchyItem for start date */
  startDateField: string;
  /** Field name in HierarchyItem for end date */
  endDateField: string;
  /** Field name in HierarchyItem for progress percentage (0-100) */
  progressField?: string;
  /** Field name in HierarchyItem for status category (for bar colors) */
  statusCategoryField?: string;
}

export interface SprintData {
  'Sprint name': string;
  'start date': string;
  'end date': string;
}

export interface PIData {
  'PI name': string;
  'start date': string;
  'end date': string;
}

export interface ReleaseData {
  'Release name': string;
  'start date': string;
  'end date': string;
}

export interface HierarchyGanttTableProps {
  data: HierarchyItem[];
  columns: ColumnConfig[];
  defaultExpanded?: boolean;
  onRowClick?: (item: HierarchyItem) => void;
  className?: string;
  expanded?: Record<string, boolean>;
  onExpandedChange?: (expanded: Record<string, boolean>) => void;
  showControls?: boolean;
  jiraUrl?: string;
  /** Mode: 'hierarchy' for pure hierarchy, 'hierarchy-gantt' for with Gantt chart */
  mode?: 'hierarchy' | 'hierarchy-gantt';
  /** Gantt configuration (required when mode is 'hierarchy-gantt') */
  ganttConfig?: GanttConfig;
  /** Initial view mode for Gantt (month, week, or sprint) */
  ganttViewMode?: GanttViewMode;
  /** Callback when Gantt view mode changes */
  onGanttViewModeChange?: (mode: GanttViewMode) => void;
  /** Whether to show milestones (PIs and Releases) */
  showMilestones?: boolean;
  /** Callback when show milestones changes */
  onShowMilestonesChange?: (show: boolean) => void;
  /** Sprint data for sprint view mode */
  sprints?: SprintData[];
  /** PI (Program Increment) data for milestones */
  pis?: PIData[];
  /** Release data for milestones */
  releases?: ReleaseData[];
  /** Initial width of left panel (when mode is 'hierarchy-gantt') */
  leftPanelWidth?: number;
  /** Minimum width of left panel */
  minLeftPanelWidth?: number;
  /** Maximum width of left panel */
  maxLeftPanelWidth?: number;
}

export interface TimelineDate {
  date: Date;
  label: string;
  isWeekStart?: boolean;
  isMonthStart?: boolean;
  monthLabel?: string;
  yearLabel?: string;
  isSprint?: boolean;
  sprintName?: string;
  sprintStartDate?: Date;
  sprintEndDate?: Date;
}



