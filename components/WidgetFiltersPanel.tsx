'use client';

import React, { useState } from 'react';
import TreeSelect from './TreeSelect';
import type { DashboardWidget } from '@/lib/config';

interface WidgetFiltersPanelProps {
  widget: DashboardWidget;
  dashboardFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onClose: () => void;
}

export default function WidgetFiltersPanel({
  widget,
  dashboardFilters,
  onFiltersChange,
  onClose,
}: WidgetFiltersPanelProps) {
  // Widget filters are now directly on the widget object, or we need to get them from reportFilters
  // The widget passed here might have widget_config for backward compatibility, or filters directly
  const widgetFilters = (widget as any).widget_config?.filters || (widget as any).filters || {};
  
  // Merge dashboard filters with widget filters (widget overrides dashboard)
  const [localFilters, setLocalFilters] = useState<Record<string, any>>({
    ...dashboardFilters,
    ...widgetFilters,
  });
  
  const [selectedTreeType, setSelectedTreeType] = useState<'team' | 'group'>(
    widgetFilters.selectedTreeType || dashboardFilters.selectedTreeType || 'team'
  );
  const [selectedTreeValue, setSelectedTreeValue] = useState<string | null>(
    widgetFilters.selectedTreeValue || dashboardFilters.selectedTreeValue || null
  );
  const [selectedPI, setSelectedPI] = useState<string>(
    widgetFilters.selectedPI || dashboardFilters.selectedPI || ''
  );

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
    // Only send widget-specific overrides (not inherited from dashboard)
    const widgetOverrides: Record<string, any> = {};
    
    if (localFilters.selectedTreeType !== dashboardFilters.selectedTreeType ||
        localFilters.selectedTreeValue !== dashboardFilters.selectedTreeValue) {
      widgetOverrides.selectedTreeType = localFilters.selectedTreeType;
      widgetOverrides.selectedTreeValue = localFilters.selectedTreeValue;
      widgetOverrides.selectedTreeLabel = localFilters.selectedTreeLabel;
      widgetOverrides.selectedTeam = localFilters.selectedTeam;
      widgetOverrides.selectedGroup = localFilters.selectedGroup;
    }
    
    if (localFilters.selectedPI !== dashboardFilters.selectedPI) {
      widgetOverrides.selectedPI = localFilters.selectedPI;
    }
    
    onFiltersChange(widgetOverrides);
    onClose();
  };

  const handleClear = () => {
    // Clear widget overrides (inherit from dashboard)
    onFiltersChange({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-outline">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-content-primary">Widget Filters</h2>
              <p className="text-sm text-content-secondary mt-1">
                Override dashboard filters for this widget
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-content-muted hover:text-content-secondary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <strong>Dashboard Defaults:</strong> {dashboardFilters.selectedTeam || dashboardFilters.selectedGroup || 'None'} 
            {dashboardFilters.selectedPI && ` | PI: ${dashboardFilters.selectedPI}`}
          </div>

          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">
              Team / Group Override
            </label>
            <TreeSelect
              selectedValue={selectedTreeValue}
              onSelect={handleTreeSelect}
              placeholder="Select team or group (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">
              PI Override (optional)
            </label>
            <input
              type="text"
              value={selectedPI}
              onChange={(e) => handlePIChange(e.target.value)}
              placeholder="Enter PI name"
              className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-outline">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 bg-surface-secondary text-content-secondary rounded-md hover:bg-gray-200 transition-colors"
            >
              Use Dashboard Defaults
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
            >
              Apply Overrides
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

