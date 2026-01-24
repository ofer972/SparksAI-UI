'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { IssuesByTeam } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import StatusCategoryFilter from '../StatusCategoryFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

interface IssuesByTeamResult {
 team_breakdown?: IssuesByTeam[];
}

interface IssuesByTeamViewProps {
 data: IssuesByTeamResult | null | undefined;
 loading: boolean;
 error: string | null;
 filters: Record<string, any>;
 setFilters: (updater: ReportFiltersUpdater) => void;
 refresh: () => void;
 meta?: Record<string, any> | null;
 componentProps?: Record<string, any>;
 togglePin?: (filterKey: string) => void;
 pinnedFilters?: string[];
}

const COLOR_PALETTE = [
 '#991b1b',
 '#fbbf24',
 '#7dd3fc',
 '#3b82f6',
 '#a855f7',
 '#ec4899',
 '#f97316',
 '#14b8a6',
 '#8b5cf6',
 '#0ea5e9',
];

const buildTeamChartData = (teams?: IssuesByTeam[]) => {
 if (!Array.isArray(teams)) {
 return {
 teams: [],
 priorities: [],
 };
 }

 const uniquePriorities = new Set<string>();
 teams.forEach((team) => {
 team.priorities?.forEach((priority) => {
 uniquePriorities.add(priority.priority ?? 'Unspecified');
 });
 });

 const sortedPriorities = Array.from(uniquePriorities).sort();

 const dataset = teams.map((team) => {
 const entry: any = {
 team_name: team.team_name ?? 'Unspecified',
 total_issues: team.total_issues ?? 0,
 };

 sortedPriorities.forEach((priorityName) => {
 const match = team.priorities?.find((p) => p.priority === priorityName);
 entry[priorityName] = match?.issue_count ?? 0;
 });

 return entry;
 });

 return {
 teams: dataset,
 priorities: sortedPriorities,
 };
};

