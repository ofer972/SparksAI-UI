'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
          let displayValue = value !== null && value !== undefined ? String(value) : '-';
          
          // Truncate Summary column at 55 characters
          if ((col.id === 'Issue Summary' || col.id === 'summary' || col.id === 'Summary') && displayValue.length > 55) {
            displayValue = displayValue.substring(0, 55) + '..';
          }
          
          return (
            <div
              className="text-sm text-gray-700"
              style={{ paddingLeft: `${level * 20}px` }}
            >
              {displayValue}
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
      minSize: 30,
      maxSize: 30,
    };

    return [expandColumn, ...columnDefs];
  }, [columnDefs, expanded, toggleAllExpanded, toggleExpanded]);

  const table = useReactTable<TreeNode>({
    data: flatData,
    columns: columnsWithExpand,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg max-h-[600px]">
        <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isExpanderColumn = header.id === '__expander';
                  const isKeyColumn = header.id === 'Key' || header.id === 'key';
                  const isPIColumn = header.id === 'quarter_pi';
                  const isTypeColumn = header.id === 'Type' || header.id === 'type';
                  const isTeamNameColumn = header.id === 'Team Name' || header.id === 'team_name';
                  const isStatusColumn = header.id === 'Status' || header.id === 'status';
                  const isSummaryColumn = header.id === 'Issue Summary' || header.id === 'summary' || header.id === 'Summary';
                  const isProgressColumn = header.id === 'Progress%' || header.id === 'Progress (%)' || header.id === 'Epic Progress %';
                  const isDependencyColumn = header.id === 'Dependency';
                  const isFlaggedColumn = header.id === '# Flagged Issues';
                  
                  const headerStyle: React.CSSProperties = {};
                  
                  if (isExpanderColumn) {
                    headerStyle.width = 30;
                    headerStyle.minWidth = 30;
                    headerStyle.maxWidth = 30;
                  } else if (isKeyColumn) {
                    headerStyle.width = 74;
                    headerStyle.minWidth = 74;
                    headerStyle.maxWidth = 74;
                  } else if (isPIColumn) {
                    headerStyle.width = 52;
                    headerStyle.minWidth = 52;
                    headerStyle.maxWidth = 52;
                  } else if (isTypeColumn) {
                    headerStyle.width = 75;
                    headerStyle.minWidth = 75;
                    headerStyle.maxWidth = 75;
                  } else if (isTeamNameColumn) {
                    headerStyle.width = 76;
                    headerStyle.minWidth = 76;
                    headerStyle.maxWidth = 76;
                  } else if (isStatusColumn) {
                    headerStyle.width = 88;
                    headerStyle.minWidth = 88;
                    headerStyle.maxWidth = 88;
                  } else if (isSummaryColumn) {
                    headerStyle.width = 270;
                    headerStyle.minWidth = 270;
                  } else if (isProgressColumn) {
                    headerStyle.width = 66;
                    headerStyle.minWidth = 66;
                    headerStyle.maxWidth = 66;
                  } else if (isDependencyColumn) {
                    headerStyle.width = 63;
                    headerStyle.minWidth = 63;
                    headerStyle.maxWidth = 63;
                  } else if (isFlaggedColumn) {
                    headerStyle.width = 63;
                    headerStyle.minWidth = 63;
                    headerStyle.maxWidth = 63;
                  } else {
                    const columnWidth = header.getSize() === Number.POSITIVE_INFINITY ? undefined : header.getSize();
                    if (columnWidth !== undefined) {
                      headerStyle.width = columnWidth;
                    }
                  }
                  
                  return (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-r border-gray-200"
                      style={headerStyle}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
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
                  {row.getVisibleCells().map((cell) => {
                    const isExpanderColumn = cell.column.id === '__expander';
                    const isKeyColumn = cell.column.id === 'Key' || cell.column.id === 'key';
                    const isPIColumn = cell.column.id === 'quarter_pi';
                    const isTypeColumn = cell.column.id === 'Type' || cell.column.id === 'type';
                    const isTeamNameColumn = cell.column.id === 'Team Name' || cell.column.id === 'team_name';
                    const isStatusColumn = cell.column.id === 'Status' || cell.column.id === 'status';
                    const isSummaryColumn = cell.column.id === 'Issue Summary' || cell.column.id === 'summary' || cell.column.id === 'Summary';
                    const isProgressColumn = cell.column.id === 'Progress%' || cell.column.id === 'Progress (%)' || cell.column.id === 'Epic Progress %';
                    const isDependencyColumn = cell.column.id === 'Dependency';
                    const isFlaggedColumn = cell.column.id === '# Flagged Issues';
                    
                    const cellStyle: React.CSSProperties = {};
                    
                    if (isExpanderColumn) {
                      cellStyle.width = 30;
                      cellStyle.minWidth = 30;
                      cellStyle.maxWidth = 30;
                    } else if (isKeyColumn) {
                      cellStyle.width = 74;
                      cellStyle.minWidth = 74;
                      cellStyle.maxWidth = 74;
                    } else if (isPIColumn) {
                      cellStyle.width = 52;
                      cellStyle.minWidth = 52;
                      cellStyle.maxWidth = 52;
                    } else if (isTypeColumn) {
                      cellStyle.width = 75;
                      cellStyle.minWidth = 75;
                      cellStyle.maxWidth = 75;
                    } else if (isTeamNameColumn) {
                      cellStyle.width = 76;
                      cellStyle.minWidth = 76;
                      cellStyle.maxWidth = 76;
                    } else if (isStatusColumn) {
                      cellStyle.width = 88;
                      cellStyle.minWidth = 88;
                      cellStyle.maxWidth = 88;
                    } else if (isSummaryColumn) {
                      cellStyle.width = 270;
                      cellStyle.minWidth = 270;
                    } else if (isProgressColumn) {
                      cellStyle.width = 66;
                      cellStyle.minWidth = 66;
                      cellStyle.maxWidth = 66;
                    } else if (isDependencyColumn) {
                      cellStyle.width = 63;
                      cellStyle.minWidth = 63;
                      cellStyle.maxWidth = 63;
                    } else if (isFlaggedColumn) {
                      cellStyle.width = 63;
                      cellStyle.minWidth = 63;
                      cellStyle.maxWidth = 63;
                    }
                    
                    return (
                      <td 
                        key={cell.id} 
                        className="px-3 py-2 text-sm text-gray-700 align-top border-r border-gray-200"
                        style={Object.keys(cellStyle).length > 0 ? cellStyle : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
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

