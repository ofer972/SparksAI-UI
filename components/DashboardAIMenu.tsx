'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_REPORT_COMPONENT_REGISTRY } from './reportComponentsRegistry';

export interface DashboardData {
 layoutConfig: any;
 topBarFilters: Record<string, any>;
 reportFilters: Record<string, any>;
 pinnedFilters: Record<string, any>;
}

interface ReportInfo {
 id: string;
 name: string;
 displayName: string; // Name with filters for display
 widgetId: string; // The actual widget ID in the layout
}

interface DashboardAIMenuProps {
 onOpenAIChat: (dashboardData?: DashboardData | null) => void;
 prompts: any[];
 selectedPrompt: string;
 onPromptChange: (prompt: string) => void;
 loadingPrompts: boolean;
 onCollectDashboardData?: () => Promise<DashboardData | null> | DashboardData | null;
}

function DashboardAIMenu({
 onOpenAIChat,
 prompts,
 selectedPrompt,
 onPromptChange,
 loadingPrompts,
 onCollectDashboardData,
}: DashboardAIMenuProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
 const menuRef = useRef<HTMLDivElement>(null);
 const buttonRef = useRef<HTMLButtonElement>(null);
 const [availableReports, setAvailableReports] = useState<ReportInfo[]>([]);
 const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());

 // Update dropdown position
 const updatePosition = () => {
 if (buttonRef.current) {
 const rect = buttonRef.current.getBoundingClientRect();
 setDropdownPosition({
 top: rect.bottom + 8,
 left: rect.right - 320, // 320px = w-80 (20rem)
 });
 }
 };

 // Helper function to format filter value for display
 const formatFilterValue = (key: string, value: any): string => {
 if (value === null || value === undefined || value === '') return '';
 if (typeof value === 'boolean') return value ? 'Yes' : 'No';
 if (Array.isArray(value)) return value.join(', ');
 return String(value);
 };

 // Helper function to get important filters for display
 const getImportantFilters = (filters: Record<string, any>): string => {
 const importantKeys = ['team_name', 'pi', 'sprint_name', 'selectedTeam', 'selectedPI'];
 const filterParts: string[] = [];
 
 for (const key of importantKeys) {
 if (filters[key]) {
 const value = formatFilterValue(key, filters[key]);
 if (value) {
 const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
 filterParts.push(`${label}: ${value}`);
 }
 }
 }
 
 return filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';
 };

 // Extract available reports from dashboard data when opened
 useEffect(() => {
 if (isOpen && onCollectDashboardData) {
 const fetchReports = async () => {
 const data = await onCollectDashboardData();
 console.log('[DashboardAIMenu] Collected dashboard data:', data);
 console.log('[DashboardAIMenu] reportFilters:', data?.reportFilters);
 console.log('[DashboardAIMenu] pinnedFilters:', data?.pinnedFilters);
 
 if (data?.layoutConfig?.rows) {
 const reports: ReportInfo[] = [];
 const widgetIdToReportId = new Map<string, string>();
 
 // Extract all report widgets from layout (for custom dashboards)
 data.layoutConfig.rows.forEach((row: any, rowIndex: number) => {
 console.log(`[DashboardAIMenu] Processing row ${rowIndex}:`, row);
 
 if (row.widgets) {
 row.widgets.forEach((widget: any, widgetIndex: number) => {
 console.log(`[DashboardAIMenu] Processing widget ${widgetIndex}:`, widget);
 const reportId = widget.widget_id || widget.type;
 // Only include if it's a report (exists in registry) and type is 'report'
 if (widget.type === 'report' && reportId && DEFAULT_REPORT_COMPONENT_REGISTRY[reportId]) {
 console.log(`[DashboardAIMenu] Adding widget: ${widget.id} -> ${reportId}`);
 widgetIdToReportId.set(widget.id, reportId);
 } else {
 console.log(`[DashboardAIMenu] Skipping widget: type=${widget.type}, reportId=${reportId}, inRegistry=${!!DEFAULT_REPORT_COMPONENT_REGISTRY[reportId]}`);
 }
 });
 }
 // Also handle old format with reportIds (for team/pi dashboards and some custom dashboards)
 if (row.reportIds) {
 console.log(`[DashboardAIMenu] Row ${rowIndex} reportIds:`, row.reportIds);
 row.reportIds.forEach((reportId: string, reportIndex: number) => {
 console.log(`[DashboardAIMenu] Checking reportId ${reportIndex}: ${reportId}, inRegistry: ${!!DEFAULT_REPORT_COMPONENT_REGISTRY[reportId]}`);
 if (DEFAULT_REPORT_COMPONENT_REGISTRY[reportId]) {
 // Generate a unique key for each report instance
 const uniqueKey = `${reportId}-${rowIndex}-${reportIndex}`;
 console.log(`[DashboardAIMenu] Adding report from reportIds: ${uniqueKey} -> ${reportId}`);
 widgetIdToReportId.set(uniqueKey, reportId);
 } else {
 console.log(`[DashboardAIMenu] Skipping reportId ${reportId} - not in registry`);
 }
 });
 }
 });
 
 console.log('[DashboardAIMenu] widgetIdToReportId Map:', Array.from(widgetIdToReportId.entries()));
 
 // Count occurrences of each report type
 const reportTypeCounts = new Map<string, number>();
 widgetIdToReportId.forEach((reportId) => {
 reportTypeCounts.set(reportId, (reportTypeCounts.get(reportId) || 0) + 1);
 });
 
 console.log('[DashboardAIMenu] reportTypeCounts:', Array.from(reportTypeCounts.entries()));
 console.log('[DashboardAIMenu] reportFilters keys:', Object.keys(data.reportFilters || {}));
 
 // Build report info with display names - always show filter info for custom dashboards
 widgetIdToReportId.forEach((reportId, widgetId) => {
 // Convert report ID to readable name
 const baseName = reportId
 .split('-')
 .map(word => word.charAt(0).toUpperCase() + word.slice(1))
 .join(' ');
 
 let displayName = baseName;
 
 // Try looking up filters using the unique key first (new format from CustomDashboardEditor)
 // Then fallback to actual reportId (for team/pi dashboards)
 let filterLookupKey = widgetId;
 let reportFilters = data.reportFilters?.[widgetId] || {};
 
 // If no filters found with unique key, try extracting the reportId for backwards compatibility
 if (Object.keys(reportFilters).length === 0 && widgetId.match(/^(.+)-\d+-\d+$/)) {
 const match = widgetId.match(/^(.+)-\d+-\d+$/);
 if (match) {
 filterLookupKey = match[1];
 reportFilters = data.reportFilters?.[filterLookupKey] || {};
 }
 }
 
 console.log(`[DashboardAIMenu] Looking up filters for widgetId=${widgetId}, filterLookupKey=${filterLookupKey}`);
 console.log(`[DashboardAIMenu] Found filters:`, reportFilters);
 
 // Always add filter info for custom dashboards to help distinguish reports
 const filterInfo = getImportantFilters(reportFilters);
 if (filterInfo) {
 displayName = baseName + filterInfo;
 }
 
 console.log(`[DashboardAIMenu] Adding report: ${widgetId} - ${displayName}`);
 
 reports.push({
 id: widgetId,
 name: baseName,
 displayName,
 widgetId
 });
 });
 
 console.log('[DashboardAIMenu] Final reports:', reports);
 
 setAvailableReports(reports);
 // Select all reports by default
 setSelectedReports(new Set(reports.map(r => r.id)));
 }
 };
 fetchReports();
 }
 }, [isOpen, onCollectDashboardData]);

 // Update position when opened
 useEffect(() => {
 if (isOpen) {
 updatePosition();
 }
 }, [isOpen]);

 // Update position on window resize or scroll
 useEffect(() => {
 if (!isOpen) return;

 window.addEventListener('resize', updatePosition);
 window.addEventListener('scroll', updatePosition, true);

 return () => {
 window.removeEventListener('resize', updatePosition);
 window.removeEventListener('scroll', updatePosition, true);
 };
 }, [isOpen]);

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (
 menuRef.current && 
 !menuRef.current.contains(event.target as Node) &&
 buttonRef.current &&
 !buttonRef.current.contains(event.target as Node)
 ) {
 setIsOpen(false);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
 };
 }, []);

 // Toggle report selection
 const toggleReport = (reportId: string) => {
 setSelectedReports(prev => {
 const newSet = new Set(prev);
 if (newSet.has(reportId)) {
 newSet.delete(reportId);
 } else {
 newSet.add(reportId);
 }
 return newSet;
 });
 };

 // Toggle all reports
 const toggleAllReports = () => {
 if (selectedReports.size === availableReports.length) {
 setSelectedReports(new Set());
 } else {
 setSelectedReports(new Set(availableReports.map(r => r.id)));
 }
 };

 // Filter dashboard data to only include selected reports
 const filterDashboardData = (data: DashboardData | null): DashboardData | null => {
 if (!data || selectedReports.size === 0) return data;
 
 // Build a set of selected unique keys AND extract actual report IDs
 const selectedUniqueKeys = new Set(selectedReports);
 const selectedActualReportIds = new Set<string>(); // Actual report IDs for filtering reportFilters/pinnedFilters
 
 // Map to track which row/index combinations are selected
 const selectedRowReportIndices = new Map<number, Set<number>>();
 
 selectedUniqueKeys.forEach(key => {
 // Check if it's a unique key format (reportId-rowIndex-reportIndex)
 // The format is: actualReportId-rowIndex-reportIndex
 const match = key.match(/^(.+)-(\d+)-(\d+)$/);
 if (match) {
 const actualReportId = match[1];
 const rowIndex = parseInt(match[2]);
 const reportIndex = parseInt(match[3]);
 
 // Track the actual report ID for filtering reportFilters/pinnedFilters
 selectedActualReportIds.add(actualReportId);
 
 if (!isNaN(rowIndex) && !isNaN(reportIndex)) {
 if (!selectedRowReportIndices.has(rowIndex)) {
 selectedRowReportIndices.set(rowIndex, new Set());
 }
 selectedRowReportIndices.get(rowIndex)!.add(reportIndex);
 }
 } else {
 // For widget format (not unique key), the key IS the actual report ID or widget ID
 // Also add it as an actual report ID for filtering
 selectedActualReportIds.add(key);
 }
 });
 
 console.log('[DashboardAIMenu] filterDashboardData - selectedUniqueKeys:', Array.from(selectedUniqueKeys));
 console.log('[DashboardAIMenu] filterDashboardData - selectedActualReportIds:', Array.from(selectedActualReportIds));
 console.log('[DashboardAIMenu] filterDashboardData - selectedRowReportIndices:', Array.from(selectedRowReportIndices.entries()));
 console.log('[DashboardAIMenu] filterDashboardData - data.reportFilters keys:', Object.keys(data.reportFilters || {}));
 console.log('[DashboardAIMenu] filterDashboardData - data.pinnedFilters keys:', Object.keys(data.pinnedFilters || {}));
 
 // Filter layoutConfig to only include selected reports/widgets
 const filteredLayoutConfig = {
 ...data.layoutConfig,
 rows: data.layoutConfig.rows
 .map((row: any, rowIndex: number) => {
 const filteredRow = { ...row };
 
 // Handle widgets (for custom dashboards with new format)
 if (row.widgets) {
 filteredRow.widgets = row.widgets.filter((widget: any) => 
 selectedUniqueKeys.has(widget.id)
 );
 }
 
 // Handle reportIds (for team/pi dashboards and custom dashboards with old format)
 if (row.reportIds) {
 const selectedIndices = selectedRowReportIndices.get(rowIndex);
 if (selectedIndices) {
 filteredRow.reportIds = row.reportIds.filter((_: string, index: number) => 
 selectedIndices.has(index)
 );
 } else {
 // No specific index selection for this row - check if all reports in row are selected by actual ID
 filteredRow.reportIds = row.reportIds.filter((reportId: string) => 
 selectedActualReportIds.has(reportId)
 );
 }
 }
 
 return filteredRow;
 })
 .filter((row: any) => 
 (row.widgets && row.widgets.length > 0) || (row.reportIds && row.reportIds.length > 0)
 ) // Remove empty rows
 };

 // Filter reportFilters and pinnedFilters
 // Keys can be either:
 // 1. Unique keys like"team-sprint-burndown-0-0" (from CustomDashboardEditor)
 // 2. Actual report IDs like"team-sprint-burndown" (from Team/PI dashboards)
 const filteredReportFilters: Record<string, any> = {};
 const filteredPinnedFilters: Record<string, any> = {};
 
 Object.keys(data.reportFilters || {}).forEach(key => {
 // Check if key is a selected unique key (new format)
 if (selectedUniqueKeys.has(key)) {
 filteredReportFilters[key] = data.reportFilters[key];
 } else if (selectedActualReportIds.has(key)) {
 // Backwards compatibility: key is an actual report ID (team/pi dashboards)
 filteredReportFilters[key] = data.reportFilters[key];
 } else {
 // Check if the key is a unique key that matches a selected actual report ID
 const match = key.match(/^(.+)-\d+-\d+$/);
 if (match && selectedActualReportIds.has(match[1])) {
 filteredReportFilters[key] = data.reportFilters[key];
 }
 }
 });
 
 Object.keys(data.pinnedFilters || {}).forEach(key => {
 // Check if key is a selected unique key (new format)
 if (selectedUniqueKeys.has(key)) {
 filteredPinnedFilters[key] = data.pinnedFilters[key];
 } else if (selectedActualReportIds.has(key)) {
 // Backwards compatibility: key is an actual report ID (team/pi dashboards)
 filteredPinnedFilters[key] = data.pinnedFilters[key];
 } else {
 // Check if the key is a unique key that matches a selected actual report ID
 const match = key.match(/^(.+)-\d+-\d+$/);
 if (match && selectedActualReportIds.has(match[1])) {
 filteredPinnedFilters[key] = data.pinnedFilters[key];
 }
 }
 });
 
 console.log('[DashboardAIMenu] filterDashboardData - filteredReportFilters:', filteredReportFilters);
 console.log('[DashboardAIMenu] filterDashboardData - filteredPinnedFilters:', filteredPinnedFilters);

 return {
 ...data,
 layoutConfig: filteredLayoutConfig,
 reportFilters: filteredReportFilters,
 pinnedFilters: filteredPinnedFilters
 };
 };

 const dropdownContent = isOpen && (
 <div 
 ref={menuRef}
 className="fixed w-80 bg-surface border border-outline rounded-2xl shadow-2xl z-[99999] overflow-hidden backdrop-blur-sm"
 style={{
 top: `${dropdownPosition.top}px`,
 left: `${dropdownPosition.left}px`,
 }}
 >
 {/* Header with gradient */}
 <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-5 py-4">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-surface/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
 </svg>
 </div>
 <div>
 <h3 className="text-white font-semibold text-base">AI Assistant</h3>
 <p className="text-blue-100 text-xs">Powered by AI</p>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="p-5 space-y-4">
 {/* Report Selection */}
 {availableReports.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="flex items-center space-x-2 text-xs font-semibold text-content-secondary">
 <svg className="w-4 h-4 text-indigo-500 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <span>Select Reports ({selectedReports.size}/{availableReports.length})</span>
 </label>
 <button
 onClick={toggleAllReports}
 className="text-xs text-brand hover:text-blue-700 hover:text-blue-300 font-medium"
 >
 {selectedReports.size === availableReports.length ? 'Deselect All' : 'Select All'}
 </button>
 </div>
 <div className="max-h-48 overflow-y-auto bg-surface-elevated/50 rounded-xl p-3 space-y-2 border border-outline">
 {availableReports.map((report) => (
 <label
 key={report.id}
 className="flex items-start space-x-2 cursor-pointer hover:bg-surface dark:hover:bg-slate-800 rounded-lg p-2 transition-colors"
 >
 <input
 type="checkbox"
 checked={selectedReports.has(report.id)}
 onChange={() => toggleReport(report.id)}
 className="w-4 h-4 text-brand border-outline-strong rounded focus:ring-brand mt-0.5 flex-shrink-0"
 />
 <span className="text-sm text-content-secondary break-words">{report.displayName}</span>
 </label>
 ))}
 </div>
 </div>
 )}

 {/* AI Insights Button */}
 <button
 onClick={async () => {
 console.log('[DashboardAIMenu] Collecting dashboard data...');
 const dashboardData = await onCollectDashboardData?.();
 console.log('[DashboardAIMenu] Collected dashboard data:', dashboardData);
 const filteredData = filterDashboardData(dashboardData || null);
 console.log('[DashboardAIMenu] Filtered dashboard data:', filteredData);
 onOpenAIChat(filteredData);
 setIsOpen(false);
 }}
 disabled={selectedReports.size === 0}
 className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
 >
 <div className="absolute inset-0 bg-surface/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
 <div className="relative flex items-center justify-center space-x-2">
 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
 </svg>
 <span>Open AI Insights</span>
 </div>
 </button>

 {/* Divider */}
 <div className="relative">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-outline"></div>
 </div>
 <div className="relative flex justify-center text-xs">
 <span className="px-2 bg-surface text-content-muted">Customize</span>
 </div>
 </div>

 {/* Prompt Selector */}
 <div className="space-y-2">
 <label className="flex items-center space-x-2 text-xs font-semibold text-content-secondary">
 <svg className="w-4 h-4 text-indigo-500 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
 </svg>
 <span>Select Prompt</span>
 </label>
 <select
 value={selectedPrompt}
 onChange={(e) => onPromptChange(e.target.value)}
 disabled={loadingPrompts}
 className="w-full px-3 py-2.5 bg-surface-elevated/50 border border-outline rounded-xl text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all hover:bg-surface-secondary dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <option value="">Choose a prompt template...</option>
 {prompts.map((prompt) => (
 <option key={`${prompt.email_address}/${prompt.prompt_name}`} value={prompt.prompt_name}>
 {prompt.prompt_name}
 </option>
 ))}
 </select>
 {loadingPrompts && (
 <p className="text-xs text-content-muted flex items-center space-x-1">
 <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 <span>Loading prompts...</span>
 </p>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="px-5 py-3 bg-surface-elevated/50 border-t border-outline">
 <p className="text-xs text-content-muted text-center">
 💡 Tip: Select a prompt to customize your AI experience
 </p>
 </div>
 </div>
 );

 return (
 <>
 <button
 ref={buttonRef}
 onClick={() => setIsOpen(!isOpen)}
 className="inline-flex items-center justify-center gap-2 h-7 px-2 rounded-lg border border-outline-strong text-content-muted hover:text-brand hover:border-brand hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
 aria-label="Open AI Menu"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 <span className="text-xs font-medium">AI</span>
 </button>

 {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
 </>
 );
}

export default DashboardAIMenu;
