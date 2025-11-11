'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table';
import { getCleanJiraUrl, HierarchyItem } from '@/lib/config';
import { ColumnConfig, HierarchyTableProps, TreeNode } from './types';
import { buildTree, flattenTree, getStatusCategoryColor, getTypeColor } from './utils';

export default function HierarchyTable({
  data,
  columns,
  defaultExpanded = false,
  onRowClick,
  className = '',
}: HierarchyTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const tree = useMemo(() => buildTree(data), [data]);

  const expandedKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(expanded).forEach((key) => {
      if ((expanded as Record<string, boolean>)[key]) {
        keys.add(key);
      }
    });
    return keys;
  }, [expanded]);

  const flatData = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => ({
      ...(prev as Record<string, boolean>),
      [key]: !(prev as Record<string, boolean>)[key],
    }));
  }, []);

  const toggleAllExpanded = useCallback(() => {
    if (Object.keys(expanded).length === 0 || Object.values(expanded).every((v) => !v)) {
      const allKeys: ExpandedState = {};
      const collectKeys = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            allKeys[node.key] = true;
            collectKeys(node.children);
          }
        });
      };
      collectKeys(tree);
      setExpanded(allKeys);
    } else {
      setExpanded({});
    }
  }, [expanded, tree]);

  const columnDefs = useMemo<ColumnDef<TreeNode>[]>(() => {
    return columns.map((col) => {
      const accessorKey = col.accessorKey || col.id;

      return {
        id: col.id,
        header: col.header,
        accessorKey,
        minSize: col.minWidth,
        maxSize: col.maxWidth,
        cell: ({ getValue, row, column }) => {
          const value = getValue();
          const item = row.original as TreeNode;
          const level = item.level || 0;

          if (col.cell) {
            return col.cell({ getValue, row, column });
          }

          if (col.renderer === 'link' || col.id === 'key') {
            let linkUrl = col.linkBuilder ? col.linkBuilder(item as HierarchyItem) : `#${item.key}`;
            if (col.id === 'key' && item.key) {
              const cleanJiraUrl = getCleanJiraUrl();
              linkUrl = `${cleanJiraUrl}/browse/${item.key}`;
            }

            return (
              <div
                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (col.id === 'key' && item.key) {
                    const cleanJiraUrl = getCleanJiraUrl();
                    window.open(`${cleanJiraUrl}/browse/${item.key}`, '_blank');
                  } else if (onRowClick) {
                    onRowClick(item);
                  } else if (col.linkBuilder) {
                    window.open(linkUrl, '_blank');
                  }
                }}
                style={{ paddingLeft: `${level * 20}px` }}
              >
                {value || item[accessorKey] || '-'}
              </div>
            );
          }

          if (col.renderer === 'badge' || col.id === 'status' || col.id === 'type') {
            let badgeClass = 'px-2 py-1 rounded text-xs font-medium border';
            if (col.colorMap && value) {
              badgeClass += ` ${col.colorMap[String(value)] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
            } else if (col.id === 'status' || col.id === 'Status') {
              const statusCategory =
                item.status_category ||
                item['Status Category'] ||
                item['Status Category of Epic'] ||
                value;
              badgeClass += ` ${getStatusCategoryColor(String(statusCategory || ''))}`;
            } else if (col.id === 'type') {
              badgeClass += ` ${getTypeColor(String(value || ''))}`;
            } else {
              badgeClass += ' bg-gray-100 text-gray-800 border-gray-200';
            }

            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={badgeClass}>{String(value || '-')}</span>
              </div>
            );
          }

          return (
            <div className="text-sm text-gray-700" style={{ paddingLeft: `${level * 20}px` }}>
              {value !== null && value !== undefined ? String(value) : '-'}
            </div>
          );
        },
      };
    });
  }, [columns, onRowClick]);

  const columnsWithExpand = useMemo<ColumnDef<TreeNode>[]>(() => {
    const expandIcon = (expandedValue: boolean) => (expandedValue ? '▼' : '▶');

    const expandColumn: ColumnDef<TreeNode> = {
      id: 'expand',
      header: () => (
        <button
          onClick={toggleAllExpanded}
          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 transition-colors"
          title="Expand/Collapse All"
        >
          {Object.keys(expanded).length > 0 && Object.values(expanded).some((v) => v) ? '▼' : '▶'}
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = (expanded as Record<string, boolean>)[item.key] || false;

        if (!hasChildren) {
          return <div className="w-6" />;
        }

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(item.key);
            }}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {expandIcon(isExpanded)}
          </button>
        );
      },
      size: 50,
      minSize: 50,
      maxSize: 50,
    };

    return [expandColumn, ...columnDefs];
  }, [columnDefs, expanded, toggleExpanded, toggleAllExpanded]);

  useEffect(() => {
    if (defaultExpanded && Object.keys(expanded).length === 0) {
      toggleAllExpanded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded]);

  const table = useReactTable({
    data: flatData,
    columns: columnsWithExpand,
    state: {
      expanded,
      globalFilter,
    },
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableExpanding: true,
    getSubRows: (row) => row.children,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      if (!searchValue) return true;
      const item = row.original;
      const searchableValues = Object.values(item)
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return searchableValues.includes(searchValue);
    },
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                {headerGroup.headers.map((header) => {
                  const isProgressColumn =
                    header.id === 'Epic Progress %' || header.column.id === 'Epic Progress %';
                  const isCenterAligned = isProgressColumn;
                  return (
                    <th
                      key={header.id}
                      className={`px-1.5 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                        isCenterAligned ? 'text-center' : 'text-left'
                      }`}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-gray-900'
                              : undefined
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? ''}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-gray-500 text-center" colSpan={columnsWithExpand.length}>
                  No hierarchy data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 border-t border-gray-100">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

