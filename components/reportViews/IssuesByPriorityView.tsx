'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import type { IssueByPriority } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import StatusCategoryFilter from '../StatusCategoryFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

interface IssuesByPriorityResult {
 priority_summary?: IssueByPriority[];
}

interface IssuesByPriorityViewProps {
 data: IssuesByPriorityResult | null | undefined;
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

const STATUS_CATEGORY_COLORS: Record<string, string> = {
 'To Do': '#4B5563', // Dark grey
 'In Progress': '#3B82F6', // Blue
 'Done': '#059669', // Dark green
};

const normalizePrioritySummary = (summary?: IssueByPriority[]): IssueByPriority[] => {
 if (!Array.isArray(summary)) {
 return [];
 }

 const merged = summary.reduce((acc, item) => {
 const key = item.priority?.toLowerCase() ?? 'unspecified';
 const existing = acc.get(key);
 const count = Number(item.issue_count ?? 0);

 if (existing) {
 existing.issue_count += count;
 } else {
 acc.set(key, {
 priority: item.priority ?? 'Unspecified',
 status_category: item.status_category ?? 'Unspecified',
 issue_count: count,
 });
 }

 return acc;
 }, new Map<string, IssueByPriority>());

 return Array.from(merged.values()).sort((a, b) => a.priority.localeCompare(b.priority));
};

const buildBarChartData = (summary?: IssueByPriority[]) => {
 if (!Array.isArray(summary)) {
 return { bars: [], statusCategories: [] };
 }

 // Get all unique priorities
 const priorities = new Set<string>();
 summary.forEach((item) => {
 if (item.priority) priorities.add(item.priority);
 });

 const sortedPriorities = Array.from(priorities).sort();

 // Group by priority
 const bars = sortedPriorities.map((priority) => {
 const entry: any = {
 priority: priority,
 };

 // Fill in actual counts (only non-zero values)
 summary.forEach((item) => {
 if (item.priority === priority && item.status_category && item.issue_count > 0) {
 entry[item.status_category] = (entry[item.status_category] || 0) + item.issue_count;
 }
 });

 return entry;
 });

 // Filter out status categories that don't appear in any bar
 const usedStatusCats = new Set<string>();
 bars.forEach((bar) => {
 Object.keys(bar).forEach((key) => {
 if (key !== 'priority' && bar[key] > 0) {
 usedStatusCats.add(key);
 }
 });
 });
 
 // Order: To Do → In Progress → Done
 const orderedStatusCats = ['To Do', 'In Progress', 'Done'].filter(cat => usedStatusCats.has(cat));

 return {
 bars: bars,
 statusCategories: orderedStatusCats,
 };
};

const IssuesByPriorityView: React.FC<IssuesByPriorityViewProps> = ({
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
  const months = (filters?.months as number) ?? 3;
 const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');
 const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
 const priorityDropdownRef = useRef<HTMLDivElement>(null);

 // Selected priorities (empty/undefined = show all)
 const selectedPriorities = useMemo(() => {
 const p = filters?.priorities;
 if (!Array.isArray(p) || p.length === 0) return [];
 return p;
 }, [filters?.priorities]);

 // Dark mode detection
 const [isDark, setIsDark] = useState(false);
 useEffect(() => {
 const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
 checkDark();
 const observer = new MutationObserver(checkDark);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, []);

 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
 setPriorityDropdownOpen(false);
 }
 };
 if (priorityDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [priorityDropdownOpen]);

 const statusCategories = useMemo(() => {
 if (filters.status_category === undefined || filters.status_category === null) {
 return ['To Do', 'In Progress']; // Default: exclude Done
 }
 if (Array.isArray(filters.status_category)) {
 return filters.status_category;
 }
 return [filters.status_category]; // Handle legacy single string
 }, [filters.status_category]);
 
 const statusCategoryOptions = ['To Do', 'In Progress', 'Done'];
 
 // Look up ID from name to construct proper teamValue
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

 const availableTeams = useMemo(() => {
 if (meta && Array.isArray(meta.available_teams)) {
 return meta.available_teams as string[];
 }
 return [];
 }, [meta]);

 // Unique priorities from current data (for filter options)
 const availablePriorities = useMemo(() => {
 const summary = data?.priority_summary;
 if (!Array.isArray(summary)) return [];
 const set = new Set<string>();
 summary.forEach((item) => {
 if (item.priority) set.add(item.priority);
 });
 return Array.from(set).sort();
 }, [data?.priority_summary]);

 // Filter raw summary by selected priorities (empty selection = all)
 const filteredPrioritySummaryRaw = useMemo(() => {
 const summary = data?.priority_summary;
 if (!Array.isArray(summary)) return [];
 if (selectedPriorities.length === 0) return summary;
 return summary.filter((item) => item.priority && selectedPriorities.includes(item.priority));
 }, [data?.priority_summary, selectedPriorities]);

 const prioritySummary = useMemo(
 () => normalizePrioritySummary(filteredPrioritySummaryRaw),
 [filteredPrioritySummaryRaw]
 );
 const totalCount = useMemo(
 () => prioritySummary.reduce((sum, item) => sum + (item.issue_count ?? 0), 0),
 [prioritySummary]
 );

 const pieData = useMemo(() => {
 return prioritySummary.map((item, index) => ({
 id: item.priority ?? 'Unspecified',
 label: item.priority ?? 'Unspecified',
 value: item.issue_count ?? 0,
 color: COLOR_PALETTE[index % COLOR_PALETTE.length],
 }));
 }, [prioritySummary]);

 const barChartData = useMemo(() => {
 if (viewType !== 'bar') return null;
 return buildBarChartData(filteredPrioritySummaryRaw);
 }, [viewType, filteredPrioritySummaryRaw]);

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

 <ReportFilterField label="Priority">
 <div className="relative" ref={priorityDropdownRef}>
 <button
 type="button"
 onClick={() => setPriorityDropdownOpen((open) => !open)}
 className="w-full px-2 py-1 text-left border border-outline-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-surface hover:bg-surface-elevated transition-colors flex items-center justify-between min-w-[140px]"
 >
 <span className={`truncate ${selectedPriorities.length === 0 ? 'text-content-tertiary' : 'text-content-primary'}`}>
 {selectedPriorities.length === 0
 ? 'All priorities'
 : selectedPriorities.length === availablePriorities.length
 ? 'All priorities'
 : selectedPriorities.length <= 2
 ? selectedPriorities.join(', ')
 : `${selectedPriorities.length} selected`}
 </span>
 <svg
 className={`w-4 h-4 text-content-muted flex-shrink-0 ml-2 ${priorityDropdownOpen ? 'rotate-180' : ''}`}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>
 {priorityDropdownOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setPriorityDropdownOpen(false)} aria-hidden="true" />
 <div className="absolute z-50 w-full mt-1 bg-surface border border-outline rounded-lg shadow-lg max-h-48 overflow-auto">
 {availablePriorities.length === 0 ? (
 <div className="px-3 py-2 text-sm text-content-tertiary">No priorities in data</div>
 ) : (
 availablePriorities.map((priority) => {
 const isChecked =
 selectedPriorities.length === 0 || selectedPriorities.includes(priority);
 return (
 <label
 key={priority}
 className="flex items-center px-3 py-2 hover:bg-surface-elevated cursor-pointer transition-colors"
 >
 <input
 type="checkbox"
 checked={isChecked}
 onChange={() => {
 const next =
 isChecked
 ? (selectedPriorities.length === 0 ? availablePriorities : selectedPriorities).filter((p) => p !== priority)
 : [...(selectedPriorities.length === 0 ? availablePriorities : selectedPriorities), priority];
 const allSelected = next.length === availablePriorities.length;
 if (next.length === 0 || allSelected) {
 setFilters?.((prev) => ({ ...prev, priorities: [] }));
 } else {
 setFilters?.((prev) => ({ ...prev, priorities: next }));
 }
 }}
 className="h-4 w-4 text-brand focus:ring-brand border-outline rounded"
 />
 <span className="ml-3 text-sm text-content-primary">{priority}</span>
 </label>
 );
 })
 )}
 </div>
 </>
 )}
 </div>
 </ReportFilterField>

 <ReportFilterField label="Chart Type">
 <select
 value={viewType}
 onChange={(e) => setViewType(e.target.value as 'pie' | 'bar')}
 className="px-2 py-1 border border-outline-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 <option value="pie">Pie Chart</option>
 <option value="bar">Bar Chart</option>
 </select>
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
 
 if (months !== 3) {
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

 if (selectedPriorities.length > 0 && availablePriorities.length > 0 && selectedPriorities.length < availablePriorities.length) {
 badges.push({
 label: 'Priority',
 value: selectedPriorities.length <= 2 ? selectedPriorities.join(', ') : `${selectedPriorities.length} selected`,
 filterKey: 'priorities',
 isPinned: pinnedFilters.includes('priorities'),
 });
 }
 
 return badges;
 }, [teamName, isGroup, issueType, months, filters.status_category, statusCategoryOptions.length, pinnedFilters, selectedPriorities, availablePriorities.length]);

 return (
 <ReportCard
 title="Issues by Priority"
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
 <div className="text-sm text-content-tertiary">Loading priority chart...</div>
 </div>
 </div>
 )}

 {!loading && !error && prioritySummary.length === 0 && (
 <div className="flex items-center justify-center h-96">
 <div className="text-content-muted">No data available</div>
 </div>
 )}

 {!loading && !error && prioritySummary.length > 0 && (
 <>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base font-bold text-content-primary">{issueTypePlural} by Priority</h3>
 <span className="text-sm text-content-muted">Total: {totalCount}</span>
 </div>
 {viewType === 'pie' ? (
 <>
 <div className="relative w-full h-[280px] overflow-visible">
 <ResponsivePie
 data={pieData}
 margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
 innerRadius={0}
 padAngle={0.7}
 cornerRadius={3}
 activeOuterRadiusOffset={8}
 borderWidth={2}
 borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
 colors={{ datum: 'data.color' }}
 enableArcLinkLabels={true}
 arcLinkLabelsSkipAngle={10}
 arcLinkLabelsTextColor={isDark ? '#f1f5f9' : '#111827'}
 arcLinkLabelsThickness={2}
 arcLinkLabelsColor={{ from: 'color' }}
 arcLinkLabel={(d) => {
 const percentage = totalCount > 0 ? ((d.value / totalCount) * 100).toFixed(1) : '0.0';
 return `${d.value} (${percentage}%)`;
 }}
 theme={{
 text: { fill: isDark ? '#cbd5e1' : '#374151' }
 }}
 enableArcLabels={false}
 tooltip={({ datum }) => {
 const percentage = totalCount > 0 ? ((datum.value / totalCount) * 100).toFixed(1) : '0.0';
 return (
 <div className="bg-surface p-3 border border-outline rounded-lg shadow-lg text-sm">
 <p className="font-semibold text-content-primary mb-1">{datum.label}</p>
 <p className="text-content-tertiary">{datum.value} issues ({percentage}%)</p>
 </div>
 );
 }}
 legends={[]}
 />
 </div>
 <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
 {pieData.map((item) => (
 <div key={item.id} className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: item.color }}
 />
 <span className="text-sm text-content-secondary">{item.label}</span>
 </div>
 ))}
 </div>
 </>
 ) : barChartData && barChartData.bars.length > 0 ? (
 <>
 <div className="relative w-full h-[280px] overflow-visible">
 <ResponsiveBar
 data={barChartData.bars}
 keys={barChartData.statusCategories}
 indexBy="priority"
 margin={{ top: 40, right: 20, bottom: 70, left: 50 }}
 padding={0.3}
 valueScale={{ type: 'linear' }}
 indexScale={{ type: 'band', round: true }}
 colors={(bar) => {
 const statusCat = bar.id as string;
 return STATUS_CATEGORY_COLORS[statusCat] || '#9CA3AF';
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
 labelTextColor="#FFFFFF"
 layers={[
 'grid',
 'axes',
 'bars',
 'markers',
 'legends',
 (props: any) => {
 // Custom layer to add total labels at the top of each bar
 const { bars } = props;
 
 // Group bars by priority (indexValue) and calculate totals
 const totalsByPriority = new Map<string, { total: number; x: number; y: number }>();
 
 bars.forEach((bar: any) => {
 const priority = bar.data.indexValue || bar.indexValue;
 const value = bar.data.value || 0;
 
 if (!totalsByPriority.has(priority)) {
 // First bar for this priority - use its position
 totalsByPriority.set(priority, {
 total: value,
 x: bar.x + bar.width / 2,
 y: bar.y, // This will be the topmost bar's y position
 });
 } else {
 // Add to existing total and update y position (use the topmost bar)
 const existing = totalsByPriority.get(priority)!;
 existing.total += value;
 if (bar.y < existing.y) {
 existing.y = bar.y;
 existing.x = bar.x + bar.width / 2;
 }
 }
 });
 
 return (
 <g>
 {Array.from(totalsByPriority.entries()).map(([priority, { total, x, y }]) => {
 if (total === 0) return null;
 
 return (
 <text
 key={`total-${priority}`}
 x={x}
 y={y - 5}
 textAnchor="middle"
 dominantBaseline="auto"
 fill={isDark ? '#f1f5f9' : '#111827'}
 fontSize={12}
 fontWeight={600}
 >
 {total}
 </text>
 );
 })}
 </g>
 );
 },
 ]}
 tooltip={({ id, value, indexValue, color }) => (
 <div className="bg-surface p-3 border border-outline rounded-lg shadow-lg text-sm">
 <p className="font-semibold text-content-primary mb-1">{indexValue}</p>
 <p className="text-content-secondary" style={{ color }}>
 {id}: {value}
 </p>
 </div>
 )}
 legends={[
 {
 dataFrom: 'keys',
 anchor: 'bottom',
 direction: 'row',
 justify: false,
 translateX: 0,
 translateY: 60,
 itemsSpacing: 20,
 itemWidth: 100,
 itemHeight: 20,
 itemDirection: 'left-to-right',
 itemOpacity: 1,
 symbolSize: 12,
 symbolShape: 'circle',
 },
 ]}
 role="application"
 ariaLabel="Issues by priority bar chart"
 />
 </div>
 </>
 ) : (
 <div className="flex items-center justify-center h-96">
 <div className="text-content-muted">No data available for bar chart</div>
 </div>
 )}
 </>
 )}
 </ReportCard>
 );
};

export default IssuesByPriorityView;
