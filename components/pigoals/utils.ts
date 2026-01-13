import type { HierarchyItem } from '@/lib/config';

interface Goal {
  id: number;
  pi_name: string;
  goal_type: string;
  team_name: string | null;
  group_name: string | null;
  goal_text: string;
  issue_keys: Array<{
    issue_key: string;
    status: string;
    summary: string;
    progress_percent: number;
  }>;
  status: string;
  priority_bv: number | null;
  goal_number: number;
  ai: boolean;
  created_at: string;
  updated_at: string;
  goal_progress_by_epics?: number | null;
  goal_progress_by_children?: number | null;
}

interface TeamGoal {
  team_name: string;
  goals: Goal[];
}

interface PIGoalsResponse {
  success: boolean;
  data: {
    pi: string;
    overall_goals?: Goal[];
    group_goals?: Goal[];
    team_goals?: TeamGoal[];
  };
  message: string;
}

/**
 * Transform PI goals data into hierarchy format for display.
 * 
 * @param goalsData - The PI goals response from the API
 * @param prefix - Prefix to use for keys (e.g., 'ai' or 'nonai') to avoid conflicts
 * @returns Array of hierarchy items ready for display
 */
export function transformGoalsToHierarchy(
  goalsData: PIGoalsResponse | null,
  prefix: string
): HierarchyItem[] {
  if (!goalsData?.data) return [];

  const items: HierarchyItem[] = [];
  const data = goalsData.data;
  
  // If all goal arrays are empty or undefined, return empty array (panels will show "No goals found")
  const hasOverallGoals = data.overall_goals && data.overall_goals.length > 0;
  const hasGroupGoals = data.group_goals && data.group_goals.length > 0;
  const hasTeamGoals = data.team_goals && data.team_goals.length > 0;
  
  // If all goal arrays are empty, return empty array - panels will still be visible but show empty state
  if (!hasOverallGoals && !hasGroupGoals && !hasTeamGoals) {
    return [];
  }

  // Overall Goals Section → "Overall PI Goals"
  if (data.overall_goals && data.overall_goals.length > 0) {
    const sectionKey = `${prefix}-section-overall-goals`;
      items.push({
        key: sectionKey,
        parent: null,
        'Section / Goal / Epic': 'Overall PI Goals',
        'Status': '',
        'Progress': '',
        'AI': '',
        'Last Update': '',
        'Priority BV': '',
        // Store epic info for rendering
        _epicKey: '',
        _epicSummary: '',
      });

    data.overall_goals.forEach((goal) => {
      const goalKey = `${prefix}-goal-${goal.id}`;
      items.push({
        key: goalKey,
        parent: sectionKey,
        'Section / Goal / Epic': goal.goal_text,
        'Status': goal.status,
        'Progress': '',
        'AI': goal.ai,
        'Last Update': goal.updated_at ? new Date(goal.updated_at).toLocaleDateString() : '',
        'Priority BV': goal.priority_bv ?? '',
        _epicKey: '',
        _epicSummary: '',
        _goalId: goal.id, // Store goal ID for checkbox tracking
        _goalStatus: goal.status, // Store goal status for updates
        _goalPriorityBv: goal.priority_bv ?? null, // Store priority BV for editing
        _goalProgressByEpics: goal.goal_progress_by_epics ?? null, // Store progress by epics
        _goalProgressByChildren: goal.goal_progress_by_children ?? null, // Store progress by children/stories
      });

      // Add epics as children
      goal.issue_keys?.forEach((epic) => {
        items.push({
          key: `${prefix}-${epic.issue_key}`,
          parent: goalKey,
          'Section / Goal / Epic': epic.summary,
          'Status': epic.status,
          'Progress': epic.progress_percent,
          'AI': '',
          'Last Update': '',
          // Store epic key and summary for link rendering
          _epicKey: epic.issue_key,
          _epicSummary: epic.summary,
          _parentGoalId: goal.id, // Store parent goal ID directly on epic for reliable access
        });
      });
    });
  }

  // Group Goals Section → "Group Goals: {group_name}"
  if (data.group_goals && data.group_goals.length > 0) {
    // Group goals by group_name
    const goalsByGroup = new Map<string, Goal[]>();
    data.group_goals.forEach((goal) => {
      const groupName = goal.group_name || 'Unknown Group';
      if (!goalsByGroup.has(groupName)) {
        goalsByGroup.set(groupName, []);
      }
      goalsByGroup.get(groupName)!.push(goal);
    });

    goalsByGroup.forEach((goals, groupName) => {
      const sectionKey = `${prefix}-section-group-${groupName}`;
      items.push({
        key: sectionKey,
        parent: null,
        'Section / Goal / Epic': `Group Goals: ${groupName}`,
        'Status': '',
        'Progress': '',
        'AI': '',
        'Last Update': '',
        'Priority BV': '',
        _epicKey: '',
        _epicSummary: '',
      });

      goals.forEach((goal) => {
        const goalKey = `${prefix}-goal-${goal.id}`;
        items.push({
          key: goalKey,
          parent: sectionKey,
          'Section / Goal / Epic': goal.goal_text,
          'Status': goal.status,
          'Progress': '',
          'AI': goal.ai,
          'Last Update': goal.updated_at ? new Date(goal.updated_at).toLocaleDateString() : '',
          'Priority BV': goal.priority_bv ?? '',
          _epicKey: '',
          _epicSummary: '',
          _goalId: goal.id, // Store goal ID for checkbox tracking
          _goalStatus: goal.status, // Store goal status for updates
          _goalPriorityBv: goal.priority_bv ?? null, // Store priority BV for editing
          _goalProgressByEpics: goal.goal_progress_by_epics ?? null, // Store progress by epics
          _goalProgressByChildren: goal.goal_progress_by_children ?? null, // Store progress by children/stories
        });

        // Add epics as children
        goal.issue_keys?.forEach((epic) => {
          items.push({
            key: `${prefix}-${epic.issue_key}`,
            parent: goalKey,
            'Section / Goal / Epic': epic.summary,
            'Status': epic.status,
            'Progress': epic.progress_percent,
            'AI': '',
            'Last Update': '',
            _epicKey: epic.issue_key,
            _epicSummary: epic.summary,
            _parentGoalId: goal.id, // Store parent goal ID directly on epic for reliable access
          });
        });
      });
    });
  }

  // Team Goals Section → "Team Goals: {team_name}"
  if (data.team_goals && data.team_goals.length > 0) {
    data.team_goals.forEach((teamGoal) => {
      const sectionKey = `${prefix}-section-team-${teamGoal.team_name}`;
      items.push({
        key: sectionKey,
        parent: null,
        'Section / Goal / Epic': `Team Goals: ${teamGoal.team_name}`,
        'Status': '',
        'Progress': '',
        'AI': '',
        'Last Update': '',
        'Priority BV': '',
        _epicKey: '',
        _epicSummary: '',
      });

      teamGoal.goals.forEach((goal) => {
        const goalKey = `${prefix}-goal-${goal.id}`;
        items.push({
          key: goalKey,
          parent: sectionKey,
          'Section / Goal / Epic': goal.goal_text,
          'Status': goal.status,
          'Progress': '',
          'AI': goal.ai,
          'Last Update': goal.updated_at ? new Date(goal.updated_at).toLocaleDateString() : '',
          'Priority BV': goal.priority_bv ?? '',
          _epicKey: '',
          _epicSummary: '',
          _goalId: goal.id, // Store goal ID for checkbox tracking
          _goalStatus: goal.status, // Store goal status for updates
          _goalPriorityBv: goal.priority_bv ?? null, // Store priority BV for editing
          _goalProgressByEpics: goal.goal_progress_by_epics ?? null, // Store progress by epics
          _goalProgressByChildren: goal.goal_progress_by_children ?? null, // Store progress by children/stories
        });

        // Add epics as children
        goal.issue_keys?.forEach((epic) => {
          items.push({
            key: `${prefix}-${epic.issue_key}`,
            parent: goalKey,
            'Section / Goal / Epic': epic.summary,
            'Status': epic.status,
            'Progress': epic.progress_percent,
            'AI': '',
            'Last Update': '',
            _epicKey: epic.issue_key,
            _epicSummary: epic.summary,
            _parentGoalId: goal.id, // Store parent goal ID directly on epic for reliable access
          });
        });
      });
    });
  }

  return items;
}

/**
 * Build a map indicating which nodes have children.
 * 
 * @param hierarchyData - The hierarchy items array
 * @returns Map of node keys to boolean indicating if they have children
 */
export function buildNodeChildrenMap(hierarchyData: HierarchyItem[]): Map<string, boolean> {
  const map = new Map<string, boolean>();
  hierarchyData.forEach(item => {
    if (item.key) {
      // Check if any other item has this item as parent
      const hasChildren = hierarchyData.some(other => other.parent === item.key);
      map.set(item.key, hasChildren);
    }
  });
  return map;
}

