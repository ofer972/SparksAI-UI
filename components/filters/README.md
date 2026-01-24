# Unified Team/Group Selection Components

This folder contains the consolidated, unified components for selecting teams and groups across the application.

## Components

### 1. **TeamGroupSelect** (Main Component)
The core component that handles all team/group selection scenarios.

```tsx
import { TeamGroupSelect } from '@/components/filters';

<TeamGroupSelect
  mode="tree" // or 'team-only' or 'group-only'
  value={value}
  onChange={(value, type, name) => {
    console.log({ value, type, name });
  }}
  size="xs" // 'xs', 'sm', or 'md'
  placeholder="Select team or group"
  allowClear={true}
  showAllOption={false}
  fullWidth={false}
/>
```

**Props:**
- `mode`: Selection mode
  - `'tree'`: Hierarchical view with groups and teams (default)
  - `'team-only'`: Flat list of teams only
  - `'group-only'`: Flat list of groups only
- `value`: Current selected value
  - For `'tree'` mode: `"team:123"` or `"group:456"` or `null`
  - For `'team-only'` mode: `"Team Name"` or `null`
  - For `'group-only'` mode: `"Group Name"` or `null`
- `onChange`: `(value: string | null, type: 'team' | 'group', name: string) => void`
- `size`: Text size (`'xs'`, `'sm'`, `'md'`)
- `placeholder`: Placeholder text
- `allowClear`: Show clear selection option
- `showAllOption`: Show "All Teams" / "All Groups" option
- `fullWidth`: Take full width of container
- `className`: Additional CSS classes

---

### 2. **TeamSelect** (Convenience Wrapper)
Simple team-only selector. Perfect for filters that only need team selection.

```tsx
import { TeamSelect } from '@/components/filters';

<TeamSelect
  value={teamName} // "Team Name" or null
  onChange={(teamName) => setTeam(teamName)}
  size="xs"
  placeholder="Select Team"
  allowClear={true}
  showAllOption={false}
  fullWidth={false}
/>
```

**Props:**
- `value`: Current team name or `null`
- `onChange`: `(teamName: string | null) => void`
- `size`, `placeholder`, `allowClear`, `showAllOption`, `fullWidth`, `className`

---

### 3. **GroupSelect** (Convenience Wrapper)
Simple group-only selector. Perfect for filters that only need group selection.

```tsx
import { GroupSelect } from '@/components/filters';

<GroupSelect
  value={groupName} // "Group Name" or null
  onChange={(groupName) => setGroup(groupName)}
  size="xs"
  placeholder="Select Group"
  allowClear={true}
  showAllOption={false}
  fullWidth={false}
/>
```

**Props:**
- `value`: Current group name or `null`
- `onChange`: `(groupName: string | null) => void`
- `size`, `placeholder`, `allowClear`, `showAllOption`, `fullWidth`, `className`

---

## Usage Examples

### Example 1: Report Filter with Team Selection
```tsx
import { TeamSelect } from '@/components/filters';

function ReportFilter() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold">Team:</label>
      <TeamSelect
        value={selectedTeam}
        onChange={setSelectedTeam}
        size="xs"
        fullWidth
      />
    </div>
  );
}
```

### Example 2: Insight Widget with Group Selection
```tsx
import { GroupSelect } from '@/components/filters';

function InsightWidget() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold">Group:</label>
      <GroupSelect
        value={selectedGroup}
        onChange={setSelectedGroup}
        size="xs"
        fullWidth
      />
    </div>
  );
}
```

### Example 3: Dashboard Filter with Hierarchical Selection
```tsx
import { TeamGroupSelect } from '@/components/filters';

function DashboardFilter() {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  
  return (
    <TeamGroupSelect
      mode="tree"
      value={selectedValue}
      onChange={(value, type, name) => {
        setSelectedValue(value);
        console.log(`Selected ${type}: ${name}`);
      }}
      showAllOption={true}
      size="sm"
    />
  );
}
```

