// Test data for unified HierarchyGanttTable component
import type { HierarchyItem } from '@/lib/config';
import { addDays } from 'date-fns';

export interface UnifiedGanttTestData {
  hierarchyItems: HierarchyItem[];
  ganttConfig: {
    startDateField: string;
    endDateField: string;
    progressField: string;
    statusCategoryField: string;
    issueTypeField: string;
  };
}

export function generateUnifiedGanttTestData(): UnifiedGanttTestData {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Epic 1
  const epic1Key = 'EPIC-101';
  const epic1Start = addDays(startOfMonth, 2);
  const epic1End = addDays(startOfMonth, 20);
  
  // Story 1 (child of Epic 1)
  const story1Key = 'STORY-201';
  const story1Start = addDays(startOfMonth, 2);
  const story1End = addDays(startOfMonth, 8);
  
  // Story 2 (child of Epic 1)
  const story2Key = 'STORY-202';
  const story2Start = addDays(startOfMonth, 9);
  const story2End = addDays(startOfMonth, 15);
  
  // Story 3 (child of Epic 1)
  const story3Key = 'STORY-203';
  const story3Start = addDays(startOfMonth, 16);
  const story3End = addDays(startOfMonth, 20);
  
  // Epic 2
  const epic2Key = 'EPIC-102';
  const epic2Start = addDays(startOfMonth, 5);
  const epic2End = addDays(startOfMonth, 25);
  
  // Story 4 (child of Epic 2)
  const story4Key = 'STORY-204';
  const story4Start = addDays(startOfMonth, 5);
  const story4End = addDays(startOfMonth, 12);
  
  // Story 5 (child of Epic 2)
  const story5Key = 'STORY-205';
  const story5Start = addDays(startOfMonth, 13);
  const story5End = addDays(startOfMonth, 25);
  
  // Format dates as ISO strings
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Hierarchy Items
  const hierarchyItems: HierarchyItem[] = [
    // Epic 1
    {
      key: epic1Key,
      parent: null,
      Key: epic1Key,
      'Issue Summary': 'User Authentication System',
      Summary: 'User Authentication System',
      Status: 'In Progress',
      status: 'In Progress',
      Type: 'Epic',
      type: 'Epic',
      'Status Category': 'In Progress',
      status_category: 'In Progress',
      'Progress %': 45,
      'Start Date': formatDate(epic1Start),
      'End Date': formatDate(epic1End),
    },
    // Story 1
    {
      key: story1Key,
      parent: epic1Key,
      Key: story1Key,
      'Issue Summary': 'Login Page Implementation',
      Summary: 'Login Page Implementation',
      Status: 'Done',
      status: 'Done',
      Type: 'Story',
      type: 'Story',
      'Status Category': 'Done',
      status_category: 'Done',
      'Progress %': 100,
      'Start Date': formatDate(story1Start),
      'End Date': formatDate(story1End),
    },
    // Story 2
    {
      key: story2Key,
      parent: epic1Key,
      Key: story2Key,
      'Issue Summary': 'OAuth Integration',
      Summary: 'OAuth Integration',
      Status: 'In Progress',
      status: 'In Progress',
      Type: 'Story',
      type: 'Story',
      'Status Category': 'In Progress',
      status_category: 'In Progress',
      'Progress %': 60,
      'Start Date': formatDate(story2Start),
      'End Date': formatDate(story2End),
    },
    // Story 3
    {
      key: story3Key,
      parent: epic1Key,
      Key: story3Key,
      'Issue Summary': 'Password Reset Flow',
      Summary: 'Password Reset Flow',
      Status: 'To Do',
      status: 'To Do',
      Type: 'Story',
      type: 'Story',
      'Status Category': 'To Do',
      status_category: 'To Do',
      'Progress %': 0,
      'Start Date': formatDate(story3Start),
      'End Date': formatDate(story3End),
    },
    // Epic 2
    {
      key: epic2Key,
      parent: null,
      Key: epic2Key,
      'Issue Summary': 'Dashboard Redesign',
      Summary: 'Dashboard Redesign',
      Status: 'In Progress',
      status: 'In Progress',
      Type: 'Epic',
      type: 'Epic',
      'Status Category': 'In Progress',
      status_category: 'In Progress',
      'Progress %': 30,
      'Start Date': formatDate(epic2Start),
      'End Date': formatDate(epic2End),
    },
    // Story 4
    {
      key: story4Key,
      parent: epic2Key,
      Key: story4Key,
      'Issue Summary': 'New Layout Design',
      Summary: 'New Layout Design',
      Status: 'In Progress',
      status: 'In Progress',
      Type: 'Story',
      type: 'Story',
      'Status Category': 'In Progress',
      status_category: 'In Progress',
      'Progress %': 80,
      'Start Date': formatDate(story4Start),
      'End Date': formatDate(story4End),
    },
    // Story 5
    {
      key: story5Key,
      parent: epic2Key,
      Key: story5Key,
      'Issue Summary': 'Widget Implementation',
      Summary: 'Widget Implementation',
      Status: 'To Do',
      status: 'To Do',
      Type: 'Story',
      type: 'Story',
      'Status Category': 'To Do',
      status_category: 'To Do',
      'Progress %': 0,
      'Start Date': formatDate(story5Start),
      'End Date': formatDate(story5End),
    },
  ];
  
  return {
    hierarchyItems,
    ganttConfig: {
      startDateField: 'Start Date',
      endDateField: 'End Date',
      progressField: 'Progress %',
      statusCategoryField: 'Status Category',
      issueTypeField: 'Type',
    },
  };
}


