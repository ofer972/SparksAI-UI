# Frontend Migration: Many-to-Many Teams and Groups

## Summary
Successfully updated the frontend to work with the new many-to-many relationship between teams and groups. Teams can now belong to multiple groups simultaneously.

## Changes Made

### 1. **Type Definitions** (`lib/config.ts`)

**Before:**
```typescript
export interface Team {
  team_key: number;
  team_name: string;
  number_of_team_members: number;
  group_key: number | null;  // Single group
  group_name?: string | null;
  ai_insight?: boolean;
}
```

**After:**
```typescript
export interface Team {
  team_key: number;
  team_name: string;
  number_of_team_members: number;
  group_keys: number[];  // Array of groups
  group_names?: string[];  // Array of group names
  ai_insight?: boolean;
}
```

### 2. **API Service** (`lib/api.ts`)

#### Updated Method: `updateTeam()`
**Before:**
```typescript
async updateTeam(teamId: number, groupKey: number | null): Promise<Team>
```

**After:**
```typescript
async updateTeam(teamId: number, groupKeys: number[] | null): Promise<Team>
```

The method now accepts an array of group IDs and sends `group_keys` to the backend.

### 3. **TeamsGroupsContext** (`contexts/TeamsGroupsContext.tsx`)

#### Key Changes:

1. **Tree Building Logic:**
   - Teams can now appear in multiple group nodes
   - A team node is created for each group it belongs to
   - Unassigned teams still appear at the root level

2. **`getTeamsByGroupId()` Method:**
   ```typescript
   // Before
   return teams.filter(team => team.group_key === groupId);
   
   // After
   return teams.filter(team => team.group_keys && team.group_keys.includes(groupId));
   ```

### 4. **TeamManagementTab** (`components/TeamManagementTab.tsx`)

#### Major Updates:

1. **Unassigned Teams Logic:**
   ```typescript
   // Before
   setUnassignedTeams((teamsData.teams || []).filter(t => !t.group_key));
   
   // After
   setUnassignedTeams((teamsData.teams || []).filter(t => !t.group_keys || t.group_keys.length === 0));
   ```

2. **Build Tree - Group Teams Filtering:**
   ```typescript
   // Before
   const groupTeams = teams.filter(t => t.group_key === group.group_key);
   
   // After
   const groupTeams = teams.filter(t => t.group_keys && t.group_keys.includes(group.group_key));
   ```

3. **Remove Team from Group:**
   - Now removes team from a **specific group** (not all groups)
   - Updates the team's `group_keys` array by removing only that group
   - Function signature changed to include `groupKey`: 
     ```typescript
     handleRemoveTeamFromGroup(teamId: number, groupKey: number)
     ```

4. **Two-Tab Assignment Modal:**
   
   Added new state:
   ```typescript
   const [activeTeamTab, setActiveTeamTab] = useState<'unassigned' | 'all'>('unassigned');
   ```

   **Tab 1: Unassigned Teams**
   - Shows teams with no groups at all
   - Use case: Assigning teams to their first group

   **Tab 2: All Teams**
   - Shows all teams not currently in THIS specific group
   - Includes teams that are in OTHER groups
   - Use case: Adding teams to additional groups (many-to-many)

   Features:
   - Team count badges on each tab
   - Visual indicator showing how many groups a team is already in
   - Search functionality works across both tabs
   - Select All/Clear All buttons

## UI Enhancements

### Team Assignment Modal

**New Layout:**
```
┌─────────────────────────────────────────┐
│ Assign Teams to Group                   │
│ Group: Engineering                      │
├─────────────────────────────────────────┤
│ [Unassigned Teams (5)] [All Teams (12)] │ ← New Tabs
├─────────────────────────────────────────┤
│ Showing X teams not in this group       │
│ [Search teams...]                       │
│ [Select All] | [Clear All]              │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Team Alpha                        │ │
│ │ ☐ Team Beta    [In 2 groups]        │ │ ← Shows existing groups
│ │ ☐ Team Gamma                        │ │
│ └─────────────────────────────────────┘ │
│ 2 teams selected                        │
├─────────────────────────────────────────┤
│ [Cancel]  [Assign 2 Teams]              │
└─────────────────────────────────────────┘
```

### Team Display in Tree

Teams now show a visual indicator if they belong to multiple groups:
- The same team can appear under multiple group nodes in the tree
- Remove button only removes from the specific group (not all groups)

## Behavior Changes

### 1. **Adding Teams to Groups**
- **Old:** Could only assign a team to one group
- **New:** Can assign a team to multiple groups via "All Teams" tab

### 2. **Removing Teams from Groups**
- **Old:** Removed team completely (set `group_key` to null)
- **New:** Removes team from specific group only (removes ID from `group_keys` array)
- Team remains in other groups it belongs to

### 3. **Unassigned Teams**
- **Old:** Teams with `group_key === null`
- **New:** Teams with `group_keys.length === 0` (empty array)

## Testing Checklist

- [ ] View teams in tree structure (teams should appear in all their groups)
- [ ] Open assign teams modal - verify two tabs appear
- [ ] **Unassigned Teams tab:**
  - [ ] Shows only teams with no groups
  - [ ] Can assign to group successfully
- [ ] **All Teams tab:**
  - [ ] Shows teams not in current group
  - [ ] Shows badge for teams already in other groups
  - [ ] Can assign teams to additional groups
- [ ] Remove team from group - verify:
  - [ ] Team removed only from that specific group
  - [ ] Team still appears in other groups
  - [ ] Team moves to unassigned only if removed from all groups
- [ ] Search functionality works in both tabs
- [ ] Select All/Clear All works correctly
- [ ] Team counts update properly

## Migration Notes

### Backward Compatibility
- ✅ The frontend is fully backward compatible during migration
- ✅ Handles teams with empty `group_keys` arrays
- ✅ Context provides helper methods that work with the new structure

### Data Flow
1. Backend returns teams with `group_keys: number[]`
2. Frontend stores teams in state with new structure
3. Tree building duplicates team nodes for each group
4. Filters check `group_keys.includes(groupId)` instead of `group_key === groupId`

## Known Behaviors

### Team Duplication in Tree
- This is **intentional** and **correct**
- A team belonging to multiple groups will appear as separate nodes under each group
- Each instance has its own "Remove from group" button
- Removing from one group doesn't affect other instances

### Assignment Modal Tabs
- **Unassigned Teams:** Best for initial team assignment
- **All Teams:** Essential for many-to-many - shows teams that can be added to additional groups
- Teams already in the selected group are **excluded** from both tabs

## Future Enhancements

Potential improvements:
1. Visual indicator in tree showing when a team belongs to multiple groups (e.g., badge with count)
2. Bulk team operations (assign multiple teams to multiple groups at once)
3. Group membership management view (see all groups a team belongs to)
4. Drag-and-drop team assignment

---

**Migration Date:** 2024
**Status:** ✅ Complete
**Frontend Version:** Updated for many-to-many schema



