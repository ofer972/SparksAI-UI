'use client';

import React from 'react';
import TeamGroupSelect from '@/components/filters/TeamGroupSelect';

export interface FilterableField {
  column_name: string;
  display_name: string;
  type: string;
  filter_type: 'dropdown' | 'text' | 'boolean' | 'date' | 'number';
  values?: string[];
  operator?: string[];
}

export interface Filter {
  field: string;
  operator: string;
  values: string[] | string;
}

interface DefaultPIFilter {
  field: string;
  displayName: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  loading: boolean;
  allowAll: boolean;
}

interface DefaultTeamGroupFilter {
  field: string;
  displayName: string;
  value: string | null;
  onChange: (value: string | null, type: 'team' | 'group', name: string) => void;
  teamGroupSelect: true;
}

interface DefaultFilters {
  pi?: DefaultPIFilter;
  teamGroup?: DefaultTeamGroupFilter;
}

interface FilterConfigPanelProps {
  selectedFilterFields: string[];
  filters: Filter[];
  filterableFields: FilterableField[];
  dropdownValues: Record<string, string[]>;
  loadingDropdownValues: Record<string, boolean>;
  getFilterFieldInfo: (fieldName: string) => FilterableField | undefined;
  onFilterChange: (fieldName: string, field: Partial<Filter>) => void;
  onRemoveFilter: (fieldName: string) => void;
  defaultFilters?: DefaultFilters;
}

export default function FilterConfigPanel({
  selectedFilterFields,
  filters,
  filterableFields,
  dropdownValues,
  loadingDropdownValues,
  getFilterFieldInfo,
  onFilterChange,
  onRemoveFilter,
  defaultFilters,
}: FilterConfigPanelProps) {
  const hasDefaultFilters = defaultFilters && (defaultFilters.pi || defaultFilters.teamGroup);
  const hasRegularFilters = selectedFilterFields.length > 0;
  
  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-content-primary mb-2">
        Filter Values
      </label>
      <div className="border border-outline rounded-md bg-surface-elevated max-h-[196px] overflow-y-auto">
        {!hasDefaultFilters && !hasRegularFilters ? (
          <div className="p-4 text-sm text-content-tertiary text-center">
            Select filters to configure values
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {/* Default Filters - Always shown at top, non-removable */}
            {hasDefaultFilters && (
              <>
                {/* PI Filter */}
                {defaultFilters.pi && (
                  <div className="flex gap-2 items-center pb-2 border-b border-outline">
                    <span className="text-sm font-medium text-content-primary w-32 flex-shrink-0">
                      {defaultFilters.pi.displayName}
                    </span>
                    <select
                      value={defaultFilters.pi.value || ''}
                      onChange={(e) => defaultFilters.pi!.onChange(e.target.value || null)}
                      disabled={defaultFilters.pi.loading}
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {defaultFilters.pi.allowAll && <option value="">All</option>}
                      {defaultFilters.pi.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {/* No remove button for default filters */}
                  </div>
                )}
                
                {/* Team/Group Filter */}
                {defaultFilters.teamGroup && (
                  <div className="flex gap-2 items-center pb-2 border-b border-outline">
                    <span className="text-sm font-medium text-content-primary w-32 flex-shrink-0">
                      {defaultFilters.teamGroup.displayName}
                    </span>
                    <TeamGroupSelect
                      value={defaultFilters.teamGroup.value || null}
                      onChange={(value, type, name) => {
                        defaultFilters.teamGroup!.onChange(value, type, name || '');
                      }}
                      placeholder="Select team or group"
                      allowClear={true}
                      size="sm"
                    />
                    {/* No remove button for default filters */}
                  </div>
                )}
              </>
            )}
            
            {/* Regular Filters */}
            {hasRegularFilters && (
              <>
            {selectedFilterFields.map((fieldName) => {
              const filter = filters.find(f => f.field === fieldName);
              const fieldInfo = getFilterFieldInfo(fieldName);
              const isDropdown = fieldInfo?.filter_type === 'dropdown';
              const isBoolean = fieldInfo?.filter_type === 'boolean';
              const isDate = fieldInfo?.filter_type === 'date';
              const isNumber = fieldInfo?.filter_type === 'number';
              const isText = fieldInfo?.filter_type === 'text';
              
              if (!filter || !fieldInfo) return null;
              
              return (
                <div key={fieldName} className="flex gap-2 items-center">
                  {/* Field Name */}
                  <span className="text-sm font-medium text-content-primary w-32 flex-shrink-0">
                    {fieldInfo.display_name}:
                  </span>
                  
                  {/* Operator (for text, date, and number fields) */}
                  {(isText || isDate || isNumber) && fieldInfo.operator && (
                    <select
                      value={filter.operator || (isDate ? 'greater_than' : isNumber ? 'equals' : 'equals')}
                      onChange={(e) => onFilterChange(fieldName, { operator: e.target.value })}
                      className="w-32 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {fieldInfo.operator.map(op => (
                        <option key={op} value={op}>
                          {op === 'greater_than' ? 'Greater Than' : op === 'less_than' ? 'Less Than' : op === 'equals' ? 'Equals' : op === 'contains' ? 'Contains' : op}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Value Input - Boolean Dropdown */}
                  {isBoolean ? (
                    <select
                      value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        onFilterChange(fieldName, { values: value || '' });
                      }}
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : isDate ? (
                    /* Date Input */
                    <input
                      type="date"
                      value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                      onChange={(e) => onFilterChange(fieldName, { values: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : isNumber ? (
                    /* Number Input */
                    <input
                      type="number"
                      value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                      onChange={(e) => onFilterChange(fieldName, { values: e.target.value })}
                      placeholder="Enter number..."
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : isDropdown ? (
                    /* Standard Dropdown (not multi-select) */
                    <select
                      value={Array.isArray(filter.values) && filter.values.length > 0 ? filter.values[0] : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        onFilterChange(fieldName, { values: value ? [value] : [] });
                      }}
                      disabled={loadingDropdownValues[fieldName]}
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{loadingDropdownValues[fieldName] ? 'Loading...' : 'All'}</option>
                      {dropdownValues[fieldName]?.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  ) : (
                    /* Text Input */
                    <input
                      type="text"
                      value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                      onChange={(e) => onFilterChange(fieldName, { values: e.target.value })}
                      placeholder="Enter value..."
                      className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  )}

                  {/* Remove Filter Button */}
                  <button
                    onClick={() => onRemoveFilter(fieldName)}
                    className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    title="Remove filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