### Example 4: Top Bar with Both Team and Group Filters
```tsx
import { TeamSelect, GroupSelect } from '@/components/filters';

function TopBarFilters() {
  const [team, setTeam] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold">Team:</label>
        <TeamSelect
          value={team}
          onChange={setTeam}
          size="xs"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold">Group:</label>
        <GroupSelect
          value={group}
          onChange={setGroup}
          size="xs"
        />
      </div>
    </div>
  );
}
```

---

## Migration Guide

### Migrating from HTML `<select>` dropdowns

**Before:**
```tsx
<select
  value={currentTeamName}
  onChange={(e) => setTeam(e.target.value)}
  className="px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
>
  <option value="">Select Team</option>
  {teams.map(team => (
    <option key={team.team_key} value={team.team_name}>
      {team.team_name}
    </option>
  ))}
</select>
```

**After:**
```tsx
import { TeamSelect } from '@/components/filters';

<TeamSelect
  value={currentTeamName || null}
  onChange={(teamName) => setTeam(teamName || '')}
  size="xs"
  fullWidth
/>
```

### Migrating from `TeamGroupFilter`

**Before:**
```tsx
import TeamGroupFilter from '@/components/TeamGroupFilter';

<TeamGroupFilter
  value={selectedValue}
  onChange={(value, type, name) => handleChange(value, type, name)}
  placeholder="Select team or group"
  allowClear={true}
/>
```

**After:**
```tsx
import { TeamGroupSelect } from '@/components/filters';

<TeamGroupSelect
  mode="tree"
  value={selectedValue}
  onChange={(value, type, name) => handleChange(value, type, name)}
  placeholder="Select team or group"
  allowClear={true}
  size="xs"
/>
```

### Migrating from `TreeSelect`

**Before:**
```tsx
import TreeSelect from '@/components/TreeSelect';

<TreeSelect
  selectedValue={selectedValue}
  onSelect={(value, label, type) => handleSelect(value, label, type)}
  placeholder="Select team or group"
/>
```

**After:**
```tsx
import { TeamGroupSelect } from '@/components/filters';

<TeamGroupSelect
  mode="tree"
  value={selectedValue}
  onChange={(value, type, name) => handleSelect(value, name, type)}
  placeholder="Select team or group"
  showAllOption={true}
  size="sm"
/>
```

---

## Features

✅ **Consistent Styling**: All components share the same look and feel
✅ **Dark Mode Support**: Full dark mode support out of the box
✅ **Responsive**: Works on mobile and desktop
✅ **Accessible**: Keyboard navigation, ARIA labels, and semantic HTML
✅ **Portal Rendering**: Dropdowns rendered in portals to avoid z-index issues
✅ **Smart Positioning**: Automatically positions dropdown above/below based on available space
✅ **Loading States**: Shows loading indicator while fetching teams/groups
✅ **Empty States**: Shows helpful message when no teams/groups are available
✅ **Flexible Sizing**: Three size options (xs, sm, md) to fit different UI contexts

---

## Styling

All components use Tailwind CSS with dark mode support:
- Light mode: White background with gray borders
- Dark mode: Slate-800 background with slate-600 borders
- Hover states: Blue highlights
- Focus states: Blue ring

Components automatically inherit dark mode based on the `dark` class on the `<html>` element.

---

## Backward Compatibility

The old components (`TeamGroupFilter`, `TreeSelect`) are now lightweight wrappers around the new unified components. They will continue to work but are marked as deprecated. We recommend migrating to the new components for better maintainability.

---

## Best Practices

1. **Use `TeamSelect` or `GroupSelect` for simple single-type selection**
   - These are more explicit about intent
   - Simpler API with just name values

2. **Use `TeamGroupSelect` with `mode="tree"` for hierarchical navigation**
   - When users need to see group structure
   - When selection context is important

3. **Always specify `size` to match your UI context**
   - `xs`: Compact filters in topbars and tight spaces
   - `sm`: Standard filters in forms and panels
   - `md`: Prominent filters in large forms

4. **Use `fullWidth` for responsive layouts**
   - Helps components adapt to their container
   - Especially useful in flex layouts

5. **Consider `showAllOption` for reporting contexts**
   - Allows users to see data for all teams/groups
   - Improves UX in dashboard and report filters
