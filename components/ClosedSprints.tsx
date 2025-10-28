'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ClosedSprint } from '../lib/config';
import { useClosedSprints } from '@/hooks';

interface ClosedSprintsProps {
  selectedTeam: string;
  isLoading?: boolean;
  isVisible?: boolean;
}

interface TimePeriodOption {
  value: number;
  label: string;
}

export default function ClosedSprints({ selectedTeam, isLoading = false, isVisible = true }: ClosedSprintsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClosedSprint | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(3); // Default to 3 months
  const { sprints: sprintsData, loading: dataLoading, error, refetch } = useClosedSprints(selectedTeam, selectedTimePeriod);

  // Time period options matching the API documentation
  const timePeriodOptions: TimePeriodOption[] = [
    { value: 1, label: 'Last 1 month' },
    { value: 2, label: 'Last 2 months' },
    { value: 3, label: 'Last 3 months' },
    { value: 4, label: 'Last 4 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 9, label: 'Last 9 months' },
  ];

  // Fetch data when team or time period changes
  useEffect(() => {
    if (!isVisible || collapsed) return;
    
    refetch(selectedTeam, selectedTimePeriod);
  }, [isVisible, collapsed, selectedTeam, selectedTimePeriod, refetch]);

  const handleSort = (key: keyof ClosedSprint) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  // Get all available columns from the first sprint data
  const availableColumns = useMemo(() => {
    if (sprintsData.length === 0) return [];
    
    const firstSprint = sprintsData[0];
    return Object.keys(firstSprint).map(key => {
      let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Special handling for completion percentage fields
      if (key === 'completion_percentage' || 
          key === 'completed_percentage' || 
          key === 'completion' ||
          (key.includes('completion') && key.includes('percentage'))) {
        label = 'Completed (%)';
      }
      
      return {
        key: key as keyof ClosedSprint,
        label,
        type: typeof firstSprint[key as keyof ClosedSprint]
      };
    });
  }, [sprintsData]);

  const sortedAndFilteredData = useMemo(() => {
    let data = [...sprintsData];

    // Apply filter - search across all string fields
    if (filterText) {
      data = data.filter(item =>
        Object.values(item).some(value => 
          typeof value === 'string' && value.toLowerCase().includes(filterText.toLowerCase()) ||
          typeof value === 'number' && value.toString().includes(filterText)
        )
      );
    }

    // Apply sort
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [filterText, sortConfig, sprintsData]);

  const SortIcon = ({ columnKey }: { columnKey: keyof ClosedSprint }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400">↕</span>;
    return sortConfig.direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCellValue = (value: any, key: keyof ClosedSprint) => {
    if (value === null || value === undefined) return '-';
    
    // Convert key to string for dynamic checks
    const keyStr = String(key);
    
    // Format dates
    if (keyStr.includes('date') && typeof value === 'string') {
      return formatDate(value);
    }
    
    // Format sprint goal with line breaks
    if (keyStr === 'sprint_goal' && typeof value === 'string') {
      return (
        <div className="whitespace-pre-line text-left">
          {value}
        </div>
      );
    }
    
    // Format completion percentage with specific color coding
    // Check for various possible field names for completion percentage
    if (keyStr === 'completion_percentage' || 
        keyStr === 'completed_percentage' || 
        keyStr === 'completion' ||
        (keyStr.includes('completion') && keyStr.includes('percentage'))) {
      const num = Math.round(Number(value));
      return (
        <span className={`font-bold ${
          num >= 75 ? 'text-green-600' : 
          num >= 50 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {num}%
        </span>
      );
    }
    
    // Format other percentages (like predictability)
    if (keyStr.includes('predictability')) {
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
    
    // Format issue counts with colors
    if (keyStr.includes('issues_done')) {
      return <span className="text-green-600 font-semibold">{value}</span>;
    }
    if (keyStr.includes('issues_remaining')) {
      return <span className="text-red-600 font-semibold">{value}</span>;
    }
    if (keyStr.includes('issues_')) {
      return <span className="text-gray-700">{value}</span>;
    }
    
    // Format velocity
    if (keyStr === 'velocity') {
      return <span className="text-gray-900 font-semibold">{value}</span>;
    }
    
    // Default formatting
    return value;
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-xs text-gray-600">Loading sprints...</span>
    </div>
  );

  const SkeletonRow = () => (
    <tr className="border-b border-gray-100">
      {availableColumns.map((column, index) => (
        <td key={index} className="py-1.5 px-2">
          <div className={`h-3 bg-gray-200 rounded animate-pulse ${
            column.key === 'sprint_name' ? 'w-3/4' : 'w-16 mx-auto'
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
        <h2 className="text-lg font-semibold">Closed Sprints</h2>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {/* Time Period Filter and Search Input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700">Time Period:</label>
              <select
                value={selectedTimePeriod}
                onChange={(e) => setSelectedTimePeriod(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {timePeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Filter by sprint name, velocity, or predictability..."
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
                        column.key === 'sprint_name' || column.key === 'sprint_goal' ? 'text-left' : 'text-center'
                      }`}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className={`flex items-center gap-1 ${
                        column.key === 'sprint_name' || column.key === 'sprint_goal' ? 'justify-start' : 'justify-center'
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
                    <td colSpan={availableColumns.length} className="py-8 text-center text-red-600">
                      Error: {error}
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredData.map((sprint, index) => (
                    <tr key={sprint.sprint_id} className={`border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}>
                      {availableColumns.map((column) => (
                        <td 
                          key={column.key}
                          className={`py-1.5 px-1 ${
                            column.key === 'sprint_name' || column.key === 'sprint_goal' ? 'font-medium text-gray-900 text-left' : 'text-center'
                          }`}
                        >
                          {formatCellValue(sprint[column.key], column.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {sortedAndFilteredData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sprints found matching the filter criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
