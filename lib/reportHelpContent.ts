/**
 * Short report descriptions and edge-case explanations for the "?" help on Sprint and PI reports.
 * Shown in ReportHelpDialog when user clicks the help icon (same pattern as Dora/PR help).
 */

export interface ReportHelpContent {
  /** One-sentence description of what the report shows */
  oneLiner: string;
  /** Optional edge cases in plain language for end users */
  edgeCases?: string[];
}

/** Keys must match backend report_id (e.g. team-sprint-burndown, team-closed-sprints). */
const content: Record<string, ReportHelpContent> = {
  'team-sprint-burndown': {
    oneLiner: 'Shows how many sprint items are left to do each day and how scope changes (added, removed, completed).',
    edgeCases: [
      'Items already Done before the sprint started are not counted in "planned"—they appear as completed before start.',
      'If an item was Done before the sprint, then reopened (e.g. To Do or In Progress) and later closed again, it is counted as added on the day it reappears and as completed when it is closed.',
      'If an item is completed and then removed from the sprint the next day, it still counts as completed and total scope does not go down.',
      'Items that leave the sprint and come back are shown as "re-added" on the day they return.',
      'Items added and removed on the same day usually do not show on the burndown at all (no add, no remove, no change to total scope) because we use one snapshot per day.',
    ],
  },
  'team-closed-sprints': {
    oneLiner: 'Summary of past sprints: how many issues were at start, added, removed, and completed.',
    edgeCases: [
      'Uses the same rules as Sprint Burndown so numbers match the chart.',
      'Items completed before the sprint started are excluded from "at start" and listed separately.',
      'If an item was Done, then reopened and later removed from the sprint, it is not counted as completed for that sprint.',
      'Re-added items (left the sprint then came back) are included in "added" and can appear in "completed" if they were closed in the sprint.',
      'Items added and removed on the same day usually do not show (no add, no remove) because we use one snapshot per day.',
    ],
  },
  'sprint-velocity-advanced': {
    oneLiner: 'Summary of past sprints with velocity: how many issues were at start, added, removed, and completed.',
    edgeCases: [
      'Uses the same rules as Sprint Burndown so numbers match the chart.',
      'Items completed before the sprint started are excluded from "at start" and listed separately.',
      'Re-added items are included in "added" and can appear in "completed" if they were closed in the sprint.',
      'Items added and removed on the same day usually do not show (no add, no remove) because we use one snapshot per day.',
    ],
  },
  'sprint-predictability': {
    oneLiner: 'Shows how often the team completed what they planned in past sprints (planned vs completed).',
    edgeCases: [
      'Uses the same data and rules as Closed Sprints, so "completed" matches that report.',
      'All edge cases that apply to Closed Sprints apply here (e.g. Done-before-start excluded from planned, re-added and completed-in-sprint counted).',
      'Items added and removed on the same day usually do not show (no add, no remove) because we use one snapshot per day.',
    ],
  },
  'pi-burndown': {
    oneLiner: 'Shows how much PI scope is left each day and how scope changes (planned, added, removed, completed) over the PI.',
    edgeCases: [
      '"Planned" uses a short grace period after the PI start; items in the PI during that window count as planned unless they were already Done before the PI started.',
      'Items already Done before the PI started are not in planned. If such an item is reopened (e.g. To Do or In Progress) and later closed again, it is counted as added on the day it reappears and as completed when closed.',
      'If an item is marked Done in the middle of the PI and later removed from the PI (e.g. quarter cleared), it still counts as completed and total scope does not go down.',
      'Items that leave the PI and come back are shown as re-added on the day they return.',
      'Items added and removed on the same day usually do not show on the burndown (no add, no remove, no change to total scope) because we use one snapshot per day.',
    ],
  },
  'epic-scope-changes': {
    oneLiner: 'Compares epics across PIs: how many were planned, added, removed, completed, or not completed.',
    edgeCases: [
      'Uses the same scope rules as PI Burndown (grace period, planned/added/removed/completed) so numbers stay consistent.',
      'Epics that were Done before the PI and then reopened and closed again appear under "Added" and, if Done at PI end, under "Completed".',
      '"Completed" means in scope, still in the PI at the end, and Done at the end.',
      'Epics added and removed on the same day usually do not show (no add, no remove) because we use one snapshot per day.',
    ],
  },
  'pi-predictability': {
    oneLiner: 'Shows what share of PI scope was completed (predictability %) and average cycle time for completed epics, by team.',
    edgeCases: [
      'Scope and "completed" use the same rules as Epic Scope and PI Burndown (grace, planned/added/resurfaced, completed at PI end).',
      'Epics that were Done before the PI and later reopened and closed again are included in scope and can count as completed.',
      'Items added and removed on the same day usually do not show (no add, no remove) because we use one snapshot per day.',
    ],
  },
};

/** Get help content for a report. Returns undefined if report has no help. */
export function getReportHelpContent(reportId: string | undefined): ReportHelpContent | undefined {
  if (!reportId) return undefined;
  return content[reportId];
}

/** Report IDs that have help content (for showing the "?" icon only when help exists). */
export const REPORT_IDS_WITH_HELP = Object.keys(content);
