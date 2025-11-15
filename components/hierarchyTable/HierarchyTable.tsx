'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table';
import { getCleanJiraUrl } from '@/lib/config';
import type { HierarchyItem } from '@/lib/config';
import type { ColumnConfig, HierarchyTableProps, TreeNode } from './types';
import {
  buildTree,
  flattenTree,
  getProgressColor,
  getStatusCategoryColor,
  getTypeColor,
} from './utils';

const HierarchyTable: React.FC<HierarchyTableProps> = ({
  data,
  columns,
  defaultExpanded = false,
  onRowClick,
  className = '',
  expanded: externalExpanded,
  onExpandedChange,
  showControls = false,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Use external expanded state if provided, otherwise use internal state
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
  // Create a unified setter that handles both internal and external state
  const setExpanded = useCallback((updater: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => {
    if (onExpandedChange) {
      // For external control, compute the new value and call the callback
      const newValue = typeof updater === 'function' ? updater(expanded as ExpandedState) : updater;
      onExpandedChange(newValue as Record<string, boolean>);
    } else {
      // For internal state, pass through to useState setter
      setInternalExpanded(updater);
    }
  }, [onExpandedChange, expanded]);

  useEffect(() => {
    if (defaultExpanded && data.length > 0) {
      const roots = data.filter((item) => !item.parent);
      const expandedState: ExpandedState = {};
      roots.forEach((item) => {
        if (item.key) {
          expandedState[item.key] = true;
        }
      });
      setExpanded(expandedState);
    }
  }, [data, defaultExpanded, setExpanded]);

  const tree = useMemo(() => buildTree(data), [data]);

  const expandedKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.entries(expanded).forEach(([key, value]) => {
      if (value) {
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
  }, [setExpanded]);

  const toggleAllExpanded = useCallback(() => {
    if (Object.keys(expanded).length === 0 || Object.values(expanded).every((v) => !v)) {
      const allKeys: ExpandedState = {};
      const collectKeys = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0 && node.key) {
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
  }, [expanded, tree, setExpanded]);

  const columnDefs = useMemo<ColumnDef<TreeNode>[]>(() => {
    return columns.map((col: ColumnConfig) => {
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
            const cleanJiraUrl = getCleanJiraUrl();
            const targetKey = item.key;
            const href = col.linkBuilder ? col.linkBuilder(item as HierarchyItem) : targetKey ? `${cleanJiraUrl}/browse/${targetKey}` : '#';
            const displayValue =
              value !== null && value !== undefined && value !== '' ? String(value) : targetKey ?? '-';

            return (
              <div
                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                style={{ paddingLeft: `${level * 20}px` }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (targetKey) {
                    window.open(href, '_blank');
                  } else if (onRowClick) {
                    onRowClick(item as HierarchyItem);
                  }
                }}
              >
                {displayValue}
              </div>
            );
          }

          if (col.id === 'Dependency' || col.accessorKey === 'Dependency') {
            const isDependency =
              value === true || value === 'true' || (typeof value === 'string' && value.toLowerCase() === 'true');
            if (!isDependency) {
              return <div className="text-center" />;
            }
            return (
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded border-2 border-blue-600 bg-blue-50">
                  <svg className="w-3 h-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            );
          }

          if (col.renderer === 'badge') {
            const badgeClass =
              col.colorMap && value
                ? col.colorMap[String(value)] ?? 'bg-gray-100 text-gray-800 border-gray-200'
                : 'bg-gray-100 text-gray-800 border-gray-200';

            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${badgeClass}`}>{String(value ?? '-')}</span>
              </div>
            );
          }

          if (col.id === 'status' || col.id === 'Status' || col.id === 'status_category' || col.id === 'Status of Epic') {
            const badgeClass = getStatusCategoryColor(String(value ?? ''));
            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${badgeClass}`}>{String(value ?? '-')}</span>
              </div>
            );
          }

          if (col.id === 'type' || col.id === 'Type') {
            const badgeClass = getTypeColor(String(value ?? ''));
            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${badgeClass}`}>{String(value ?? '-')}</span>
              </div>
            );
          }

          if (col.id === 'Epic Progress %' || col.accessorKey === 'Epic Progress %') {
            const progress = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
            const displayValue = Number.isFinite(progress) ? `${Math.round(progress)}%` : '-';
            const status = item.Status || item.status || '';
            const statusLower = String(status).toLowerCase();
            let className = getProgressColor(progress);

            if ((statusLower === 'done' || statusLower === 'closed') && Math.round(progress) !== 100) {
              className = 'text-red-600 font-bold';
            }

            return (
              <div className="text-center">
                <span className={`text-sm ${className}`}>{displayValue}</span>
              </div>
            );
          }

          if (col.id === '# Flagged Issues' || col.accessorKey === '# Flagged Issues') {
            const flaggedCount = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : 0;
            if (!flaggedCount) {
              return <div className="text-center" />;
            }
            return (
              <div className="text-center">
                <span className="text-sm text-gray-700">{flaggedCount}</span>
              </div>
            );
          }

          return (
            <div className="text-sm text-gray-700" style={{ paddingLeft: `${level * 20}px` }}>
              {value !== null && value !== undefined ? String(value) : '-'}
            </div>
          );
        },
      } satisfies ColumnDef<TreeNode>;
    });
  }, [columns, onRowClick]);

  const columnsWithExpand = useMemo<ColumnDef<TreeNode>[]>(() => {
    if (columnDefs.length === 0) {
      return columnDefs;
    }

    const expandColumn: ColumnDef<TreeNode> = {
      id: '__expander',
      header: () => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleAllExpanded();
          }}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          Expand/Collapse
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        if (!item.children || item.children.length === 0 || !item.key) {
          return <span className="inline-block w-4" />;
        }
        const key = item.key;
        const expandedRecord = expanded as Record<string, boolean>;
        const isExpanded = key ? Boolean(expandedRecord[key]) : false;
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (key) {
                toggleExpanded(key);
              }
            }}
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        );
      },
      minSize: 40,
      maxSize: 50,
    };

    return [expandColumn, ...columnDefs];
  }, [columnDefs, expanded, toggleAllExpanded, toggleExpanded]);

  const table = useReactTable<TreeNode>({
    data: flatData,
    columns: columnsWithExpand,
    state: {
      globalFilter,
      expanded,
    },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showControls && (
        <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search..."
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={toggleAllExpanded}
            className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
          >
            {Object.keys(expanded).length === 0 ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
        <div className="text-sm text-gray-500">Rows: {flatData.length}</div>
      </div>
      )}

      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200"
                    style={{ width: header.getSize() === Number.POSITIVE_INFINITY ? undefined : header.getSize() }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getAllColumns().length} className="px-3 py-6 text-center text-sm text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick?.(row.original as HierarchyItem)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-sm text-gray-700 align-top">
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
};

export default HierarchyTable;

