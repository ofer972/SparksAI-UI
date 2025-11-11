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
  const categoryLower = (statusCategory || '').toLowerCase();

  if (categoryLower === 'done') {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (categoryLower === 'in progress' || categoryLower === 'in-progress' || categoryLower === 'in_progress') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (categoryLower === 'to do' || categoryLower === 'todo') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getTypeColor(type: string): string {
  const typeLower = (type || '').toLowerCase();

  const colorMap: Record<string, string> = {
    epic: 'bg-purple-100 text-purple-800 border-purple-200',
    story: 'bg-blue-100 text-blue-800 border-blue-200',
    task: 'bg-green-100 text-green-800 border-green-200',
    bug: 'bg-red-100 text-red-800 border-red-200',
  };

  return colorMap[typeLower] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getProgressColor(progress: number | string | null | undefined): string {
  const progressNum =
    typeof progress === 'number' ? progress : typeof progress === 'string' ? parseFloat(progress) : 0;

  if (progressNum === 100) {
    return 'text-green-600 font-semibold';
  }

  return 'text-gray-700';
}

