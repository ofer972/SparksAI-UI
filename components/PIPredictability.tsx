'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { PIPredictabilityData } from '../lib/config';

interface PIPredictabilityProps {
  selectedPI: string;
  selectedTeam?: string;
  isLoading?: boolean;
  isVisible?: boolean;
}

export default function PIPredictability({ selectedPI, selectedTeam, isLoading = false, isVisible = true }: PIPredictabilityProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');
  const [data, setData] = useState<PIPredictabilityData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = new ApiService();

  // Fetch PI Predictability data
  const fetchPIPredictability = async (piName: string, teamName?: string) => {
    if (!piName) {
      console.log('No PI selected, skipping fetch');
      return;
    }
    
    setDataLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getPIPredictability(piName, teamName);
      
      // The API method now returns the predictability_data array directly
      let dataToSet: PIPredictabilityData[] = [];
      
      if (Array.isArray(response)) {
        dataToSet = response;
      } else {
        dataToSet = [];
      }
      
      setData(dataToSet);
    } catch (err) {
      console.error('Error fetching PI predictability:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PI predictability data');
      setData([]);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch data when PI or team changes
  useEffect(() => {
    if (!isVisible || collapsed) return;
    
    fetchPIPredictability(selectedPI, selectedTeam);
  }, [isVisible, collapsed, selectedPI, selectedTeam]);

  const handleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  // Get all available columns from the first data row
  const availableColumns = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    const firstRow = data[0];
    
    if (!firstRow || typeof firstRow !== 'object') {
      return [];
    }
    
    // Define preferred column order
    const preferredOrder = [
      'pi_name',
      'team_name',
      'pi_predictability_percentage',
      'avg_cycle_time_completed_epics_days',
      'total_issues_in_scope',
      'issues_completed_within_pi_dates'
    ];
    
    // Get all keys, filter unwanted ones
    const filteredKeys = Object.keys(firstRow).filter(key => {
      // Filter out unwanted fields
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return (
        label !== 'Issues In Scope Keys' && 
        !key.toLowerCase().includes('issues_in_scope_keys') &&
        label !== 'Completed Issues Keys' &&
        !key.toLowerCase().includes('completed_issues_keys')
      );
    });
    
    // Create column objects
    const columns = filteredKeys.map(key => {
      let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Special handling for Pi Predictability Percentage
      if (label === 'Pi Predictability Percentage') {
        label = 'PI Predictability (%)';
      }
      
      // Special handling for Avg Cycle Time Completed Epics Days
      if (label === 'Avg Cycle Time Completed Epics Days') {
        label = 'Avg Cycle Time Completed Epics (Days)';
      }
      
      const order = preferredOrder.indexOf(key);
      return {
        key,
        label,
        type: typeof firstRow[key],
        order // Get order from preferred list
      };
    });
    
    // Sort by preferred order, then alphabetically for unmapped columns
    columns.sort((a, b) => {
      const orderA = a.order >= 0 ? a.order : 999;
      const orderB = b.order >= 0 ? b.order : 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.label.localeCompare(b.label);
    });
    
    return columns;
  }, [data]);

  const sortedAndFilteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    let result = [...data];

    // Apply filter - search across all fields
    if (filterText) {
      result = result.filter(item =>
        item && typeof item === 'object' && Object.values(item).some(value => 
          typeof value === 'string' && value.toLowerCase().includes(filterText.toLowerCase()) ||
          typeof value === 'number' && value.toString().includes(filterText)
        )
      );
    }

    // Apply sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filterText, sortConfig, data]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400">↕</span>;
    return sortConfig.direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCellValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    
    // Format dates
    if (key.includes('date') && typeof value === 'string') {
      return formatDate(value);
    }
    
    // Format Pi Predictability Percentage as integer
    if (key === 'pi_predictability_percentage' || key.includes('pi_predictability_percentage')) {
      const num = Math.round(Number(value));
      return (
        <span className={`font-semibold ${
          num >= 80 ? 'text-green-600' : 
          num >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {num}%
        </span>
      );
    }
    
    // Format Avg Cycle Time Completed Epics Days with 1 decimal place
    if (key === 'avg_cycle_time_completed_epics_days' || key.includes('avg_cycle_time_completed_epics_days')) {
      const num = Number(value);
      // Lower cycle time is better - color logic (no color for values below 5)
      const colorClass = num < 5 
        ? 'text-gray-900' 
        : num <= 50 
          ? 'text-green-600' 
          : num <= 95 
            ? 'text-yellow-600' 
            : 'text-red-600';
      return (
        <span className={`font-semibold ${colorClass}`}>
          {num.toFixed(1)}
        </span>
      );
    }
    
    // Format other percentages
    if (key.includes('percentage') || key.includes('predictability')) {
      const num = Number(value);
      return (
        <span className={`font-semibold ${
          num >= 80 ? 'text-green-600' : 
          num >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {num}%
        </span>
      );
    }
    
    // Format numbers
    if (typeof value === 'number') {
      return <span className="text-gray-900">{value}</span>;
    }
    
    // Default formatting
    return value;
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-xs text-gray-600">Loading PI predictability data...</span>
    </div>
  );

  const SkeletonRow = () => (
    <tr className="border-b border-gray-100">
      {(availableColumns.length > 0 ? availableColumns : Array(5).fill({ key: '' })).map((column, index) => (
        <td key={index} className="py-1.5 px-2">
          <div className={`h-3 bg-gray-200 rounded animate-pulse ${
            column.key === 'pi_name' ? 'w-3/4' : 'w-16 mx-auto'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center mb-3">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
        >
          {collapsed ? '▼' : '▲'}
        </button>
        <h2 className="text-lg font-semibold">PI Predictability</h2>
        <span className="ml-2 text-sm text-gray-500">
          ({sortedAndFilteredData.length} {sortedAndFilteredData.length === 1 ? 'row' : 'rows'})
        </span>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter data..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {availableColumns.map((column) => (
                    <th 
                      key={column.key}
                      className={`py-1.5 px-1 cursor-pointer hover:bg-gray-50 ${
                        column.key === 'pi_name' ? 'text-left' : 'text-center'
                      }`}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className={`flex items-center gap-1 ${
                        column.key === 'pi_name' ? 'justify-start' : 'justify-center'
                      }`}>
                        {column.label}
                        <SortIcon columnKey={column.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading || dataLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : error ? (
                  <tr>
                    <td colSpan={availableColumns.length || 10} className="py-8 text-center text-red-600">
                      Error: {error}
                      <div className="text-xs text-gray-500 mt-2">Check console for more details</div>
                    </td>
                  </tr>
                ) : availableColumns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500">
                      No data available. Waiting for API response...
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredData.map((row, index) => (
                    <tr key={index} className={`border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      {availableColumns.map((column) => (
                        <td 
                          key={column.key}
                          className={`py-1.5 px-1 ${
                            column.key === 'pi_name' ? 'font-medium text-gray-900 text-left' : 'text-center'
                          }`}
                        >
                          {formatCellValue(row[column.key], column.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {sortedAndFilteredData.length === 0 && !dataLoading && !error && (
            <div className="text-center py-8 text-gray-500">
              No data found matching the filter criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

