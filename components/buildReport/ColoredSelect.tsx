'use client';

import React from 'react';

export interface BuildReportColoredSelectOption {
  value: string;
  label: string;
}

export interface BuildReportColoredSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: BuildReportColoredSelectOption[];
  color: string;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  bold?: boolean;
  disabled?: boolean;
}

/**
 * Build Report only: a select whose selected option text is shown in the given color (and bold).
 * Use for X-Axis (bar chart) and Bar 1 / Bar 2 (multi-bar) so one component controls the behavior.
 */
export default function BuildReportColoredSelect({
  value,
  onChange,
  options,
  color,
  placeholder = 'Select...',
  className = '',
  selectClassName = 'px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand',
  bold = true,
  disabled = false,
}: BuildReportColoredSelectProps) {
  return (
    <div className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        style={{ color, fontWeight: bold ? 'bold' : undefined }}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
