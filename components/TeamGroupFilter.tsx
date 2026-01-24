'use client';

/**
 * @deprecated Use TeamGroupSelect from ./filters/TeamGroupSelect instead
 * This component is kept for backward compatibility only
 */

import TeamGroupSelect from './filters/TeamGroupSelect';

interface TeamGroupFilterProps {
  value: string | null; // "group:ID" or "team:ID" or null
  onChange: (value: string | null, type: 'group' | 'team', name: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

/**
 * @deprecated This component is deprecated. Use TeamGroupSelect from './filters/TeamGroupSelect' instead.
 * 
 * Legacy wrapper component for backward compatibility.
 * All new code should use TeamGroupSelect, TeamSelect, or GroupSelect from './filters'
 */
export default function TeamGroupFilter({
  value,
  onChange,
  placeholder = 'Select team or group',
  className = '',
  allowClear = true,
}: TeamGroupFilterProps) {
  return (
    <TeamGroupSelect
      mode="tree"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      allowClear={allowClear}
      size="xs"
    />
  );
}

