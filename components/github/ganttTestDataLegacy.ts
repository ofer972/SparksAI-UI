// Test data for gantt-task-react format (Task[] and HierarchyItem[])
import { Task } from 'gantt-task-react';
import type { HierarchyItem } from '@/lib/config';

export interface GanttLegacyTestData {
  ganttTasks: Task[];
  hierarchyItems: HierarchyItem[];
}

export function generateGanttLegacyTestData(): GanttLegacyTestData {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Epic 1
  const epic1Key = 'EPIC-101';
  const epic1Start = new Date(startOfMonth.getTime() + 2 * 24 * 60 * 60 * 1000);
  const epic1End = new Date(startOfMonth.getTime() + 20 * 24 * 60 * 60 * 1000);
  
  // Story 1 (child of Epic 1)
  const story1Key = 'STORY-201';
  const story1Start = new Date(startOfMonth.getTime() + 2 * 24 * 60 * 60 * 1000);
  const story1End = new Date(startOfMonth.getTime() + 8 * 24 * 60 * 60 * 1000);
  
  // Story 2 (child of Epic 1)
  const story2Key = 'STORY-202';
  const story2Start = new Date(startOfMonth.getTime() + 9 * 24 * 60 * 60 * 1000);
  const story2End = new Date(startOfMonth.getTime() + 15 * 24 * 60 * 60 * 1000);
  
  // Story 3 (child of Epic 1)
  const story3Key = 'STORY-203';
  const story3Start = new Date(startOfMonth.getTime() + 16 * 24 * 60 * 60 * 1000);
  const story3End = new Date(startOfMonth.getTime() + 20 * 24 * 60 * 60 * 1000);
  
  // Epic 2
  const epic2Key = 'EPIC-102';
  const epic2Start = new Date(startOfMonth.getTime() + 5 * 24 * 60 * 60 * 1000);
  const epic2End = new Date(startOfMonth.getTime() + 25 * 24 * 60 * 60 * 1000);
  
  // Story 4 (child of Epic 2)
  const story4Key = 'STORY-204';
  const story4Start = new Date(startOfMonth.getTime() + 5 * 24 * 60 * 60 * 1000);
  const story4End = new Date(startOfMonth.getTime() + 12 * 24 * 60 * 60 * 1000);
  
  // Story 5 (child of Epic 2)
  const story5Key = 'STORY-205';
  const story5Start = new Date(startOfMonth.getTime() + 13 * 24 * 60 * 60 * 1000);
  const story5End = new Date(startOfMonth.getTime() + 25 * 24 * 60 * 60 * 1000);
  
  // Milestone
  const milestoneKey = 'MILESTONE-1';
  const milestoneDate = new Date(startOfMonth.getTime() + 15 * 24 * 60 * 60 * 1000);
  
  // Gantt Tasks (gantt-task-react format)
  const ganttTasks: Task[] = [
    {
      id: epic1Key,
      name: 'User Authentication System',
      type: 'project',
      start: epic1Start,
      end: epic1End,
      progress: 45,
      hideChildren: false, // Expanded by default
    },
    {
      id: story1Key,
      name: 'Login Page Implementation',
      type: 'task',
      start: story1Start,
      end: story1End,
      progress: 100,
      project: epic1Key,
    },
    {
      id: story2Key,
      name: 'OAuth Integration',
      type: 'task',
      start: story2Start,
      end: story2End,
      progress: 60,
      project: epic1Key,
      dependencies: [story1Key],
    },
    {
      id: story3Key,
      name: 'Password Reset Flow',
      type: 'task',
      start: story3Start,
      end: story3End,
      progress: 0,
      project: epic1Key,
      dependencies: [story2Key],
    },
    {
      id: epic2Key,
      name: 'Dashboard Redesign',
      type: 'project',
      start: epic2Start,
      end: epic2End,
      progress: 30,
      hideChildren: false, // Expanded by default
    },
    {
      id: story4Key,
      name: 'New Layout Design',
      type: 'task',
      start: story4Start,
      end: story4End,
      progress: 80,
      project: epic2Key,
    },
    {
      id: story5Key,
      name: 'Widget Implementation',
      type: 'task',
      start: story5Start,
      end: story5End,
      progress: 20,
      project: epic2Key,
      dependencies: [story4Key],
    },
    {
      id: milestoneKey,
      name: 'Phase 1 Complete',
      type: 'milestone',
      start: milestoneDate,
      end: milestoneDate,
      progress: 100,
    },
  ];
  
  // Hierarchy Items (for left panel - matches Epic hierarchy format)
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
    },
  ];
  
  return {
    ganttTasks,
    hierarchyItems,
  };
}


