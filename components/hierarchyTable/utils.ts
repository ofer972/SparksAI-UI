'use client';

import type { HierarchyItem } from '@/lib/config';
import type { TreeNode } from './types';

export function buildTree(items: HierarchyItem[]): TreeNode[] {
  const itemMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  items.forEach((item) => {
    if (!item.key) {
      return;
    }
    itemMap.set(item.key, {
      ...item,
      children: [],
      level: 0,
      isExpanded: false,
    });
  });

  items.forEach((item) => {
    if (!item.key) {
      return;
    }
    const node = itemMap.get(item.key);
    if (!node) {
      return;
    }

    if (item.parent && itemMap.has(item.parent)) {
      const parent = itemMap.get(item.parent)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
      node.level = parent.level + 1;
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (nodes: TreeNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        node.children.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

export function flattenTree(
  nodes: TreeNode[],
  expandedKeys: Set<string> = new Set(),
  result: TreeNode[] = [],
): TreeNode[] {
  nodes.forEach((node) => {
    result.push(node);

    if (node.children && node.children.length > 0) {
      const isExpanded = node.key ? expandedKeys.has(node.key) : false;
      if (isExpanded) {
        flattenTree(node.children, expandedKeys, result);
      }
    }
  });

  return result;
}

export function getColumnKeys(items: HierarchyItem[]): string[] {
  const keys = new Set<string>();
  items.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (key !== 'key' && key !== 'parent') {
        keys.add(key);
      }
    });
  });
  return Array.from(keys).sort();
}

export function getStatusCategoryColor(statusCategory: string): string {
  const categoryLower = (statusCategory || '').toLowerCase().trim();

  // Done/Completed statuses - Green
  if (
    categoryLower === 'done' ||
    categoryLower === 'closed' ||
    categoryLower === 'resolved' ||
    categoryLower === 'completed' ||
    categoryLower === 'complete'
  ) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
  }

  // In Progress statuses - Blue
  if (
    categoryLower === 'in progress' ||
    categoryLower === 'in-progress' ||
    categoryLower === 'in_progress' ||
    categoryLower === 'in development' ||
    categoryLower === 'in review' ||
    categoryLower === 'in code review' ||
    categoryLower === 'development' ||
    categoryLower === 'review'
  ) {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
  }

  // Testing/QA statuses - Yellow
  if (
    categoryLower === 'testing' ||
    categoryLower === 'in testing' ||
    categoryLower === 'qa' ||
    categoryLower === 'in qa' ||
    categoryLower === 'ready for testing' ||
    categoryLower === 'ready for qa'
  ) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
  }

  // Blocked/On Hold statuses - Red/Orange
  if (
    categoryLower === 'blocked' ||
    categoryLower === 'on hold' ||
    categoryLower === 'paused' ||
    categoryLower === 'waiting'
  ) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
  }

  // Cancelled/Won't Do statuses - Gray
  if (
    categoryLower === 'cancelled' ||
    categoryLower === 'canceled' ||
    categoryLower === "won't do" ||
    categoryLower === 'wont do' ||
    categoryLower === 'rejected'
  ) {
    return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600';
  }

  // To Do/Open/Backlog statuses - Light Blue/Gray
  if (
    categoryLower === 'to do' ||
    categoryLower === 'todo' ||
    categoryLower === 'open' ||
    categoryLower === 'backlog' ||
    categoryLower === 'new' ||
    categoryLower === 'ready'
  ) {
    return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
  }

  // Default - Gray
  return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-600';
}

export function getProgressColor(progress: number | string | null | undefined): string {
  const progressNum =
    typeof progress === 'number' ? progress : typeof progress === 'string' ? parseFloat(progress) : 0;

  if (progressNum === 100) {
    return 'text-green-600 dark:text-green-400 font-semibold';
  }

  return 'text-gray-700 dark:text-slate-300';
}