const IssuesByTeamView: React.FC<IssuesByTeamViewProps> = ({
 data,
 loading,
 error,
 filters,
 setFilters,
 meta,
 refresh,
 componentProps,
 togglePin,
 pinnedFilters = [],
}) => {
  const issueType = (filters?.issue_type as string) ?? 'Bug';
 const { groups, teams } = useTeamsGroups();
  const teamName = (filters?.team_name as string) ?? '';
 const isGroup = (filters?.isGroup as boolean) ?? false;
  const months = (filters?.months as number) ?? 6;

 // Dark mode detection
 const [isDark, setIsDark] = useState(false);
 useEffect(() => {
 const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
 checkDark();
 const observer = new MutationObserver(checkDark);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, []);
 
 const statusCategories = useMemo(() => {
 if (filters.status_category === undefined || filters.status_category === null) {
 return ['To Do', 'In Progress'];
 }
 if (Array.isArray(filters.status_category)) {
 return filters.status_category;
 }
 return [filters.status_category];
 }, [filters.status_category]);

 const teamValue = useMemo(() => {
 if (!teamName) return null;
 
 if (isGroup) {
 const group = groups.find(g => g.group_name === teamName);
 return group ? `group:${group.group_key}` : null;
 } else {
 const team = teams.find(t => t.team_name === teamName);
 return team ? `team:${team.team_key}` : null;
 }
 }, [teamName, isGroup, groups, teams]);

 const availableIssueTypes = useMemo(() => getIssueTypes(), []);

 // Get plural form of issue type for dynamic header
 const issueTypePlural = useMemo(() => {
 const type = issueType.toLowerCase();
 if (type === 'story') return 'Stories';
 if (type === 'bug') return 'Bugs';
 if (type === 'epic') return 'Epics';
 if (type === 'task') return 'Tasks';
 if (type === 'sub-task' || type === 'subtask') return 'Sub-tasks';
 // Default: add 's' to the end
 return issueType.charAt(0).toUpperCase() + issueType.slice(1) + 's';
 }, [issueType]);

 const statusCategoryOptions = ['To Do', 'In Progress', 'Done'];

 const teamChart = useMemo(() => buildTeamChartData(data?.team_breakdown), [data?.team_breakdown]);

 const totalIssues = useMemo(() => {
 return teamChart.teams.reduce((sum, team) => sum + (team.total_issues || 0), 0);
 }, [teamChart.teams]);

 const filtersContent = (
 <ReportFiltersRow>
 <ReportFilterField label="Team/Group">
 <TeamGroupFilter
 value={teamValue}
 onChange={(value, type, name) => {
 if (value === null) {
 setFilters?.((prev) => ({
 ...prev,
 team_name: null,
 isGroup: false,
 }));
 } else {
 setFilters?.((prev) => ({
 ...prev,
 team_name: name,
 isGroup: type === 'group',
 }));
 }
 }}
 placeholder="Select team or group"
 allowClear={true}
 />
 </ReportFilterField>

 <ReportFilterField label="Issue Type">
 <select
 value={issueType}
 onChange={(e) =>
 setFilters?.((prev) => ({
 ...prev,
 issue_type: e.target.value,
 }))
 }
 disabled
 className="px-2 py-1 border border-outline-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface-secondary cursor-not-allowed text-content-muted"
 >
 {availableIssueTypes.map((type) => (
 <option key={type.value} value={type.value}>
 {type.label}
 </option>
 ))}
 </select>
 </ReportFilterField>

 <ReportFilterField label="Time Period">
 <select
 value={months}
 onChange={(e) =>
 setFilters?.((prev) => ({
 ...prev,
 months: Number(e.target.value),
 }))
 }
 className="px-2 py-1 border border-outline-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 <option value={1}>1 Month</option>
 <option value={2}>2 Months</option>
 <option value={3}>3 Months</option>
 <option value={4}>4 Months</option>
 <option value={6}>6 Months</option>
 <option value={9}>9 Months</option>
 <option value={12}>12 Months</option>
 </select>
 </ReportFilterField>

 <ReportFilterField label="Status Category">
 <StatusCategoryFilter
 value={statusCategories}
 onChange={(values) => {
 const allSelected = values.length === statusCategoryOptions.length;
 const noneSelected = values.length === 0;
 
 if (allSelected || noneSelected) {
 setFilters?.((prev) => ({
 ...prev,
 status_category: [],
 }));
 } else {
 setFilters?.((prev) => ({
 ...prev,
 status_category: values,
 }));
 }
 }}
 />
 </ReportFilterField>
 </ReportFiltersRow>
 );

 // Generate filter badges for active filters
 const filterBadges = useMemo(() => {
 const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
 
 if (teamName) {
 badges.push({
 label: isGroup ? 'Group' : 'Team',
 value: teamName,
 filterKey: 'team_name',
 isPinned: pinnedFilters.includes('team_name'),
 });
 }
 
 if (issueType) {
 badges.push({
 label: 'Issue Type',
 value: issueType,
 filterKey: 'issue_type',
 isPinned: pinnedFilters.includes('issue_type'),
 });
 }
 
 if (months !== 6) {
 badges.push({
 label: 'Time Period',
 value: `${months} ${months === 1 ? 'Month' : 'Months'}`,
 filterKey: 'months',
 isPinned: pinnedFilters.includes('months'),
 });
 }
 
 if (filters.status_category && Array.isArray(filters.status_category) && filters.status_category.length > 0 && filters.status_category.length < statusCategoryOptions.length) {
 badges.push({
 label: 'Status Category',
 value: filters.status_category.join(', '),
 filterKey: 'status_category',
 isPinned: pinnedFilters.includes('status_category'),
 });
 }
 
 return badges;
 }, [teamName, isGroup, issueType, months, filters.status_category, statusCategoryOptions.length, pinnedFilters]);


 return (
 <ReportCard
 title="Issues by Team"
 reportId={componentProps?.reportId}
 filters={filtersContent}
 filterBadges={filterBadges}
 onTogglePin={togglePin}
 onRefresh={refresh}
 onClose={componentProps?.onClose}
 onAIChat={componentProps?.onAIChat}
 readOnly={componentProps?.readOnly}
 hideHeader={componentProps?.hideHeader}
 hideCollapse={componentProps?.hideCollapse}
 >
 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
 {error}
 </div>
 )}

 {loading && (
 <div className="flex items-center justify-center h-96">
 <div className="flex flex-col items-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
 <div className="text-sm text-content-tertiary">Loading team breakdown...</div>
 </div>
 </div>
 )}

 {!loading && !error && teamChart.teams.length === 0 && (
 <div className="flex items-center justify-center h-96">
 <div className="text-content-muted">No team data available</div>
 </div>
 )}

 {!loading && !error && teamChart.teams.length > 0 && (
 <>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base font-bold text-content-primary">{issueTypePlural} Breakdown by Team</h3>
 <span className="text-sm text-content-muted">Total: {totalIssues}</span>
 </div>
 <div className="relative w-full h-[280px] overflow-visible">
 <ResponsiveBar
 data={teamChart.teams}
 keys={teamChart.priorities}
 indexBy="team_name"
 margin={{ top: 20, right: 20, bottom: 70, left: 50 }}
 padding={0.3}
 valueScale={{ type: 'linear' }}
 indexScale={{ type: 'band', round: true }}
 colors={(bar) => {
 const index = teamChart.priorities.indexOf(bar.id as string);
 return COLOR_PALETTE[index % COLOR_PALETTE.length];
 }}
 borderWidth={2}
 borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
 axisTop={null}
 axisRight={null}
 axisBottom={{
 tickSize: 5,
 tickPadding: 5,
 tickRotation: -45,
 legend: '',
 legendPosition: 'middle',
 legendOffset: 60,
 }}
 axisLeft={{
 tickSize: 5,
 tickPadding: 5,
 tickRotation: 0,
 legend: '# of Issues',
 legendPosition: 'middle',
 legendOffset: -40,
 }}
 theme={{
 axis: {
 ticks: {
 text: { fill: isDark ? '#cbd5e1' : '#374151' }
 },
 legend: {
 text: { fill: isDark ? '#cbd5e1' : '#374151' }
 }
 },
 grid: {
 line: { stroke: isDark ? '#475569' : '#e5e7eb' }
 }
 }}
 enableLabel={true}
 label={(d) => (d.value != null && d.value > 0 ? String(d.value) : '')}
 labelSkipWidth={12}
 labelSkipHeight={12}
 labelTextColor={isDark ? '#f1f5f9' : '#111827'}
 tooltip={({ id, value, indexValue, color }) => (
 <div className="bg-surface p-3 border border-outline rounded-lg shadow-lg text-sm">
 <p className="font-semibold text-content-primary mb-1">{indexValue}</p>
 <p className="text-content-secondary" style={{ color }}>
 {id}: {value}
 </p>
 </div>
 )}
 legends={[]}
 role="application"
 ariaLabel="Issues by team bar chart"
 />
 </div>
 <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
 {teamChart.priorities.map((priority, index) => (
 <div key={priority} className="flex items-center gap-2">
 <div
 className="w-3 h-3"
 style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
 />
 <span className="text-sm text-content-secondary">{priority}</span>
 </div>
 ))}
 </div>
 </>
 )}
 </ReportCard>
 );
};

export default IssuesByTeamView;

