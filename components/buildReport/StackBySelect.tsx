'use client';

import React from 'react';
import { getBuildReportStackByOptions, type StackByFieldOption } from './constants';

export interface BuildReportStackBySelectProps {
  value: string;
  onChange: (value: string) => void;
  filterableFields: Array<{ column_name: string; display_name: string; filter_type?: string }>;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
}

/**
 * Shared "Stack by" dropdown for Build Report (bar chart and multi-bar).
 * Options come from getBuildReportStackByOptions() so the list is defined in one place.
 */
export default function BuildReportStackBySelect({
  value,
  onChange,
  filterableFields,
  placeholder = "Don't stack",
  className = '',
  selectClassName = 'w-44 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand',
  disabled = false,
}: BuildReportStackBySelectProps) {
  const options: StackByFieldOption[] = getBuildReportStackByOptions(filterableFields);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-content-primary whitespace-nowrap">Stack by:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((field) => (
          <option key={field.column_name} value={field.column_name}>
            {field.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
