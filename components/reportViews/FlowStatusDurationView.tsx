'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import type {
 StatusDuration,
 IssueStatusDurationIssue,
 MonthlyStatusDurationDataset,
} from '@/lib/config';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';

ChartJS.register(
 CategoryScale,
 LinearScale,
 BarElement,
 Title,
 Tooltip,
 Legend,
 ChartDataLabels
);

type ViewMode = 'total' | 'monthly';

type FlowStatusDurationResult = {
 summary?: StatusDuration[];
 monthly?: {
 labels: string[];
 datasets: MonthlyStatusDurationDataset[];
 };
 detail?: {
 issues?: IssueStatusDurationIssue[];
 count?: number;
 status_name?: string;
 year_month?: string | null;
 months?: number | null;
 } | null;
 view_mode?: ViewMode;
};

interface FlowStatusDurationViewProps {
 data: FlowStatusDurationResult | null | undefined;
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

const MONTHLY_COLORS = [
 'rgba(17, 24, 39, 0.8)',
 'rgba(59, 130, 246, 0.8)',
 'rgba(168, 85, 247, 0.8)',
 'rgba(34, 197, 94, 0.8)',
 'rgba(234, 179, 8, 0.8)',
 'rgba(245, 158, 11, 0.8)',
];

const MONTHLY_BORDER_COLORS = [
 'rgba(17, 24, 39, 1)',
 'rgba(59, 130, 246, 1)',
 'rgba(168, 85, 247, 1)',
 'rgba(34, 197, 94, 1)',
 'rgba(234, 179, 8, 1)',
 'rgba(245, 158, 11, 1)',
];

const FlowStatusDurationView: React.FC<FlowStatusDurationViewProps> = ({
 data,
 loading,
 error,
 filters,
 setFilters,
 refresh,
 meta,
 componentProps,
 togglePin,
 pinnedFilters = [],
}) => {
 const { groups, teams } = useTeamsGroups();

 // Dark mode detection
 const [isDark, setIsDark] = useState(false);
 useEffect(() => {
 const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
 checkDark();
 const observer = new MutationObserver(checkDark);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
 return () => observer.disconnect();
 }, []);
  const issueType = (filters?.issue_type as string) ?? '';
  const teamName = (filters?.team_name as string) ?? '';
 const isGroup = (filters?.isGroup as boolean) ?? false;
 const months = Number(filters.months ?? 3);
  const viewMode = (filters?.view_mode as ViewMode) ?? 'total';
 
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

 const availableIssueTypes = useMemo(() => {
 if (meta && Array.isArray(meta.available_issue_types)) {
 return meta.available_issue_types as string[];
 }
 return [];
 }, [meta]);

 const [detailOpen, setDetailOpen] = useState(false);
 const [detailStatus, setDetailStatus] = useState<string>('');
 const [detailYearMonth, setDetailYearMonth] = useState<string | undefined>();
 const [mounted, setMounted] = useState(false);
 const [fetchingDetailOnly, setFetchingDetailOnly] = useState(false);
 const [shouldOpenModal, setShouldOpenModal] = useState(false); // Track if we intentionally want to open modal
 
 // Track previous main filters to detect if only detail filters changed
 const prevMainFiltersRef = React.useRef<string>('');
 const currentMainFilters = useMemo(() => {
 const { detail_status, detail_year_month, detail_months, ...mainFilters } = filters;
 return JSON.stringify(mainFilters);
 }, [filters]);

 useEffect(() => {
 setMounted(true);
 }, []);

 const summaryData = Array.isArray(data?.summary)
 ? data!.summary.filter((item) => (item.avg_duration_days ?? 0) > 0)
 : [];

 // Stringify to create stable dependency for memoization
 const summaryDataKey = useMemo(() => JSON.stringify(summaryData), [summaryData]);

 const summaryChartData = useMemo(() => {
 return {
 labels: summaryData.map((item) => item.status_name ?? 'Unknown'),
 datasets: [
 {
 label: 'Average Days',
 data: summaryData.map((item) => Number(item.avg_duration_days ?? 0)),
 backgroundColor: 'rgba(59, 130, 246, 0.8)',
 borderColor: 'rgba(59, 130, 246, 1)',
 borderWidth: 1,
 },
 ],
 };
 }, [summaryDataKey]);

 const monthlyData = data?.monthly;

 const monthlyChartData = useMemo(() => {
 if (!monthlyData || !Array.isArray(monthlyData.datasets)) {
 return { labels: [], datasets: [] };
 }

 const filteredStatuses = monthlyData.datasets.filter((dataset) =>
 dataset.data?.some((value) => value > 0)
 );

 const statusLabels = filteredStatuses.map((dataset) => dataset.label ?? 'Status');

 const datasets = (monthlyData.labels ?? []).map((monthLabel, monthIndex) => ({
 label: monthLabel,
 data: filteredStatuses.map((dataset) => dataset.data?.[monthIndex] ?? 0),
 backgroundColor: MONTHLY_COLORS[monthIndex % MONTHLY_COLORS.length],
 borderColor: MONTHLY_BORDER_COLORS[monthIndex % MONTHLY_COLORS.length],
 borderWidth: 1,
 barThickness: 'flex' as const,
 maxBarThickness: 50,
 }));

 return {
 labels: statusLabels,
 datasets,
 };
 }, [monthlyData]);

 const handleViewModeChange = (mode: ViewMode) => {
 setFilters?.((prev) => ({
 ...prev,
 view_mode: mode,
 }));
 };

 const handleBarClick = useCallback(
 (statusName: string, yearMonth?: string) => {
 if (!statusName) {
 return;
 }
 
 // Check if we're clicking the same bar (data already loaded)
 const isSameStatus = detailStatus === statusName;
 const isSameMonth = detailYearMonth === yearMonth;
 const hasDetailData = (data?.detail?.issues?.length ?? 0) > 0;
 
 // Check if filters are already set correctly (normalize undefined/null)
 const currentFilterMonth = filters.detail_year_month ?? null;
 const requestedMonth = yearMonth ?? null;
 const filtersAlreadySet = 
 filters.detail_status === statusName && 
 currentFilterMonth === requestedMonth &&
 filters.detail_months === months;
 
 if (isSameStatus && isSameMonth && hasDetailData && filtersAlreadySet) {
 // Just reopen the modal with existing data - NO SERVER CALL!
 setDetailOpen(true);
 return;
 }
 
 // Set detail state first
 setDetailStatus(statusName);
 setDetailYearMonth(yearMonth);
 setFetchingDetailOnly(true);
 setShouldOpenModal(true); // Mark that we want to open modal when data arrives
 
 // Open modal immediately to show spinner while loading
 setDetailOpen(true);
 
 // Only update filters to fetch detail data
 setFilters?.((prev) => ({
 ...prev,
 detail_status: statusName,
 detail_year_month: yearMonth ?? null,
 detail_months: months,
 }));
 },
 [months, setFilters, detailStatus, detailYearMonth, data?.detail?.issues?.length, filters.detail_status, filters.detail_year_month, filters.detail_months]
 );

 const closeDetail = () => {
 setDetailOpen(false);
 setFetchingDetailOnly(false);
 setShouldOpenModal(false);
 // Don't remove detail filters from state to avoid triggering a re-fetch
 // The shouldOpenModal flag prevents the modal from reopening automatically
 };

 // Check if detail data matches what was requested
 const detailDataMatches = useMemo(() => {
 if (!data?.detail) return false;
 const detailStatusMatch = data.detail.status_name === detailStatus;
 const detailMonthMatch = (data.detail.year_month ?? null) === (detailYearMonth ?? null);
 return detailStatusMatch && detailMonthMatch;
 }, [data?.detail?.status_name, data?.detail?.year_month, detailStatus, detailYearMonth]);

 const detailIssues = detailDataMatches ? (data?.detail?.issues ?? []) : [];

 // Update modal state when correct detail data arrives
 useEffect(() => {
 if (shouldOpenModal && detailDataMatches && data?.detail?.issues) {
 // Data matches what was requested - stop showing spinner
 setFetchingDetailOnly(false);
 setShouldOpenModal(false); // Reset flag after data arrives
 }
 }, [data?.detail?.issues, shouldOpenModal, detailDataMatches]);
 
 // Track if only detail filters changed (to prevent chart reload)
 // Also close modal and clear detail filters when main filters change
 useEffect(() => {
 if (prevMainFiltersRef.current && prevMainFiltersRef.current !== currentMainFilters) {
 // Main filters changed - close modal and clear detail filters
 setDetailOpen(false);
 setFetchingDetailOnly(false);
 setShouldOpenModal(false);
 setDetailStatus('');
 setDetailYearMonth(undefined);
 // Clear detail filters
 setFilters?.((prev) => {
 const { detail_status, detail_year_month, detail_months, ...rest } = prev;
 return rest;
 });
 }
 prevMainFiltersRef.current = currentMainFilters;
 }, [currentMainFilters, setFilters]);

 // Lock body scroll when modal is open
 useEffect(() => {
 if (detailOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = '';
 }
 return () => {
 document.body.style.overflow = '';
 };
 }, [detailOpen]);

 const chartData = viewMode === 'monthly' ? monthlyChartData : summaryChartData;

 const chartOptions = useMemo(
 () => ({
 responsive: true,
 maintainAspectRatio: false,
 barPercentage: viewMode === 'monthly' ? 1.0 : 0.8,
 categoryPercentage: viewMode === 'monthly' ? 1.0 : 0.8,
 onClick: (_event: any, elements: any[]) => {
 if (elements.length > 0) {
 const element = elements[0];
 const statusIndex = element.index;
 const statusName = chartData.labels?.[statusIndex];
 if (!statusName) {
 return;
 }
 let yearMonth: string | undefined;
 if (viewMode === 'monthly') {
 const monthIndex = element.datasetIndex;
 yearMonth = monthlyData?.labels?.[monthIndex];
 }
 handleBarClick(statusName, yearMonth);
 }
 },
 onHover: (event: any, elements: any[]) => {
 if (elements.length > 0) {
 event.native?.target?.style && (event.native.target.style.cursor = 'pointer');
 } else if (event.native?.target?.style) {
 event.native.target.style.cursor = 'default';
 }
 },
 plugins: {
 legend: {
 display: viewMode === 'monthly',
 position: 'top' as const,
 labels: {
 color: isDark ? '#cbd5e1' : '#374151',
 },
 },
 title: {
 display: true,
 text:
 viewMode === 'monthly'
 ? 'Flow Status Duration by Month (click a bar for details)'
 : 'Average Time in Status (click a bar for details)',
 font: {
 size: 14,
 weight: 'bold' as const,
 },
 color: isDark ? '#cbd5e1' : '#374151',
 },
 datalabels: {
 display: true,
 anchor: 'end' as const,
 align: 'end' as const,
 offset: 4,
 color: isDark ? '#f1f5f9' : '#111827',
 backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
 borderColor: isDark ? '#475569' : '#111827',
 borderWidth: 1,
 borderRadius: 4,
 formatter: (value: number) => {
 if (value > 0) {
 return value.toFixed(1);
 }
 return '';
 },
 font: {
 size: 11,
 weight: 'bold' as const,
 },
 padding: {
 top: 2,
 bottom: 2,
 left: 4,
 right: 4,
 },
 },
 tooltip: {
 backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
 titleColor: '#fff',
 bodyColor: '#fff',
 borderColor: isDark ? '#475569' : '#333',
 borderWidth: 1,
 callbacks: {
 label: (context: any) => {
 const base = `${Number(context.parsed.y ?? 0).toFixed(1)} days`;
 if (viewMode === 'monthly') {
 return `${context.dataset.label}: ${base} (click for issues)`;
 }
 return `${base} (click for issues)`;
 },
 },
 },
 },
 scales: {
 x: {
 ticks: {
 autoSkip: false,
 maxRotation: 45,
 minRotation: 0,
 color: isDark ? '#cbd5e1' : '#374151',
 },
 grid: {
 color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
 },
 },
 y: {
 beginAtZero: true,
 title: {
 display: true,
 text: 'Average Days',
 color: isDark ? '#cbd5e1' : '#374151',
 },
 ticks: {
 color: isDark ? '#cbd5e1' : '#374151',
 },
 grid: {
 color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
 },
 },
 },
 }),
 [chartData.labels, handleBarClick, monthlyData?.labels, viewMode, isDark]
 );

 const jiraUrl = meta?.jira_url;

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
 onChange={(event) =>
 setFilters?.((prev) => ({
 ...prev,
 issue_type: event.target.value || null,
 }))
 }
 className="px-2 py-1 border border-outline-strong bg-surface-elevated text-content-primary rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand min-w-[140px]"
 >
 <option value="">All Issue Types</option>
 {availableIssueTypes.map((type) => (
 <option key={type} value={type}>
 {type}
 </option>
 ))}
 </select>
 </ReportFilterField>

 <ReportFilterField label="Months">
 <select
 value={months}
 onChange={(event) =>
 setFilters?.((prev) => ({
 ...prev,
 months: Number(event.target.value),
 }))
 }
 className="px-2 py-1 border border-outline-strong bg-surface-elevated text-content-primary rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 {[1, 2, 3, 4, 6, 9].map((option) => (
 <option key={option} value={option}>
 Last {option} month{option === 1 ? '' : 's'}
 </option>
 ))}
 </select>
 </ReportFilterField>

 <ReportFilterField label="View Mode">
 <select
 value={viewMode}
 onChange={(event) => handleViewModeChange(event.target.value as ViewMode)}
 className="px-2 py-1 border border-outline-strong bg-surface-elevated text-content-primary rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
 >
 <option value="total">Total</option>
 <option value="monthly">Monthly</option>
 </select>
 </ReportFilterField>
 </ReportFiltersRow>
 );

 const detailColumns: Column<IssueStatusDurationIssue>[] = useMemo(
 () => [
 {
 key: 'issue_key',
 label: 'Issue Key',
 render: (value: any) => (
 <a
 href={`${jiraUrl}/browse/${value}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-brand hover:underline"
 >
 {value}
 </a>
 ),
 },
 {
 key: 'summary',
 label: 'Summary',
 align: 'left' as const,
 },
 {
 key: 'duration_days',
 label: 'Duration (days)',
 render: (value: any) => Number(value ?? 0).toFixed(1),
 },
 {
 key: 'time_entered',
 label: 'Entered',
 },
 {
 key: 'time_exited',
 label: 'Exited',
 },
 ],
 [jiraUrl]
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
 
 if (months) {
 badges.push({
 label: 'Time Period',
 value: `${months} month${months !== 1 ? 's' : ''}`,
 filterKey: 'months',
 isPinned: pinnedFilters.includes('months'),
 });
 }
 
 if (viewMode) {
 badges.push({
 label: 'View',
 value: viewMode === 'total' ? 'Total' : 'Monthly',
 filterKey: 'view_mode',
 isPinned: pinnedFilters.includes('view_mode'),
 });
 }
 
 return badges;
 }, [teamName, isGroup, issueType, months, viewMode, pinnedFilters]);

 return (
 <>
 <ReportCard 
 title="Flow Status Duration" 
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
 {loading && !fetchingDetailOnly && (
 <div className="flex-1 flex items-center justify-center h-64">
 <div className="flex flex-col items-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
 <div className="text-sm text-content-tertiary">Loading flow status duration...</div>
 </div>
 </div>
 )}

 {!loading && error && (
 <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
 {error}
 </div>
 )}

 {((!loading && !error) || (loading && fetchingDetailOnly)) && (
 <div className="space-y-4 h-full flex flex-col">
 <div className="border border-outline rounded-lg p-4 h-full flex flex-col">
 <div className="relative flex-1 h-full min-h-[350px]">
 <Bar key={isDark ? 'dark' : 'light'} data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
 </div>
 </div>
 </div>
 )}
 </ReportCard>

 {/* Modal for detail issues - rendered outside ReportCard using Portal */}
 {mounted && detailOpen && createPortal(
 <div
 style={{
 position: 'fixed',
 top: 0,
 left: 0,
 right: 0,
 bottom: 0,
 zIndex: 999999,
 backgroundColor: 'rgba(0, 0, 0, 0.5)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onClick={closeDetail}
 >
 <div
 style={{
 backgroundColor: 'white',
 borderRadius: '0.5rem',
 boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
 width: '90vw',
 maxWidth: '72rem',
 maxHeight: '85vh',
 display: 'flex',
 flexDirection: 'column',
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Modal Header */}
 <div
 style={{
 flexShrink: 0,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 padding: '1.5rem',
 borderBottom: '1px solid #e5e7eb',
 }}
 >
 <div>
 <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
 {detailStatus} Issues
 </h3>
 {detailYearMonth && (
 <p style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem', marginBottom: 0 }}>
 Month: {detailYearMonth}
 </p>
 )}
 </div>
 <button
 type="button"
 onClick={closeDetail}
 style={{
 color: '#9ca3af',
 cursor: 'pointer',
 background: 'none',
 border: 'none',
 padding: 0,
 }}
 aria-label="Close"
 >
 <svg
 style={{ width: '1.5rem', height: '1.5rem' }}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 </div>

 {/* Modal Content - Flex container for DataTable */}
 <div
 style={{
 flex: 1,
 minHeight: 0,
 padding: '1.5rem',
 paddingTop: '1rem',
 paddingBottom: '1rem',
 display: 'flex',
 flexDirection: 'column',
 }}
 >
 {fetchingDetailOnly || !detailDataMatches ? (
 <div style={{
 flex: 1,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 flexDirection: 'column',
 gap: '1rem',
 }}>
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading issues...</div>
 </div>
 ) : (
 <DataTable<IssueStatusDurationIssue>
 data={detailIssues}
 columns={detailColumns}
 loading={false}
 emptyMessage="No issues found for this status."
 rowKey={(row, index) => `${row.issue_key || 'issue'}-${index}`}
 maxHeight="calc(85vh - 260px)"
 />
 )}
 </div>

 {/* Modal Footer */}
 <div
 style={{
 flexShrink: 0,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'flex-end',
 gap: '0.75rem',
 padding: '1.5rem',
 borderTop: '1px solid #e5e7eb',
 backgroundColor: '#f9fafb',
 }}
 >
 <button
 type="button"
 onClick={closeDetail}
 style={{
 padding: '0.5rem 1rem',
 fontSize: '0.875rem',
 fontWeight: 500,
 color: '#374151',
 backgroundColor: 'white',
 border: '1px solid #d1d5db',
 borderRadius: '0.5rem',
 cursor: 'pointer',
 }}
 >
 Close
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </>
 );
};

export default FlowStatusDurationView;

