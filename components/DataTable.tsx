'use client';

import React, { useMemo, useState } from 'react';
import { EntityConfig, ColumnConfig } from '@/lib/entityConfig';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  expandable?: boolean;
  maxLength?: number; // Character limit before showing "read more"
}

export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

// Legacy sort config type for backward compatibility
export type LegacySortConfig<T> = {
  key: keyof T | null;
  direction: 'asc' | 'desc';
};

export interface DataTableProps<T> {
  // New interface props
  data: T[];
  columns?: Column<T>[];
  sortConfig?: SortConfig | LegacySortConfig<T>;
  onSort?: ((key: string) => void) | ((key: keyof T) => void);
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  maxHeight?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
  striped?: boolean;
  hoverable?: boolean;
  
  // Legacy interface props (for backward compatibility)
  config?: EntityConfig<T>;
  onViewItem?: (item: T) => void;
  onDeleteItem?: (item: T) => void;
  onEditItem?: (item: T) => void;
  onCreateItem?: () => void;
  onRefresh?: () => void;
  allowEdit?: boolean;
  allowCreate?: boolean;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns: providedColumns,
  sortConfig: providedSortConfig,
  onSort,
  loading = false,
  error = null,
  emptyMessage = 'No data found.',
  maxHeight = '600px',
  className = '',
  rowKey,
  striped = true,
  hoverable = true,
  // Legacy props
  config,
  onViewItem,
  onDeleteItem,
  onEditItem,
  onCreateItem,
  onRefresh,
  allowEdit,
  allowCreate,
}: DataTableProps<T>) {
  // Convert EntityConfig columns to Column format if config is provided
  const columns: Column<T>[] = useMemo(() => {
    if (providedColumns) {
      return providedColumns;
    }
    
    if (config?.columns) {
      return config.columns.map((col: ColumnConfig<T>) => ({
        key: String(col.key),
        label: col.label,
        align: col.align || 'left',
        sortable: col.sortable !== false,
        width: col.width,
        render: col.render ? (value: any, row: T) => col.render!(value, row) : undefined,
      }));
    }
    
    // Auto-discover columns from data
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      align: 'left' as const,
      sortable: true,
    }));
  }, [providedColumns, config, data]);

  // Add actions column if legacy props are provided
  const finalColumns = useMemo(() => {
    if (onViewItem || onDeleteItem || onEditItem) {
      return [...columns, {
        key: '__actions__',
        label: 'Actions',
        align: 'right' as const,
        sortable: false,
      }];
    }
    return columns;
  }, [columns, onViewItem, onDeleteItem, onEditItem]);

  // Handle sortConfig conversion if using legacy interface
  const sortConfig: SortConfig | undefined = useMemo(() => {
    if (providedSortConfig) {
      return {
        key: providedSortConfig.key === null 
          ? null 
          : typeof providedSortConfig.key === 'string' 
            ? providedSortConfig.key 
            : String(providedSortConfig.key),
        direction: providedSortConfig.direction,
      };
    }
    return undefined;
  }, [providedSortConfig]);
  const sortedData = useMemo(() => {
    if (!sortConfig?.key || !onSort) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, onSort]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const ExpandableCell = ({ content, maxLength = 100 }: { 
    content: React.ReactNode; 
    maxLength?: number;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Convert ReactNode to string for length checking
    let contentString = '';
    let isStringContent = false;
    
    if (typeof content === 'string') {
      contentString = content;
      isStringContent = true;
    } else if (React.isValidElement(content)) {
      // For React elements, try to extract text content
      const textContent = (content as any)?.props?.children;
      if (typeof textContent === 'string') {
        contentString = textContent;
        isStringContent = true;
      }
    } else {
      contentString = String(content);
      isStringContent = true;
    }
    
    const needsTruncation = contentString.length > maxLength;
    
    if (!needsTruncation) {
      return <>{content}</>;
    }
    
    return (
      <div className="relative">
        {isExpanded ? (
          <div className="whitespace-pre-wrap break-words">
            {isStringContent ? contentString : content}
          </div>
        ) : (
          <div 
            className="whitespace-pre-wrap break-words line-clamp-1 overflow-hidden"
            style={{ maxHeight: '1.5rem' }}
          >
            {isStringContent ? (
              <>
                {contentString.substring(0, maxLength)}
                {contentString.length > maxLength && (
                  <span className="opacity-70">...</span>
                )}
              </>
            ) : (
              content
            )}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mt-1 text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
          aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
        >
          {isExpanded ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Read less
            </>
          ) : (
            <>
              Read more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      </div>
    );
  };

  const SkeletonRow = () => (
    <tr className="border-b border-gray-200">
      {finalColumns.map((column, index) => (
        <td key={index} className="py-4 px-4">
          <div className={`h-4 bg-gray-200 rounded animate-pulse ${
            column.align === 'left' ? 'w-3/4' : column.align === 'right' ? 'ml-auto w-1/2' : 'w-16 mx-auto'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 ${className}`}>
      {/* Header with Create Button, Refresh Button, and Filter */}
      {(onCreateItem || onRefresh) && (
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            {onCreateItem && allowCreate && (
              <button
                onClick={onCreateItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap shadow-sm"
                title="Refresh data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Container with Sticky Header */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              {finalColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    column.align === 'left' ? 'text-left' : 
                    column.align === 'right' ? 'text-right' : 
                    'text-center'
                  } ${column.sortable !== false && onSort ? 'cursor-pointer hover:bg-gray-100 transition-colors group' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => {
                    if (column.sortable !== false && onSort && column.key !== '__actions__') {
                      // Call onSort - it accepts both string and keyof T
                      (onSort as (key: string) => void)(column.key);
                    }
                  }}
                >
                  <div className={`flex items-center gap-2 ${
                    column.align === 'right' ? 'justify-end' :
                    column.align === 'left' ? 'justify-start' :
                    'justify-center'
                  }`}>
                    <span>{column.label}</span>
                    {column.sortable !== false && onSort && column.key !== '__actions__' && (
                      <SortIcon columnKey={column.key} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : error ? (
              <tr>
                <td colSpan={finalColumns.length} className="py-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-600 font-medium">{error}</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={finalColumns.length} className="py-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="text-gray-500">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : index}
                  className={`transition-colors ${
                    striped ? (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50') : 'bg-white'
                  } ${hoverable ? 'hover:bg-blue-50/50' : ''}`}
                >
                  {finalColumns.map((column) => {
                    // Handle actions column
                    if (column.key === '__actions__') {
                      return (
                        <td
                          key={column.key}
                          className="px-4 py-3 text-sm text-gray-900 text-right"
                        >
                          <div className="flex items-center justify-end gap-2">
                            {onViewItem && (
                              <button
                                onClick={() => onViewItem(row)}
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                                title="View"
                                aria-label="View"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            )}
                            {onEditItem && (
                              <button
                                onClick={() => onEditItem(row)}
                                className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                                title="Edit"
                                aria-label="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m2 0h2m-6 0H9m10 6l-6 6H9v-4l6-6m4-2a2.121 2.121 0 00-3 0l-1 1 3 3 1-1a2.121 2.121 0 000-3z" />
                                </svg>
                              </button>
                            )}
                            {onDeleteItem && (
                              <button
                                onClick={() => onDeleteItem(row)}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                                title="Delete"
                                aria-label="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }

                    const value = row[column.key];

                    // Auto-format common types
                    const keyLower = String(column.key).toLowerCase();
                    const isDateLikeKey = keyLower.includes('date') || keyLower.endsWith('_at');
                    const isStatusLikeKey = keyLower.includes('status') || keyLower.endsWith('_status');

                    // Date formatter (human readable)
                    const formatHumanDate = (input: any): string => {
                      if (!input) return '-';
                      const d = new Date(input);
                      if (isNaN(d.getTime())) return String(input);
                      // If time part present, show time; else only date
                      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
                      const datePart = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                      const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                      return hasTime ? `${datePart} ${timePart}` : datePart;
                    };

                    // Status badge
                    const renderStatusBadge = (raw: any) => {
                      const val = String(raw ?? '-');
                      const v = val.toLowerCase();
                      let color = 'bg-gray-100 text-gray-800 border-gray-200';
                      if (['success', 'completed', 'done', 'active', 'enabled', 'green', 'ok'].some(s => v.includes(s))) {
                        color = 'bg-green-100 text-green-800 border-green-200';
                      } else if (['warning', 'pending', 'in progress', 'yellow'].some(s => v.includes(s))) {
                        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                      } else if (['failed', 'error', 'red', 'inactive', 'disabled', 'blocked'].some(s => v.includes(s))) {
                        color = 'bg-red-100 text-red-800 border-red-200';
                      } else if (['info', 'blue'].some(s => v.includes(s))) {
                        color = 'bg-blue-100 text-blue-800 border-blue-200';
                      } else if (['open'].some(s => v.includes(s))) {
                        color = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                      } else if (['closed', 'archived'].some(s => v.includes(s))) {
                        color = 'bg-gray-200 text-gray-800 border-gray-300';
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
                          {val}
                        </span>
                      );
                    };

                    // Boolean checkbox renderer
                    const renderBoolean = (checked: boolean) => {
                      return (
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="w-3.5 h-3.5 align-middle accent-blue-600 cursor-default"
                          aria-checked={checked}
                          aria-label={checked ? 'True' : 'False'}
                        />
                      );
                    };

                    // Robust boolean coercion for common representations
                    const deriveBoolean = (val: any): boolean => {
                      if (typeof val === 'boolean') return val;
                      if (typeof val === 'number') return val === 1;
                      if (typeof val === 'string') {
                        const v = val.trim().toLowerCase();
                        if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
                        if (['false', '0', 'no', 'n', 'off', ''].includes(v)) return false;
                      }
                      return false;
                    };

                    // Choose rendering
                    let rendered: React.ReactNode;
                    if (column.render) {
                      rendered = column.render(value, row, index);
                    } else {
                      const isBooleanColumn = (
                        typeof value === 'boolean' ||
                        keyLower.startsWith('is_') ||
                        keyLower.endsWith('_enabled') ||
                        keyLower.endsWith('_flag')
                      );

                      if (isBooleanColumn) {
                        rendered = renderBoolean(deriveBoolean(value));
                      } else if (isDateLikeKey || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
                        rendered = formatHumanDate(value);
                      } else if (isStatusLikeKey) {
                        rendered = renderStatusBadge(value);
                      } else {
                        rendered = value !== null && value !== undefined ? String(value) : '-';
                      }
                    }

                    // Expandable logic
                    const rawValueString = typeof value === 'string' ? value : String(value || '');
                    const isExpandable = column.expandable !== false && (
                      column.expandable === true || 
                      (rawValueString.length > (column.maxLength || 100))
                    );

                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-sm text-gray-900 ${
                          column.align === 'left' ? 'text-left' : 
                          column.align === 'right' ? 'text-right' : 
                          'text-center'
                        } ${isExpandable && column.align !== 'center' ? 'max-w-md' : ''}`}
                      >
                        {isExpandable ? (
                          <ExpandableCell 
                            content={rendered as any}
                            maxLength={column.maxLength || 100}
                          />
                        ) : (
                          rendered
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with row count */}
      {!loading && !error && sortedData.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Showing {sortedData.length} {sortedData.length === 1 ? 'row' : 'rows'}
          </span>
        </div>
      )}
    </div>
  );
}

// Export as both default and named for compatibility
export default DataTable;
export { DataTable };
