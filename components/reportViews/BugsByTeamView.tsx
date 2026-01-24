'use client';

import React, { useMemo, useEffect, useState } from 'react';
import {
 ResponsiveContainer,
 BarChart,
 CartesianGrid,
 Bar,
 XAxis,
 YAxis,
 Tooltip as RechartsTooltip,
 Legend as RechartsLegend,
 LabelList,
} from 'recharts';
import type { IssuesByTeam } from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';

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
}) => {
  const issueType = (filters?.issue_type as string) ?? 'Bug';
  const statusCategory = (filters?.status_category as string) ?? '';
 const includeDone = Boolean(filters.include_done);

 // Dark mode detection
 const [isDark, setIsDark] = useState(false);
 useEffect(() => {
 const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
 checkDark();
 const observer = new MutationObserver(checkDark);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, []);

 const availableIssueTypes = useMemo(() => getIssueTypes(), []);

 const availableStatusCategories = useMemo(() => {
 const categories = new Set<string>();
 if (Array.isArray(data?.team_breakdown)) {
 data?.team_breakdown.forEach((team) => {
 team.priorities?.forEach((priority) => {
 // Status categories would need to be added to the backend data structure
 // For now, we'll use common values
 });
 });
 }
 return ['To Do', 'In Progress', 'Done'];
 }, [data?.team_breakdown]);

 const teamChart = useMemo(() => buildTeamChartData(data?.team_breakdown), [data?.team_breakdown]);

 const totalBugs = useMemo(() => {
 return teamChart.teams.reduce((sum, team) => sum + (team.total_issues || 0), 0);
 }, [teamChart.teams]);

 const filtersContent = (
 <ReportFiltersRow>
 <ReportFilterField label="Issue Type">
 <select
 value={issueType}
 onChange={(e) =>
 setFilters?.((prev) => ({
 ...prev,
 issue_type: e.target.value,
 }))
 }
 className="px-2 py-1 border border-outline-strong bg-surface-elevated text-content-primary rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 {availableIssueTypes.map((type) => (
 <option key={type.value} value={type.value}>
 {type.label}
 </option>
 ))}
 </select>
 </ReportFilterField>

 <ReportFilterField label="Status">
 <select
 value={statusCategory}
 onChange={(e) =>
 setFilters?.((prev) => ({
 ...prev,
 status_category: e.target.value || null,
 }))
 }
 className="px-2 py-1 border border-outline-strong bg-surface-elevated text-content-primary rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 <option value="">All Statuses</option>
 {availableStatusCategories.map((category) => (
 <option key={category} value={category}>
 {category}
 </option>
 ))}
 </select>
 </ReportFilterField>

 <ReportFilterField label="Include Done">
 <input
 type="checkbox"
 checked={includeDone}
 onChange={(e) =>
 setFilters?.((prev) => ({
 ...prev,
 include_done: e.target.checked,
 }))
 }
 className="h-4 w-4 rounded border-outline text-brand focus:ring-brand"
 />
 </ReportFilterField>
 </ReportFiltersRow>
 );

 const barTooltip = ({ active, payload }: any) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-surface p-3 border border-outline rounded-lg shadow-lg text-sm">
 <p className="font-semibold text-content-primary mb-2">{payload[0].payload.team_name}</p>
 {payload.map((entry: any) => {
 if (entry.value > 0) {
 return (
 <p key={entry.dataKey} className="text-content-secondary" style={{ color: entry.fill }}>
 {entry.dataKey}: {entry.value}
 </p>
 );
 }
 return null;
 })}
 </div>
 );
 }
 return null;
 };

 return (
 <ReportCard
 title="Issues by Team"
 reportId={componentProps?.reportId}
 filters={filtersContent}
 onRefresh={refresh}
 onClose={componentProps?.onClose}
 onAIChat={componentProps?.onAIChat}
 readOnly={componentProps?.readOnly}
 hideHeader={componentProps?.hideHeader}
 hideCollapse={componentProps?.hideCollapse}
 >
 {error && (
 <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
 {error}
 </div>
 )}

 {!error && (
 <div className="border border-outline rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-content-primary">Issues Breakdown by Team</h3>
 <span className="text-sm text-content-muted">Total: {totalBugs}</span>
 </div>
 <div className="h-96">
 {loading ? (
 <div className="flex items-center justify-center h-full text-sm text-content-tertiary">
 Loading team breakdown...
 </div>
 ) : teamChart.teams.length > 0 ? (
 <ResponsiveContainer key={isDark ? 'dark' : 'light'}>
 <BarChart data={teamChart.teams} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
 <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e5e7eb'} />
 <XAxis 
 dataKey="team_name" 
 tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#374151' }} 
 angle={-45} 
 textAnchor="end" 
 height={80}
 stroke={isDark ? '#64748b' : '#9ca3af'}
 />
 <YAxis tick={{ fontSize: 12, fill: isDark ? '#cbd5e1' : '#374151' }} stroke={isDark ? '#64748b' : '#9ca3af'} />
 <RechartsTooltip content={barTooltip} />
 <RechartsLegend wrapperStyle={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#374151' }} />
 {teamChart.priorities.map((priorityName, index) => (
 <Bar
 key={priorityName}
 dataKey={priorityName}
 stackId="bugs"
 fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
 isAnimationActive={false}
 >
 <LabelList
 dataKey={priorityName}
 position="center"
 content={(props: any) => {
 const { value } = props;
 if (!value) {
 return null;
 }
 return (
 <text
 x={props.x + props.width / 2}
 y={props.y + props.height / 2}
 fill={isDark ? '#f1f5f9' : '#111827'}
 textAnchor="middle"
 dominantBaseline="middle"
 fontSize={11}
 fontWeight={600}
 >
 {value}
 </text>
 );
 }}
 />
 </Bar>
 ))}
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-full flex items-center justify-center text-content-muted">
 No team data available
 </div>
 )}
 </div>
 </div>
 )}
 </ReportCard>
 );
};

export default IssuesByTeamView;

