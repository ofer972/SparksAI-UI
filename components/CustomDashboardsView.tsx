'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { 
 getUserDashboards, 
 createDashboard, 
 deleteDashboard,
 getUserPreferences,
} from '@/lib/api';
import { ApiService } from '@/lib/api';
import type { CustomDashboard, CreateDashboardRequest, DashboardLayoutConfig, DashboardWidget } from '@/lib/config';
import ReportCard from './reporting/ReportCard';
import ReportPanel from './ReportPanel';
import InsightTypeWidget from './InsightTypeWidget';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Component to render real dashboard snapshot preview
const DashboardLayoutPreview: React.FC<{ 
 layoutConfig?: DashboardLayoutConfig;
 dashboardId: string;
}> = ({ layoutConfig, dashboardId }) => {
 if (!layoutConfig?.layoutConfig?.rows || layoutConfig.layoutConfig.rows.length === 0) {
 return (
 <div className="h-28 bg-surface-elevated rounded-lg flex items-center justify-center border border-outline">
 <div className="text-center">
 <svg className="h-5 w-5 text-content-muted mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 <p className="text-xs text-content-muted font-medium">Empty dashboard</p>
 </div>
 </div>
 );
 }

 const rows = layoutConfig.layoutConfig.rows;
 const totalWidgets = rows.reduce((sum, row) => sum + row.widgets.length, 0);
 
 // Limit preview to first 2 rows or 4 widgets max for performance
 const maxPreviewRows = 2;
 const maxPreviewWidgets = 4;
 const previewRows = rows.slice(0, maxPreviewRows);
 let widgetCount = 0;

 // Format widget ID to readable name
 const formatWidgetName = (widgetId: string) => {
 return widgetId
 .replace(/-/g, ' ')
 .replace(/\b\w/g, l => l.toUpperCase())
 .substring(0, 20);
 };

 // Render a mini widget card that looks like the real thing
 const renderWidgetPreview = (widget: DashboardWidget) => {
 if (widgetCount >= maxPreviewWidgets) return null;
 widgetCount++;

 const widgetName = formatWidgetName(widget.widget_id);
 const isReport = widget.type === 'report';
 const isInsight = widget.type === 'insight_type';
 
 return (
 <div key={widget.id} className="flex-1 min-w-0">
 <div className="bg-surface rounded border border-outline-strong shadow-sm overflow-hidden h-full">
 {/* Header - matches ReportCard style */}
 <div className={`px-2 py-1 border-b border-outline ${
 isInsight 
 ? 'bg-gradient-to-r from-surface-elevated to-brand/10' 
 : 'bg-gradient-to-r from-brand/10 to-brand/15'
 }`}>
 <div className="flex items-center gap-1">
 <div className="h-2 w-2 rounded bg-blue-400 dark:bg-brand flex-shrink-0"></div>
 <div className="text-[8px] font-semibold text-content-secondary truncate leading-tight">
 {widgetName}
 </div>
 </div>
 </div>
 {/* Content area */}
 <div className="p-1.5 bg-surface h-full">
 <div className="h-full bg-surface-elevated rounded flex items-center justify-center">
 {isReport ? (
 <svg className="h-3 w-3 text-content-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 ) : isInsight ? (
 <svg className="h-3 w-3 text-content-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 ) : null}
 </div>
 </div>
 </div>
 </div>
 );
 };

 return (
 <div className="relative h-28 bg-surface-elevated rounded-lg border border-outline p-1.5 overflow-hidden">
 <div className="h-full flex flex-col gap-1.5">
 {previewRows.map((row, rowIndex) => {
 const rowWidgets = row.widgets.slice(0, 2); // Max 2 widgets per row in preview
 if (rowWidgets.length === 0) return null;
 
 return (
 <div key={row.id} className="flex gap-1.5 flex-1 min-h-0">
 {rowWidgets.map((widget) => renderWidgetPreview(widget))}
 {/* Fill space if row has fewer widgets */}
 {rowWidgets.length < 2 && (
 <div className="flex-1" />
 )}
 </div>
 );
 })}
 </div>
 {/* Show more indicator */}
 {totalWidgets > maxPreviewWidgets && (
 <div className="absolute bottom-1.5 right-1.5 bg-content-primary/80 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded shadow-sm z-10">
 +{totalWidgets - maxPreviewWidgets}
 </div>
 )}
 </div>
 );
};

interface CustomDashboardsViewProps {
 onSelectDashboard?: (dashboardId: string) => void;
 onDashboardCreated?: () => void; // Callback to refresh dashboards list in parent
}

export default function CustomDashboardsView({ onSelectDashboard, onDashboardCreated }: CustomDashboardsViewProps) {
 const { user } = useUser();
 const { teams } = useTeamsGroups();
 const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [isCreating, setIsCreating] = useState(false);
 const [newDashboardName, setNewDashboardName] = useState('');
 const [newDashboardDescription, setNewDashboardDescription] = useState('');
 const [deleteModalOpen, setDeleteModalOpen] = useState(false);
 const [dashboardToDelete, setDashboardToDelete] = useState<{ id: string; name: string } | null>(null);

 useEffect(() => {
 if (user?.id || user?.user_id) {
 loadDashboards();
 }
 }, [user]);

 const loadDashboards = async () => {
 if (!user?.id && !user?.user_id) return;
 
 setLoading(true);
 setError(null);
 try {
 const userId = (user?.id || user?.user_id) as string;
 const data = await getUserDashboards(userId);
 setDashboards(data);
 } catch (err: any) {
 setError(err.message || 'Failed to load dashboards');
 } finally {
 setLoading(false);
 }
 };

 const handleCreateDashboard = async () => {
 if (!newDashboardName.trim()) {
 setError('Dashboard name is required');
 return;
 }

 if (!user?.id && !user?.user_id) {
 setError('User not found');
 return;
 }

 setIsCreating(true);
 setError(null);
 try {
 const userId = (user?.id || user?.user_id) as string;
 
 // Get user's default team/group from preferences
 let defaultFilters: Record<string, any> = {};
 try {
 const preferences = await getUserPreferences(userId);
 if (preferences?.default_team_or_group && preferences.default_type) {
 let teamGroupName = preferences.default_team_or_group;
 // Clean the team/group name (in case it has tree value format from old data)
 if (teamGroupName.includes(':')) {
 teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
 }
 
 // Find the team/group in the teams list
 const team = teams.find(t => 
 t.team_name === teamGroupName || 
 (preferences.default_type === 'group' && t.group_names?.includes(teamGroupName))
 );
 
 if (team) {
 const treeValue = preferences.default_type === 'group' 
 ? `group:${team.team_key || teamGroupName}`
 : `team:${team.team_key || teamGroupName}`;
 
 defaultFilters = {
 selectedTreeValue: treeValue,
 selectedTreeLabel: teamGroupName,
 selectedTreeType: preferences.default_type,
 selectedTeam: teamGroupName,
 };
 } else if (teams.length > 0) {
 // Fallback: use first team if default preference not found in teams list
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 defaultFilters = {
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team',
 selectedTeam: firstTeam.team_name,
 };
 }
 } else if (teams.length > 0) {
 // No default preference, use first team as fallback
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 defaultFilters = {
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team',
 selectedTeam: firstTeam.team_name,
 };
 }
 } catch (prefErr) {
 console.warn('[CustomDashboardsView] Failed to load user preferences:', prefErr);
 // If preferences fail, use first team as fallback if available
 if (teams.length > 0) {
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 defaultFilters = {
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team',
 selectedTeam: firstTeam.team_name,
 };
 }
 }
 
 // Get current PI if no PI is set in defaultFilters
 // Use getCurrentAndNextPIs() and take the first one if multiple results
 if (!defaultFilters.selectedPI) {
 try {
 console.log('[CustomDashboardsView] Fetching current PI...');
 const apiService = new ApiService();
 const piResponse = await apiService.getCurrentAndNextPIs();
 console.log('[CustomDashboardsView] PI response:', piResponse);
 // The API returns {current_pis: [], next_pis: []} structure
 const currentPIs = (piResponse as any).current_pis || [];
 if (currentPIs.length > 0) {
 // Use the first PI from the current_pis list
 defaultFilters.selectedPI = currentPIs[0].pi_name;
 console.log('[CustomDashboardsView] Set default PI to:', defaultFilters.selectedPI);
 } else {
 console.warn('[CustomDashboardsView] No current PIs returned from API');
 }
 } catch (piErr) {
 console.error('[CustomDashboardsView] Failed to load current PI for default:', piErr);
 // Continue without PI - user can select one later
 }
 } else {
 console.log('[CustomDashboardsView] PI already set in defaultFilters:', defaultFilters.selectedPI);
 }
 
 const dashboardData: CreateDashboardRequest = {
 name: newDashboardName.trim(),
 description: newDashboardDescription.trim() || undefined,
 layout_config: {
 layoutConfig: { rows: [] },
 pinnedFilters: {},
 reportFilters: {},
 topBarFilters: defaultFilters,
 },
 };
 
 console.log('[CustomDashboardsView] Creating dashboard with filters:', defaultFilters);
 const newDashboard = await createDashboard(userId, dashboardData);
 console.log('[CustomDashboardsView] Created dashboard:', newDashboard);
 setDashboards([newDashboard, ...dashboards]);
 setNewDashboardName('');
 setNewDashboardDescription('');
 setIsCreating(false);
 
 // Notify parent to refresh dashboards list (for left menu panel)
 if (onDashboardCreated) {
 onDashboardCreated();
 }
 
 // If callback provided, navigate to the new dashboard
 if (onSelectDashboard) {
 onSelectDashboard(newDashboard.id);
 }
 } catch (err: any) {
 setError(err.message || 'Failed to create dashboard');
 setIsCreating(false);
 }
 };

 const handleDeleteDashboard = (dashboardId: string, dashboardName: string) => {
 setDashboardToDelete({ id: dashboardId, name: dashboardName });
 setDeleteModalOpen(true);
 };

 const confirmDeleteDashboard = async () => {
 if (!dashboardToDelete) return;

 if (!user?.id && !user?.user_id) {
 setError('User not found');
 setDeleteModalOpen(false);
 setDashboardToDelete(null);
 return;
 }

 try {
 const userId = (user?.id || user?.user_id) as string;
 await deleteDashboard(userId, dashboardToDelete.id);
 setDashboards(dashboards.filter(d => d.id !== dashboardToDelete.id));
 setDeleteModalOpen(false);
 setDashboardToDelete(null);
 
 // Notify parent to refresh dashboards list (for left menu panel)
 if (onDashboardCreated) {
 onDashboardCreated();
 }
 } catch (err: any) {
 setError(err.message || 'Failed to delete dashboard');
 setDeleteModalOpen(false);
 setDashboardToDelete(null);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-full min-h-[600px]">
 <div className="flex flex-col items-center space-y-3">
 <div className="animate-spin rounded-full h-8 w-8 border-2 border-surface-secondary border-t-brand"></div>
 <div className="text-sm text-content-tertiary">Loading dashboards...</div>
 </div>
 </div>
 );
 }

 return (
 <div className="h-full flex flex-col bg-surface">
 <div className="flex-1 overflow-auto">
 {/* Hero Header Section */}
 <div className="bg-gradient-to-br from-brand via-brand to-brand text-white">
 <div className="max-w-7xl mx-auto px-6 py-12">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="text-4xl font-bold mb-2">My Dashboards</h1>
 <p className="text-blue-100 text-lg">Create and manage your custom dashboards</p>
 </div>
 <div className="hidden md:block">
 <div className="p-4 bg-surface/10 backdrop-blur-sm rounded-2xl border border-white/20">
 <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 </div>
 </div>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-300/50 rounded-xl">
 <div className="flex items-center gap-2">
 <svg className="h-5 w-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-sm text-white font-medium">{error}</p>
 </div>
 </div>
 )}

 {/* Create Dashboard Card - Inline in header */}
 <div className="bg-surface/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-outline/20 p-6">
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 bg-brand rounded-lg">
 <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 </div>
 <h2 className="text-xl font-bold text-content-primary">Create New Dashboard</h2>
 </div>
 <div className="grid md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-content-secondary mb-2">
 Dashboard Name <span className="text-danger-text">*</span>
 </label>
 <input
 type="text"
 value={newDashboardName}
 onChange={(e) => setNewDashboardName(e.target.value)}
 placeholder="Enter dashboard name"
 className="w-full px-4 py-3 bg-surface-elevated border-2 border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm text-content-primary placeholder-content-muted transition-all"
 disabled={isCreating}
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-content-secondary mb-2">
 Description <span className="text-content-muted font-normal">(optional)</span>
 </label>
 <input
 type="text"
 value={newDashboardDescription}
 onChange={(e) => setNewDashboardDescription(e.target.value)}
 placeholder="Add a description..."
 className="w-full px-4 py-3 bg-surface-elevated border-2 border-outline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm text-content-primary placeholder-content-muted transition-all"
 disabled={isCreating}
 />
 </div>
 </div>
 <button
 onClick={handleCreateDashboard}
 disabled={isCreating || !newDashboardName.trim()}
 className="mt-4 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-brand to-brand text-white rounded-xl hover:from-brand-hover hover:to-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
 >
 {isCreating ? (
 <>
 <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 <span>Creating Dashboard...</span>
 </>
 ) : (
 <>
 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 <span>Create Dashboard</span>
 </>
 )}
 </button>
 </div>
 </div>
 </div>

 {/* Dashboards Content */}
 <div className="max-w-7xl mx-auto px-6 py-10">
 {dashboards.length === 0 ? (
 <div className="bg-gradient-to-br from-surface-elevated to-brand/10 rounded-2xl border-2 border-dashed border-outline-strong p-20 text-center">
 <div className="max-w-md mx-auto">
 <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-elevated rounded-full shadow-lg mb-6">
 <svg className="h-10 w-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 </div>
 <h3 className="text-2xl font-bold text-content-primary mb-3">No dashboards yet</h3>
 <p className="text-content-tertiary mb-8">Create your first custom dashboard to organize your reports and insights</p>
 </div>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between mb-8">
 <div>
 <h2 className="text-2xl font-bold text-content-primary mb-1">Created Dashboards</h2>
 <p className="text-content-muted text-sm">{dashboards.length} {dashboards.length === 1 ? 'dashboard' : 'dashboards'}</p>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {dashboards.map((dashboard) => (
 <div
 key={dashboard.id}
 className="group bg-surface rounded-2xl border-2 border-outline hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col transform hover:-translate-y-1"
 >
 {/* Card Header with Gradient */}
 <div className="bg-gradient-to-br from-brand/10 via-brand/12 to-brand/15 px-6 pt-6 pb-4 border-b border-outline">
 <div className="flex items-start justify-between gap-3 mb-4">
 <div className="flex-1 min-w-0">
 <h3 className="text-xl font-bold text-content-primary mb-2 truncate group-hover:text-brand transition-colors">
 {dashboard.name}
 </h3>
 {dashboard.description && (
 <p className="text-sm text-content-tertiary line-clamp-2">{dashboard.description}</p>
 )}
 </div>
 </div>
 
 {/* Layout Preview */}
 <div className="mb-4">
 <DashboardLayoutPreview layoutConfig={dashboard.layout_config} dashboardId={dashboard.id} />
 </div>
 
 <div className="flex items-center gap-2 text-xs text-content-muted">
 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 <span>{new Date(dashboard.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
 </div>
 </div>

 {/* Card Actions */}
 <div className="px-6 py-5 bg-surface mt-auto">
 <div className="flex gap-3">
 <button
 onClick={() => onSelectDashboard?.(dashboard.id)}
 className="flex-1 px-5 py-2.5 bg-gradient-to-r from-brand to-brand text-white rounded-xl hover:from-brand-hover hover:to-brand-hover transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
 >
 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
 </svg>
 <span>Open</span>
 </button>
 <button
 onClick={() => handleDeleteDashboard(dashboard.id, dashboard.name)}
 className="px-4 py-2.5 bg-surface-elevated border-2 border-outline-strong text-content-secondary rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-600 hover:text-red-600 dark:hover:text-red-400 transition-all text-sm flex items-center justify-center shadow-sm hover:shadow-md"
 title="Delete dashboard"
 >
 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 </div>

 {/* Delete Confirmation Modal */}
 <DeleteConfirmationModal
 isOpen={deleteModalOpen}
 onClose={() => {
 setDeleteModalOpen(false);
 setDashboardToDelete(null);
 }}
 itemName={`"${dashboardToDelete?.name}"`}
 onConfirm={confirmDeleteDashboard}
 />
 </div>
 );
}

