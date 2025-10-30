import React from 'react';
import { ColumnConfig, EntityConfig } from '@/lib/entityConfig';

interface DataTableProps<T> {
  config: EntityConfig<T>;
  data: T[];
  loading: boolean;
  error: string | null;
  sortConfig: { key: keyof T; direction: 'asc' | 'desc' };
  filterText: string;
  onSort: (key: keyof T) => void;
  onFilterChange: (text: string) => void;
  onViewItem: (item: T) => void;
  onDeleteItem: (item: T) => void;
  onEditItem?: (item: T) => void;
  onCreateItem?: () => void;
  onRefresh: () => void;
  allowEdit?: boolean;
  allowCreate?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  config,
  data,
  loading,
  error,
  sortConfig,
  filterText,
  onSort,
  onFilterChange,
  onViewItem,
  onDeleteItem,
  onEditItem,
  onCreateItem,
  onRefresh,
  allowEdit = false,
  allowCreate = false,
}: DataTableProps<T>) {
  
  // Simple auto-discovery of columns
  const autoDiscoverColumns = (data: T[]): ColumnConfig<T>[] => {
    if (!data || data.length === 0) return [];
    
    return Object.keys(data[0]).map(key => ({
      key: key as keyof T,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      sortable: true,
      searchable: true,
      width: '120px', // Default width
      align: 'left',  // Default alignment
    }));
  };

  // Get final columns (config overrides or auto-discovered)
  const finalColumns = config.columns || autoDiscoverColumns(data);
  
  // Apply column overrides if provided
  if (config.columnOverrides) {
    finalColumns.forEach(col => {
      const override = config.columnOverrides![col.key];
      if (override) {
        Object.assign(col, override);
      }
    });
  }

  // Filter out hidden fields
  const visibleColumns = finalColumns.filter(col => 
    !config.hiddenFields?.includes(col.key)
  );
  
  const SortIcon = ({ columnKey }: { columnKey: keyof T }) => {
    // Show sort indicator for the current sort key or primary key by default
    const isActive = sortConfig.key === columnKey || (sortConfig.key === config.primaryKey && columnKey === config.primaryKey);
    
    if (!isActive) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const SkeletonRow = () => (
    <tr className="border-b border-gray-200">
      {[...Array(visibleColumns.length + 1)].map((_, index) => (
        <td key={index} className={`py-2 px-3 ${
          index < visibleColumns.length ? 'border-r border-gray-200' : 'border-l border-gray-200'
        }`}>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  const formatCellValue = (value: any, key: keyof T, item: T) => {
    if (config.formatCellValue) {
      return config.formatCellValue(value, key, item);
    }
    
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const getCellClassName = (column: ColumnConfig<T>, item: T) => {
    let className = `py-2 px-3 ${
      column.align === 'center' ? 'text-center' : 
      column.align === 'right' ? 'text-right' : 'text-left'
    }`;
    
    // Add field color if configured
    if (config.fieldColors && config.fieldColors[String(column.key)]) {
      className += ` ${config.fieldColors[String(column.key)](item[column.key])}`;
    }
    
    // Add custom column class
    if (column.className) {
      className += ` ${column.className}`;
    }
    
    return className;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
          <div className="flex gap-2">
            {allowCreate && onCreateItem && (
              <button
                onClick={onCreateItem}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Filter ${config.title.toLowerCase()}...`}
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto px-2 border border-gray-200 rounded-md">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              {visibleColumns.map((column, index) => (
                <th 
                  key={String(column.key)}
                  className={`py-2 px-3 font-semibold text-gray-700 ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${
                    index < visibleColumns.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                  onClick={() => column.sortable && onSort(column.key)}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  <div className={`flex items-center gap-1 ${
                    column.align === 'center' ? 'justify-center' : ''
                  }`}>
                    {column.label}
                    {column.sortable && <SortIcon columnKey={column.key} />}
                  </div>
                </th>
              ))}
              <th className="py-2 px-3 text-center text-gray-500 font-semibold border-l border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : error ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-red-600">
                  Error: {error}
                  <div className="text-xs text-gray-500 mt-2">Check console for more details</div>
                </td>
              </tr>
            ) : visibleColumns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">
                  No data available. Waiting for API response...
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className={`border-b border-gray-200 ${
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                }`}>
                  {visibleColumns.map((column, colIndex) => (
                    <td 
                      key={String(column.key)}
                      className={getCellClassName(column, item)}
                    >
                      {column.render 
                        ? column.render(item[column.key], item)
                        : formatCellValue(item[column.key], column.key, item)
                      }
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center border-l border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      {allowEdit && onEditItem && (
                        <button
                          onClick={() => onEditItem(item)}
                          className="text-green-600 hover:text-green-800 transition-colors p-1 rounded hover:bg-green-50"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onViewItem(item)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          No {config.title.toLowerCase()} found.
        </div>
      )}
    </div>
  );
}