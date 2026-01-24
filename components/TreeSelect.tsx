'use client';

/**
 * @deprecated Use TeamGroupSelect from ./filters/TeamGroupSelect instead
 * This component is kept for backward compatibility only
 */

import TeamGroupSelect from './filters/TeamGroupSelect';

interface TreeSelectProps {
  selectedValue: string | null; // Can be "group:ID" or "team:ID"
  onSelect: (value: string | null, label: string, type: 'group' | 'team') => void;
  placeholder?: string;
}

/**
 * @deprecated This component is deprecated. Use TeamGroupSelect from './filters/TeamGroupSelect' instead.
 * 
 * Legacy wrapper component for backward compatibility.
 * All new code should use TeamGroupSelect, TeamSelect, or GroupSelect from './filters'
 */
export default function TreeSelect({ selectedValue, onSelect, placeholder = 'Select team or group' }: TreeSelectProps) {
  return (
    <TeamGroupSelect
      mode="tree"
      value={selectedValue}
      onChange={(value, type, name) => onSelect(value, name, type)}
      placeholder={placeholder}
      showAllOption={true}
      size="sm"
    />
  );
}

