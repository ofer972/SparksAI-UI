'use client';

import { HierarchyItem } from '@/lib/config';

export interface TreeNode extends HierarchyItem {
  children?: TreeNode[];
  level: number;
  isExpanded?: boolean;
}

export interface ColumnConfig {
  id: string;
  header: string;
  accessorKey?: string;
  renderer?: 'link' | 'badge' | 'text' | 'custom';
  colorMap?: Record<string, string>;
  linkBuilder?: (item: HierarchyItem) => string;
  cell?: (props: { getValue: () => any; row: any; column: any }) => React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
}

export interface HierarchyTableProps {
  data: HierarchyItem[];
  columns: ColumnConfig[];
  defaultExpanded?: boolean;
  onRowClick?: (item: HierarchyItem) => void;
  className?: string;
}

