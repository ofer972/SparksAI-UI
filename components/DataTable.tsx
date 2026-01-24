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
 maxLength?: number; // Character limit before showing"read more"
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
 width: '120px',
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
 <svg className="w-3 h-3 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
 </svg>
 );
 }
 return sortConfig.direction === 'asc' ? (
 <svg className="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
 </svg>
 ) : (
 <svg className="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 className="mt-1 text-brand hover:text-blue-800 hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 focus:ring-brand rounded"
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
 <tr className="border-b border-outline">
 {finalColumns.map((column, index) => (
 <td key={index} className="py-4 px-4">
 <div className={`h-4 bg-gray-200 bg-surface-elevated rounded animate-pulse ${
 column.align === 'left' ? 'w-3/4' : column.align === 'right' ? 'ml-auto w-1/2' : 'w-16 mx-auto'
 }`}></div>
 </td>
 ))}
 </tr>
 );

 return (
 <div className={`bg-surface rounded-lg shadow-sm border border-outline overflow-hidden h-full max-h-full flex flex-col ${className}`} style={{ padding: 0, margin: 0 }}>
 {/* Header with Create Button, Refresh Button, and Filter */}
 {(onCreateItem || onRefresh) && (
 <div className="p-4 border-b border-outline flex items-center gap-3 flex-shrink-0">
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
 className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap shadow-sm"
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
 <div className="flex-1 overflow-auto min-h-0" style={{ marginBottom: 0, paddingBottom: 0 }}>
 <table className="w-full border-collapse">
 <thead className="bg-surface-elevated border-b border-outline sticky top-0 z-10 shadow-sm">
 <tr>
 {finalColumns.map((column, colIndex) => (
 <th
 key={column.key}
 className={`px-1 text-xs font-semibold text-content-secondary uppercase tracking-tight ${
 column.align === 'left' ? 'text-left' : 
 column.align === 'right' ? 'text-right' : 
 'text-center'
 } ${colIndex < finalColumns.length - 1 ? 'border-r border-outline' : ''} ${column.sortable !== false && onSort ? 'cursor-pointer hover:bg-surface-secondary transition-colors group' : ''}`}
 style={{ width: column.width, minHeight: '48px', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
 onClick={() => {
 if (column.sortable !== false && onSort && column.key !== '__actions__') {
 // Call onSort - it accepts both string and keyof T
 (onSort as (key: string) => void)(column.key);
 }
 }}
 >
 <div className={`flex items-center gap-1.5 ${
 column.align === 'right' ? 'justify-end' :
 column.align === 'left' ? 'justify-start' :
 'justify-center'
 }`}>
 {typeof column.label === 'string' && column.label.includes('\n') ? (
 <span className="leading-tight text-center" style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>
 {column.label}
 </span>
 ) : (
 <span className="leading-tight whitespace-nowrap">
 {column.label}
 </span>
 )}
 {column.sortable !== false && onSort && column.key !== '__actions__' && (
 <SortIcon columnKey={column.key} />
 )}
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="bg-surface divide-y divide-gray-200 divide-outline [&>tr:last-child]:border-b-0">
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
 <span className="text-danger-text font-medium">{error}</span>
 </div>
 </td>
 </tr>
 ) : sortedData.length === 0 ? (
 <tr>
 <td colSpan={finalColumns.length} className="py-8 text-center">
 <div className="flex flex-col items-center justify-center">
 <svg className="w-12 h-12 text-content-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
 </svg>
 <span className="text-content-muted">{emptyMessage}</span>
 </div>
 </td>
 </tr>
 ) : (
 sortedData.map((row, index) => (
 <tr
 key={rowKey ? rowKey(row, index) : index}
 className={`transition-colors ${
 striped ? (index % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/50 bg-surface/50') : 'bg-surface'
 } ${hoverable ? 'hover:bg-blue-50/50 hover:bg-surface-elevated/50' : ''}`}
 >
 {finalColumns.map((column, colIndex) => {
 // Handle actions column
 if (column.key === '__actions__') {
 return (
 <td
 key={column.key}
 className={`px-3 py-2 text-sm text-content-primary text-right ${colIndex < finalColumns.length - 1 ? 'border-r border-outline' : ''}`}
 >
 <div className="flex items-center justify-end gap-1">
 {onViewItem && (
 <button
 onClick={() => onViewItem(row)}
 className="p-1.5 rounded-md hover:bg-brand/10 text-brand transition-all duration-150 border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
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
 className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 text-positive-text transition-all duration-150 border border-transparent hover:border-green-200 dark:hover:border-green-700"
 title="Edit"
 aria-label="Edit"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
 </svg>
 </button>
 )}
 {onDeleteItem && (
 <button
 onClick={() => onDeleteItem(row)}
 className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-danger-text transition-all duration-150 border border-transparent hover:border-red-200 dark:hover:border-red-700"
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
 let color = 'bg-surface-secondary text-content-primary border-outline';
 if (['success', 'completed', 'done', 'active', 'enabled', 'green', 'ok'].some(s => v.includes(s))) {
 color = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
 } else if (['warning', 'pending', 'in progress', 'yellow'].some(s => v.includes(s))) {
 color = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
 } else if (['failed', 'error', 'red', 'inactive', 'disabled', 'blocked'].some(s => v.includes(s))) {
 color = 'bg-danger-bg text-red-800 text-red-300 border-red-200 dark:border-red-700';
 } else if (['info', 'blue'].some(s => v.includes(s))) {
 color = 'bg-brand/20 text-blue-800 dark:text-blue-300 border-blue-200 border-blue-700';
 } else if (['open'].some(s => v.includes(s))) {
 color = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700';
 } else if (['closed', 'archived'].some(s => v.includes(s))) {
 color = 'bg-gray-200 bg-surface-elevated text-content-primary text-content-tertiary border-outline-strong';
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
 className={`px-2 py-2 text-sm text-content-primary ${
 column.align === 'left' ? 'text-left' : 
 column.align === 'right' ? 'text-right' : 
 'text-center'
 } ${colIndex < finalColumns.length - 1 ? 'border-r border-outline' : ''} ${isExpandable && column.align !== 'center' ? 'max-w-md' : ''}`}
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
 <div className="px-4 bg-surface-elevated border-t border-outline flex-shrink-0 flex items-center" style={{ minHeight: '41px', margin: 0, paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: 0, width: '100%', boxSizing: 'border-box' }}>
 <span className="text-xs text-content-muted" style={{ display: 'block', paddingBottom: '0.5rem' }}>
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
