'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PIPredictabilityData } from '../lib/config';
import { usePIPredictability } from '@/hooks';
import DataTable, { Column, SortConfig } from './DataTable';

interface PIPredictabilityProps {
  selectedPI: string;
  selectedTeam?: string;
  isLoading?: boolean;
  isVisible?: boolean;
}

export default function PIPredictability({ selectedPI, selectedTeam, isLoading = false, isVisible = true }: PIPredictabilityProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');
  const { data, loading: dataLoading, error } = usePIPredictability(selectedPI, selectedTeam);
  
  // Keep visibility/collapse gating here (no refetch needed, just avoid rendering expensive UI)
  useEffect(() => {
    // no-op: using hook for fetching; visibility handled in render
  }, [isVisible, collapsed]);

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
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get all available columns from the first data row
  const columns: Column<PIPredictabilityData>[] = useMemo(() => {
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
    const cols = filteredKeys.map(key => {
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
      const isLeftAlign = key === 'pi_name' || key === 'team_name';
      
      return {
        key,
        label,
        align: (isLeftAlign ? 'left' : 'center') as 'left' | 'center' | 'right',
        sortable: true,
        order, // Get order from preferred list (used only for sorting columns array)
        render: (value: any, row: PIPredictabilityData) => {
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
        },
      };
    });
    
    // Sort by preferred order, then alphabetically for unmapped columns
    cols.sort((a, b) => {
      const orderA = (a as any).order >= 0 ? (a as any).order : 999;
      const orderB = (b as any).order >= 0 ? (b as any).order : 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.label.localeCompare(b.label);
    });
    
    // Remove order property before returning (it's not part of Column interface)
    return cols.map(({ order, ...col }) => col);
  }, [data]);

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
        {!collapsed && data && Array.isArray(data) && (
          <span className="ml-2 text-sm text-gray-500">
            ({data.length} {data.length === 1 ? 'row' : 'rows'})
          </span>
        )}
      </div>

      {!collapsed && (
        <DataTable<PIPredictabilityData>
          data={data || []}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          filterText={filterText}
          onFilterChange={setFilterText}
          filterPlaceholder="Filter data..."
          loading={isLoading || dataLoading}
          error={error || undefined}
          emptyMessage={error ? undefined : "No data found matching the filter criteria."}
          maxHeight="600px"
          rowKey={(row, index) => `${row.pi_name || 'pi'}-${row.team_name || 'team'}-${index}`}
          striped={true}
          hoverable={true}
        />
      )}
    </div>
  );
}

