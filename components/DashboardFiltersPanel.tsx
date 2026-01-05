'use client';

import React, { useState } from 'react';
import TreeSelect from './TreeSelect';

interface DashboardFiltersPanelProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onClose: () => void;
}

export default function DashboardFiltersPanel({
  filters,
  onFiltersChange,
  onClose,
}: DashboardFiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);
  const [selectedTreeType, setSelectedTreeType] = useState<'team' | 'group'>('team');
  const [selectedTreeValue, setSelectedTreeValue] = useState<string | null>(
    filters.selectedTreeValue || null
  );
  const [selectedPI, setSelectedPI] = useState<string>(filters.selectedPI || '');

  const handleTreeSelect = (value: string | null, label: string, type: 'team' | 'group') => {
    setSelectedTreeValue(value);
    setSelectedTreeType(type);
    
    const updatedFilters = {
      ...localFilters,
      selectedTreeType: type,
      selectedTreeValue: value,
      selectedTreeLabel: label,
      selectedTeam: type === 'team' && value ? (value.includes(':') ? value.split(':')[1] : value) : '',
      selectedGroup: type === 'group' && value ? (value.includes(':') ? value.split(':')[1] : value) : '',
    };
    
    setLocalFilters(updatedFilters);
  };

  const handlePIChange = (pi: string) => {
    setSelectedPI(pi);
    setLocalFilters({
      ...localFilters,
      selectedPI: pi,
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    setSelectedTreeValue(null);
    setSelectedPI('');
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Dashboard Filters</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team / Group
            </label>
            <TreeSelect
              selectedValue={selectedTreeValue}
              onSelect={handleTreeSelect}
              placeholder="Select team or group"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PI (optional)
            </label>
            <input
              type="text"
              value={selectedPI}
              onChange={(e) => handlePIChange(e.target.value)}
              placeholder="Enter PI name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

