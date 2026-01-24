'use client';

import TeamGroupSelect from './TeamGroupSelect';

interface TeamSelectProps {
  value: string | null; // team_name or null
  onChange: (teamName: string | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  showAllOption?: boolean;
  size?: 'xs' | 'sm' | 'md';
  fullWidth?: boolean;
}

/**
 * Simple team-only selector component
 * Displays a flat list of teams (no group hierarchy)
 */
export default function TeamSelect({
  value,
  onChange,
  placeholder = 'Select Team',
  className = '',
  allowClear = true,
  showAllOption = false,
  size = 'xs',
  fullWidth = false,
}: TeamSelectProps) {
  return (
    <TeamGroupSelect
      mode="team-only"
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
