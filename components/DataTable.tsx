'use client';

import React, { useMemo, useState } from 'react';

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

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  filterText?: string;
  onFilterChange?: (text: string) => void;
  filterPlaceholder?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  maxHeight?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
  striped?: boolean;
  hoverable?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortConfig,
  onSort,
  filterText = '',
  onFilterChange,
  filterPlaceholder = 'Filter data...',
  loading = false,
  error = null,
  emptyMessage = 'No data found.',
  maxHeight = '600px',
  className = '',
  rowKey,
  striped = true,
  hoverable = true,
}: DataTableProps<T>) {
  const filteredData = useMemo(() => {
    if (!filterText) return data;
    
    return data.filter((row) =>
      Object.values(row).some((value) =>
        typeof value === 'string' && value.toLowerCase().includes(filterText.toLowerCase()) ||
        typeof value === 'number' && value.toString().includes(filterText)
      )
    );
  }, [data, filterText]);

  const sortedData = useMemo(() => {
    if (!sortConfig?.key || !onSort) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, onSort]);

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
      {columns.map((column, index) => (
        <td key={index} className="py-4 px-4">
          <div className={`h-4 bg-gray-200 rounded animate-pulse ${
            column.align === 'left' ? 'w-3/4' : column.align === 'right' ? 'ml-auto w-1/2' : 'w-16 mx-auto'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Filter Input */}
      {onFilterChange && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder={filterPlaceholder}
              value={filterText}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Table Container with Sticky Header */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    column.align === 'left' ? 'text-left' : 
                    column.align === 'right' ? 'text-right' : 
                    'text-center'
                  } ${column.sortable !== false && onSort ? 'cursor-pointer hover:bg-gray-100 transition-colors group' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && onSort ? onSort(column.key) : undefined}
                >
                  <div className={`flex items-center gap-2 ${
                    column.align === 'right' ? 'justify-end' :
                    column.align === 'left' ? 'justify-start' :
                    'justify-center'
                  }`}>
                    <span>{column.label}</span>
                    {column.sortable !== false && onSort && (
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
                <td colSpan={columns.length} className="py-8 text-center">
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
                <td colSpan={columns.length} className="py-8 text-center">
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
                  {columns.map((column) => {
                    const value = row[column.key];
                    const cellContent = column.render
                      ? column.render(value, row, index)
                      : value !== null && value !== undefined
                      ? String(value)
                      : '-';

                    // Check if this column should be expandable
                    // Check the raw value length, not the rendered content
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
                            content={cellContent} 
                            maxLength={column.maxLength || 100}
                          />
                        ) : (
                          cellContent
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
            {filterText && ` (filtered from ${data.length} total)`}
          </span>
        </div>
      )}
    </div>
  );
}
