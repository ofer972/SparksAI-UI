'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ClosedSprint } from '../lib/config';
import { useClosedSprints } from '@/hooks';
import DataTable, { Column, SortConfig } from './DataTable';

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get all available columns from the first sprint data
  const columns: Column<ClosedSprint>[] = useMemo(() => {
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
      
      const keyStr = String(key);
      const isLeftAlign = key === 'sprint_name' || key === 'sprint_goal';
      const isExpandable = keyStr === 'sprint_goal';
      
      return {
        key: key,
        label,
        align: isLeftAlign ? 'left' : 'center',
        sortable: true,
        expandable: isExpandable,
        maxLength: isExpandable ? 150 : undefined,
        render: (value: any, row: ClosedSprint) => {
          if (value === null || value === undefined) return '-';
          
          // Format dates
          if (keyStr.includes('date') && typeof value === 'string') {
            return formatDate(value);
          }
          
          // Format sprint goal with line breaks - return as string for expandable cell
          if (keyStr === 'sprint_goal' && typeof value === 'string') {
            return value; // Return as string, let ExpandableCell handle the formatting
          }
          
          // Format completion percentage with specific color coding
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
        },
      };
    });
  }, [sprintsData]);

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
        <div className="space-y-4">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <select
              value={selectedTimePeriod}
              onChange={(e) => setSelectedTimePeriod(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timePeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* DataTable */}
          <DataTable<ClosedSprint>
            data={sprintsData}
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            filterText={filterText}
            onFilterChange={setFilterText}
            filterPlaceholder="Filter by sprint name, velocity, or predictability..."
            loading={isLoading || dataLoading}
            error={error || undefined}
            emptyMessage="No sprints found matching the filter criteria."
            maxHeight="600px"
            rowKey={(row) => row.sprint_id}
            striped={true}
            hoverable={true}
          />
        </div>
      )}
    </div>
  );
}
