'use client';

import TeamGroupSelect from './TeamGroupSelect';

interface GroupSelectProps {
  value: string | null; // group_name or null
  onChange: (groupName: string | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  showAllOption?: boolean;
  size?: 'xs' | 'sm' | 'md';
  fullWidth?: boolean;
}

/**
 * Simple group-only selector component
 * Displays a flat list of groups (no hierarchy or teams)
 */
export default function GroupSelect({
  value,
  onChange,
  placeholder = 'Select Group',
  className = '',
  allowClear = true,
  showAllOption = false,
  size = 'xs',
  fullWidth = false,
}: GroupSelectProps) {
  return (
    <TeamGroupSelect
      mode="group-only"
      value={value}
      onChange={(val, type, name) => onChange(name || null)}
      placeholder={placeholder}
      className={className}
      allowClear={allowClear}
      showAllOption={showAllOption}
      size={size}
      fullWidth={fullWidth}
    />
  );
}
