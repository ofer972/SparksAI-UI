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
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

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
        size: col.size,
        cell: ({ getValue, row, column }) => {
          const value = getValue();
          const item = row.original as TreeNode;
          const level = item.level || 0;

          // Custom cell renderer
          if (col.cell) {
            return col.cell({ getValue, row, column });
          }

          // Link renderer (Key only - Summary is now text)
          if (col.renderer === 'link' || col.id === 'key' || col.id === 'Key') {
            let linkUrl = col.linkBuilder ? col.linkBuilder(item as HierarchyItem) : `#${item.key}`;

            // For Key column, build JIRA URL
            if ((col.id === 'key' || col.id === 'Key') && item.key) {
              const cleanJiraUrl = getCleanJiraUrl();
              linkUrl = `${cleanJiraUrl}/browse/${item.key}`;
            }

            return (
              <div
                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if ((col.id === 'key' || col.id === 'Key') && item.key) {
                    // Open JIRA link in new tab
                    const cleanJiraUrl = getCleanJiraUrl();
                    window.open(`${cleanJiraUrl}/browse/${item.key}`, '_blank');
                  } else if (onRowClick) {
                    onRowClick(item as HierarchyItem);
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

          // Dependency column - show checkbox only if true
          if (col.id === 'Dependency' || col.accessorKey === 'Dependency') {
            const isDependency = value === true || value === 'true' || String(value).toLowerCase() === 'true';

            if (!isDependency) {
              return <div className="text-center"></div>;
            }

            return (
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded border-2 border-blue-600 bg-blue-50">
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            );
          }

          // Badge renderer with color mapping
          if (col.renderer === 'badge' || col.id === 'status' || col.id === 'type' || col.id === 'status_category' || col.id === 'Status' || col.id === 'Type') {
            let badgeClass = 'px-2 py-1 rounded text-xs font-medium border';
            const colIdLower = String(col.id || '').toLowerCase();

            if (col.colorMap && value) {
              // Explicit color map takes precedence
              badgeClass += ` ${col.colorMap[String(value)] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
            } else if (colIdLower === 'status' || col.id === 'Status') {
              // Status should use status_category colors - no fallback
              // Try multiple possible field names for status_category
              const statusCategory =
                item.status_category ||
                item['Status Category'] ||
                item['status_category'] ||
                item['Status Category of Epic'];

              badgeClass += ` ${getStatusCategoryColor(String(statusCategory || ''))}`;
            } else if (colIdLower === 'status_category') {
              badgeClass += ` ${getStatusCategoryColor(String(value || ''))}`;
            } else if (colIdLower === 'type' || col.id === 'Type') {
              // Type badges (Epic, Story, Task, Bug, etc.) use dedicated type colors
              badgeClass += ` ${getTypeColor(String(value || ''))}`;
            } else {
              badgeClass += ' bg-gray-100 text-gray-800 border-gray-200';
            }

            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                <span className={badgeClass}>
                  {String(value || '-')}
                </span>
              </div>
            );
          }

          // # Flagged Issues - hide if zero
          if (col.id === '# Flagged Issues' || col.accessorKey === '# Flagged Issues') {
            const flaggedCount = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value) : 0);

            if (flaggedCount === 0 || isNaN(flaggedCount)) {
              return <div className="text-center"></div>;
            }

            return (
              <div className="text-center">
                <span className="text-sm text-gray-700">
                  {flaggedCount}
                </span>
              </div>
            );
          }

          // Parent Progress (Progress%) - special handling with color and center alignment
          if (
            col.id === 'Progress%' ||
            col.accessorKey === 'Progress%' ||
            col.id === 'Progress (%)' ||
            col.accessorKey === 'Progress (%)' ||
            col.id === 'Epic Progress %' ||
            col.accessorKey === 'Epic Progress %'
          ) {
            const progressNum =
              typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
            const progressInt = Math.floor(progressNum); // Truncate to integer

            // Show empty if progress is zero or invalid
            if (progressInt === 0 || isNaN(progressInt)) {
              return <div className="text-center"></div>;
            }

            const displayValue = `${progressInt}%`;

            // Get Status field (not status_category)
            const status = item.Status || item.status || '';
            const statusLower = String(status).toLowerCase();

            // Determine color: red bold if Status is "done" and progress is not 100%
            let progressColor = '';
            if ((statusLower === 'done' || statusLower === 'closed') && progressInt !== 100) {
              progressColor = 'text-red-600 font-bold';
            } else if (progressInt === 100) {
              progressColor = 'text-green-600 font-semibold';
            } else {
              progressColor = 'text-gray-700';
            }

            return (
              <div className="text-center">
                <span className={`text-sm ${progressColor}`}>{displayValue}</span>
              </div>
            );
          }

          // Default text renderer with indentation
          return (
            <div
              className="text-sm text-gray-700"
              style={{ paddingLeft: `${level * 20}px` }}
            >
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
      header: () => {
        const hasExpanded = Object.keys(expanded).length > 0 && Object.values(expanded).some((v) => v);
        return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleAllExpanded();
          }}
            className="text-xs text-gray-600 hover:text-gray-800 flex items-center justify-center w-6 h-6"
            title={hasExpanded ? 'Collapse All' : 'Expand All'}
        >
            {hasExpanded ? '▼' : '▶'}
        </button>
        );
      },
      cell: ({ row }) => {
        const item = row.original;
        if (!item.children || item.children.length === 0 || !item.key) {
          return <span className="inline-block w-6 h-6" />;
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
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center w-6 h-6"
            title={isExpanded ? 'Collapse' : 'Expand'}
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
      columnSizing,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      if (!searchValue) return true;

      // Search across all column values
      const item = row.original;
      const searchableValues = Object.values(item)
        .map(v => String(v || '').toLowerCase())
        .join(' ');

      return searchableValues.includes(searchValue);
    },
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Global Filter (can be hidden by parent) */}
      {showControls && (
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isProgressColumn =
                    header.id === 'Progress%' ||
                    header.column.id === 'Progress%' ||
                    header.id === 'Progress (%)' ||
                    header.column.id === 'Progress (%)' ||
                    header.id === 'Epic Progress %';
                  const isFlaggedColumn = header.id === '# Flagged Issues' || header.column.id === '# Flagged Issues';
                  const isDependencyColumn = header.id === 'Dependency' || header.column.id === 'Dependency';
                  const isCenterAligned = isProgressColumn || isFlaggedColumn || isDependencyColumn;
                  return (
                    <th
                      key={header.id}
                      className={`px-1.5 py-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider relative border-r border-gray-200 ${
                        isCenterAligned ? 'text-center' : 'text-left'
                      }`}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-gray-900'
                              : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
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
                <td colSpan={columnsWithExpand.length} className="px-1.5 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isEpic = row.original.Type === 'Epic' || row.original.type === 'Epic';
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 transition-colors ${
                      isEpic
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onRowClick?.(row.original as HierarchyItem)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isProgressColumn =
                        cell.column.id === 'Progress%' || cell.column.id === 'Progress (%)' || cell.column.id === 'Epic Progress %';
                      const isFlaggedColumn = cell.column.id === '# Flagged Issues';
                      const isDependencyColumn = cell.column.id === 'Dependency';
                      const isCenterAligned = isProgressColumn || isFlaggedColumn || isDependencyColumn;
                      return (
                        <td
                          key={cell.id}
                          className={`px-1.5 py-1.5 text-sm border-r border-gray-200 ${
                            isCenterAligned ? 'text-center' : ''
                          }`}
                          style={{
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with row count */}
      <div className="p-4 border-t border-gray-200 text-sm text-gray-600">
        Showing {table.getRowModel().rows.length} of {data.length} items
      </div>
    </div>
  );
};

export default HierarchyTable;

