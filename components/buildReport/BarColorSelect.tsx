'use client';

import React from 'react';
import { BUILD_REPORT_BAR_COLORS } from './constants';

export interface BuildReportBarColorSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
}

/**
 * Shared bar color dropdown for Build Report (bar chart and multi-bar).
 * Single component so color list and behavior stay in one place.
 */
export default function BuildReportBarColorSelect({
  label,
  value,
  onChange,
  className = '',
  selectClassName = 'w-32 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand',
  disabled = false,
}: BuildReportBarColorSelectProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label className="text-sm font-medium text-content-primary whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        disabled={disabled}
      >
        {BUILD_REPORT_BAR_COLORS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
