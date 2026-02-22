'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, refreshAccessToken, clearTokens, getCurrentUser, logout, getLoginUrl, setAuthRedirect } from '@/lib/auth';
import SparksAILogo from '@/components/SparksAILogo';
import SprintKPIs from '@/components/SprintKPIs';
import PIMetrics from '@/components/PIMetrics';
import PIDashboardView from '@/components/PIDashboardView';
import { getPITerminology, piLabel } from '@/lib/piTerminology';
import GeneralDataView from '@/components/GeneralDataView';
import AIChatModal from '@/components/AIChatModal';
import { ApiService, verifyAdmin } from '@/lib/api';
import TopBar from '@/components/TopBar';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { usePageSettings } from '@/hooks/usePageSettings';
import { GitHubSettingsProvider, useGitHubSettings } from '@/contexts/GitHubSettingsContext';
import TeamAIInsightsView from '@/components/views/TeamAIInsightsView';
import TeamDashboardView from '@/components/views/TeamDashboardView';
import SystemSettingsView from '@/components/views/SystemSettingsView';
import CreateAgentJobView from '@/components/views/CreateAgentJobView';
import UploadTranscriptsView from '@/components/views/UploadTranscriptsView';
import UsersAdminView from '@/components/views/UsersAdminView';
import TeamsAndMeetingsView from '@/components/views/TeamsAndMeetingsView';
import JiraSettingsView from '@/components/views/JiraSettingsView';
import GitHubSettingsView from '@/components/views/GitHubSettingsView';
import UserSettingsView from '@/components/views/UserSettingsView';
import UnsavedChangesModal from '@/components/UnsavedChangesModal';
import JiraSetupModal from '@/components/JiraSetupModal';
import WelcomeModal, { OnboardingTeamSelection } from '@/components/WelcomeModal';
import { useJiraConfigurationCheck } from '@/hooks/etl/useJiraConfigurationCheck';
import { useUserPreferences, useUser } from '@/contexts/UserContext';
import CustomDashboardsView from '@/components/CustomDashboardsView';
import CustomDashboardEditor from '@/components/CustomDashboardEditor';
import { getUserDashboards, getUserPreferences, updateDashboard, createDashboard } from '@/lib/api';
import type { CustomDashboard } from '@/lib/config';
import GoalProgressTab from '@/components/GoalProgressTab';
import PIGoalsTab from '@/components/PIGoalsTab';
import SprintGoalsTab from '@/components/SprintGoalsTab';
import HomeDashboard from '../components/home/HomeDashboard';
import HomeDetailPlaceholder from '../components/home/HomeDetailPlaceholder';
import InsightDashboard from '../components/home/InsightDashboard';
import GitHubAnalysisView from '@/components/GitHubAnalysisView';
import KPIDashboard from '@/components/KPIDashboard';
import type { KPIDashboardData } from '@/components/DORAKPIs';
import type { KPIDashboardData as SprintKPIDashboardData } from '@/components/SprintKPIs';
import type { BreadcrumbItem, NavItemId } from '@/lib/nav';
import type { AICard } from '@/lib/config';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

function HomeContent() {
 const router = useRouter();
 const { groups, teams, loading: teamsLoading } = useTeamsGroups();
 const { isDORAEnabled } = useGitHubSettings();
 
 // Page settings hooks for insights pages
 const teamInsightSettings = usePageSettings('team-insight');
 
 const [authChecked, setAuthChecked] = useState(false);
 const [pendingRestore, setPendingRestore] = useState<{dashboard: string, filters: any} | null>(null);
 const initializedTreeValues = useRef(false);
 const appliedRestoreRef = useRef(false);
 const userNavigatedRef = useRef(false);
 useEffect(() => {
 (async () => {
 const token = getAccessToken();
 async function goLogin() {
 clearTokens();
 const loginUrl = getLoginUrl();
 const path = (typeof window !== 'undefined') ? (window.location.pathname || '/') : '';
 const hash = (typeof window !== 'undefined') ? window.location.hash : '';
 const redirect = path + hash;
 if (redirect.startsWith('/') && !redirect.startsWith('//')) setAuthRedirect(redirect);
 try { router.replace(loginUrl); } catch {}
 if (typeof window !== 'undefined') window.location.assign(loginUrl);
 }
 if (!token) {
 const ok = await refreshAccessToken();
 if (!ok) return goLogin();
 }
 setAuthChecked(true);
 })();
 }, [router]);

 // Apply pending filter restore when teams/groups finish loading (only once)
 useEffect(() => {
 if (!teamsLoading && pendingRestore && (groups.length > 0 || teams.length > 0) && !appliedRestoreRef.current) {
 console.log('[Dashboard Settings] Teams/groups loaded, applying pending restore');
 applyFilterRestore(pendingRestore.dashboard, pendingRestore.filters);
 setPendingRestore(null);
 appliedRestoreRef.current = true;
 }
 }, [teamsLoading, groups, teams, pendingRestore]);

 const applyFilterRestore = (dashboard: string, filters: any) => {
 console.log(`[Dashboard Settings] Applying filter restore for ${dashboard}:`, filters);
 
 const findTreeValueByName = (name: string, type: 'group' | 'team'): string | null => {
 if (type === 'group') {
 const group = groups.find(g => g.group_name === name);
 return group ? `group:${group.group_key}` : null;
 } else {
 const team = teams.find(t => t.team_name === name);
 return team ? `team:${team.team_key}` : null;
 }
 };
 
 // Restore filters based on dashboard type
 if (dashboard === 'team-dashboard' && filters) {
 const newFilters = { ...teamDashboardFilters };
 
 if (filters.selectedTeam !== undefined && filters.selectedTreeType !== undefined) {
 newFilters.selectedTeam = filters.selectedTeam;
 newFilters.selectedTreeType = filters.selectedTreeType;
 newFilters.selectedTreeLabel = filters.selectedTeam;
 
 // Find and set the tree value from the team/group name
 const treeValue = findTreeValueByName(filters.selectedTeam, filters.selectedTreeType);
 console.log(`[Dashboard Settings] Found tree value for ${filters.selectedTeam}:`, treeValue);
 if (treeValue) {
 newFilters.selectedTreeValue = treeValue;
 } else {
 console.warn(`[Dashboard Settings] Could not find tree value for ${filters.selectedTeam} (${filters.selectedTreeType})`);
 }
 }
 
 console.log('[Dashboard Settings] Setting team dashboard filters to:', newFilters);
 setTeamDashboardFilters(newFilters);
 
 // Note: Legacy state will be updated by the useEffect that watches teamDashboardFilters
 } else if (dashboard === 'pi-dashboard' && filters) {
 const newFilters = { ...piDashboardFilters };
 
 if (filters.selectedPI !== undefined) {
 newFilters.selectedPI = filters.selectedPI;
 }
 
 if (filters.selectedTeam !== undefined && filters.selectedTreeType !== undefined) {
 newFilters.selectedTeam = filters.selectedTeam;
 newFilters.selectedTreeType = filters.selectedTreeType;
 newFilters.selectedTreeLabel = filters.selectedTeam;
 
 // Find and set the tree value from the team/group name
 const treeValue = findTreeValueByName(filters.selectedTeam, filters.selectedTreeType);
 console.log(`[Dashboard Settings] Found tree value for ${filters.selectedTeam}:`, treeValue);
 if (treeValue) {
 newFilters.selectedTreeValue = treeValue;
 } else {
 console.warn(`[Dashboard Settings] Could not find tree value for ${filters.selectedTeam} (${filters.selectedTreeType})`);
 }
 }
 
 setPiDashboardFilters(newFilters);
 
 // Note: Legacy state will be updated by the useEffect that watches piDashboardFilters
 }
 };

 const [activeNavItem, setActiveNavItem] = useState<NavItemId>('home');
 const prevActiveNavItemRef = useRef<NavItemId>(activeNavItem);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
 const [insightMetricsTab, setInsightMetricsTab] = useState<'team' | 'pi'>('team');

 // Home dashboard placeholder navigation state
  type HomeDetail = {
    id: string;
    title: string;
    description?: string;
    kind?: 'metric' | 'insight' | 'goal' | 'shortcut';
  };
  const [homeDetail, setHomeDetail] = useState<HomeDetail | null>(null);
  const [selectedInsightCard, setSelectedInsightCard] = useState<AICard | null>(null);
  const [selectedKPIDashboard, setSelectedKPIDashboard] = useState<KPIDashboardData | null>(null);
  useEffect(() => {
    if (activeNavItem === 'home') {
      setHomeDetail(null);
      setSelectedInsightCard(null);
      setSelectedKPIDashboard(null);
    }
  }, [activeNavItem]);
 
// Function to check if current view has unsaved changes
const hasUnsavedChanges = () => {
// team-ai-insights no longer saves filter state - filters reset to user defaults on each visit
return false;
};
 
 // Function to handle navigation with unsaved changes check
 const handleNavigation = (navItem: NavItemId | string) => {
 // Handle custom dashboard IDs (format:"custom-dashboard-{id}")
 if (typeof navItem === 'string' && navItem.startsWith('custom-dashboard-')) {
 const dashboardId = navItem.replace('custom-dashboard-', '');
 setSelectedCustomDashboardId(dashboardId);
 setActiveNavItem('custom-dashboard-editor');
 setMobileSidebarOpen(false);
 return;
 }

 if (navItem === activeNavItem) {
 return; // Already on this view
 }
 
 if (hasUnsavedChanges()) {
 // Show confirmation modal
 setPendingNavItem(navItem as NavItemId);
 setShowUnsavedChangesModal(true);
 } else {
 // Navigate directly
 userNavigatedRef.current = true; // User has navigated, allow normal rendering
 setActiveNavItem(navItem as NavItemId);
 setMobileSidebarOpen(false);
 }
 };
 
// Handle save and navigate
const handleSaveAndNavigate = async () => {
try {
// Navigate to pending item
if (pendingNavItem) {
userNavigatedRef.current = true; // User has navigated, allow normal rendering
setActiveNavItem(pendingNavItem);
setMobileSidebarOpen(false);
}
} catch (err) {
console.error('Error saving settings:', err);
setMessage({ type: 'error', text: 'Failed to save settings' });
setTimeout(() => setMessage(null), 3000);
} finally {
setShowUnsavedChangesModal(false);
setPendingNavItem(null);
}
};
 
 // Handle discard and navigate
 const handleDiscardAndNavigate = () => {
 if (pendingNavItem) {
 userNavigatedRef.current = true; // User has navigated, allow normal rendering
 setActiveNavItem(pendingNavItem);
 setMobileSidebarOpen(false);
 }
 setShowUnsavedChangesModal(false);
 setPendingNavItem(null);
 };
 
 // Handle cancel navigation
 const handleCancelNavigation = () => {
 setShowUnsavedChangesModal(false);
 setPendingNavItem(null);
 };
 
 // Reset appliedRestoreRef only when changing between different dashboard types
 useEffect(() => {
 const prevNav = prevActiveNavItemRef.current;
 const currentNav = activeNavItem;
 
 // Reset if switching between different dashboard types or entering a dashboard from non-dashboard
 const isDashboardNav = (nav: NavItemId) => nav === 'team-dashboard' || nav === 'pi-dashboard';
 
 if (isDashboardNav(currentNav) && prevNav !== currentNav) {
 console.log(`[App] Switching dashboard types from ${prevNav} to ${currentNav}, resetting restore flag`);
 appliedRestoreRef.current = false;
 }
 
 
 prevActiveNavItemRef.current = currentNav;
 }, [activeNavItem]);
 
 // Separate filter state for each view
 const [teamDashboardFilters, setTeamDashboardFilters] = useState({
 selectedTeam: '',
 selectedTreeValue: null as string | null,
 selectedTreeLabel: '',
 selectedTreeType: 'team' as 'group' | 'team',
 });
 
 const [piDashboardFilters, setPiDashboardFilters] = useState({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null as string | null,
 selectedTreeLabel: '',
 selectedTreeType: 'team' as 'group' | 'team',
 });
 
 const [teamInsightsFilters, setTeamInsightsFilters] = useState({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null as string | null,
 selectedTreeLabel: '',
 selectedTreeType: 'team' as 'group' | 'team',
 selectedCategories: [] as string[],
 });
 
 // Store current PI name for badge display in AI Insights
 const [currentPIName, setCurrentPIName] = useState<string>('');
 
 // Auto-switch metrics tab based ONLY on focus checkboxes (selectedCategories)
 useEffect(() => {
 if (activeNavItem === 'team-ai-insights') {
 const hasPI = teamInsightsFilters.selectedCategories.includes('PI Events') || 
 teamInsightsFilters.selectedCategories.includes('PI Status');
 const hasSprint = teamInsightsFilters.selectedCategories.includes('Sprint Status') || 
 teamInsightsFilters.selectedCategories.includes('Sprint Events');
 
 if (hasPI && hasSprint) {
   // All (or both) categories selected: set tab from current filters so the matrix always shows when possible
   if (teamInsightsFilters.selectedTeam) {
     setInsightMetricsTab('team');
   } else if (teamInsightsFilters.selectedPI) {
     setInsightMetricsTab('pi');
   }
   return;
 }

 if (hasPI) {
 setInsightMetricsTab('pi');
 } else if (hasSprint) {
 setInsightMetricsTab('team');
 }
 }
 }, [activeNavItem, teamInsightsFilters.selectedCategories]);

 const [uploadTranscriptsFilters, setUploadTranscriptsFilters] = useState({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null as string | null,
 selectedTreeLabel: '',
 selectedTreeType: 'team' as 'group' | 'team',
 });

 const [selectedCustomDashboardId, setSelectedCustomDashboardId] = useState<string | null>(null);
 useNavigationHistory(activeNavItem, setActiveNavItem, setMobileSidebarOpen, selectedCustomDashboardId, setSelectedCustomDashboardId);
 const [customDashboards, setCustomDashboards] = useState<CustomDashboard[]>([]);
 const [loadingDashboards, setLoadingDashboards] = useState(false);
 const [customDashboardData, setCustomDashboardData] = useState<CustomDashboard | null>(null);
 const [isPublicDashboard, setIsPublicDashboard] = useState(false);
 const [isViewingOthersPublicDashboard, setIsViewingOthersPublicDashboard] = useState(false);
 const customDashboardFiltersInitializedRef = useRef(false);
 const { user } = useUser();
 
 const [customDashboardFilters, setCustomDashboardFilters] = useState({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null as string | null,
 selectedTreeLabel: '',
 selectedTreeType: 'team' as 'group' | 'team',
 });

 const handleTogglePublicDashboard = async () => {
   if (!customDashboardData || !selectedCustomDashboardId || (!user?.id && !(user as any)?.user_id)) return;
   const newValue = !isPublicDashboard;
   setIsPublicDashboard(newValue);
   try {
     const userId = ((user as any)?.id || (user as any)?.user_id) as string;
     await updateDashboard(userId, selectedCustomDashboardId, { is_public: newValue });
     // Also update the local customDashboardData so it stays in sync
     setCustomDashboardData(prev => prev ? { ...prev, is_public: newValue } : prev);
   } catch (err: any) {
     // Revert on error
     setIsPublicDashboard(!newValue);
     console.error('Failed to toggle public dashboard:', err);
   }
 };

 const handleCreateFromPublicDashboard = async () => {
   if (!customDashboardData || !createFromPublicName.trim() || (!user?.id && !(user as any)?.user_id)) return;
   const userId = ((user as any)?.id || (user as any)?.user_id) as string;
   try {
     const lc = customDashboardData.layout_config as any;
     const clonedConfig = lc?.layoutConfig?.rows ? {
       layoutConfig: {
         rows: (lc.layoutConfig.rows || []).map((row: any, rowIdx: number) => ({
           id: row.id || `row-${rowIdx}-${Date.now()}`,
           widgets: (row.widgets || []).map((w: any, wIdx: number) => ({
             ...w,
             id: `widget-${rowIdx}-${wIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
           })),
           columnWidths: row.columnWidths,
           height: row.height,
         })),
       },
       pinnedFilters: lc.pinnedFilters ? { ...lc.pinnedFilters } : {},
       reportFilters: lc.reportFilters ? { ...lc.reportFilters } : {},
       topBarFilters: lc.topBarFilters ? { ...lc.topBarFilters } : {},
     } : undefined;
     const newDash = await createDashboard(userId, {
       name: createFromPublicName.trim(),
       description: customDashboardData.description,
       layout_config: clonedConfig,
     });
     setShowCreateFromPublicModal(false);
     setCreateFromPublicName('');
     setSelectedCustomDashboardId(newDash.id);
     setCustomDashboardData(newDash);
     setIsViewingOthersPublicDashboard(false);
     setActiveNavItem('custom-dashboard-editor');
     loadDashboards();
   } catch (err: any) {
     console.error('Failed to create dashboard from public:', err);
     setMessage({ type: 'error', text: err?.message || 'Failed to create dashboard' });
     setTimeout(() => setMessage(null), 3000);
   }
 };
 
 // Initialize custom dashboard filters from loaded dashboard or user's default team/group
 // Note: CustomDashboardEditor will apply saved filters via onFiltersChange, so we only set defaults here
 // Use a ref to prevent re-initialization loops
 useEffect(() => {
 if (!customDashboardData) {
 // No dashboard loaded, reset filters and ref
 customDashboardFiltersInitializedRef.current = false;
 setIsPublicDashboard(false);
 setCustomDashboardFilters({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null,
 selectedTreeLabel: '',
 selectedTreeType: 'team',
 });
 return;
 }
 
 // Sync public state from loaded dashboard
 setIsPublicDashboard(customDashboardData.is_public || false);
 
 // If dashboard has saved filters, look up the team/group and set filters correctly
 // This ensures the correct team_key is used for the dropdown
 const topBarFilters = customDashboardData?.layout_config?.topBarFilters;
 console.log('[App] Custom dashboard data loaded, topBarFilters:', topBarFilters, 'Current filters:', customDashboardFilters);
 if (topBarFilters) {
 // Dashboard has saved filters (even if empty - respect user's intentional choice)
 // Look up the team/group to ensure correct treeValue
 const teamName = topBarFilters.selectedTeam;
 const treeType = topBarFilters.selectedTreeType || 'team';
 const savedPI = topBarFilters.selectedPI || '';
 
 const currentFilters = customDashboardFilters;
 
 // Always check if PI needs to be set - this is critical for new dashboards
 const piNeedsUpdate = savedPI && savedPI !== '' && currentFilters.selectedPI !== savedPI;
 
 // Check if team needs update
 let teamNeedsUpdate = false;
 let treeValue = topBarFilters.selectedTreeValue || null;
 let selectedTreeLabel: string = topBarFilters.selectedTreeLabel || teamName || '';
 
 if (teamName && !teamsLoading && (teams.length > 0 || groups.length > 0)) {
 // Look up the team/group in the teams/groups list to get the correct treeValue
 if (treeType === 'group') {
 const group = groups.find(g => g.group_name === teamName);
 if (group) {
 treeValue = `group:${group.group_key}`;
 selectedTreeLabel = group.group_name;
 }
 } else {
 const team = teams.find(t => t.team_name === teamName);
 if (team) {
 treeValue = `team:${team.team_key}`;
 selectedTreeLabel = team.team_name;
 }
 }
 
 teamNeedsUpdate = (
 currentFilters.selectedTeam !== teamName ||
 currentFilters.selectedTreeValue !== treeValue ||
 currentFilters.selectedTreeType !== treeType
 );
 } else if (teamName) {
 // Teams not loaded yet - team will be updated when teams load
 teamNeedsUpdate = (
 currentFilters.selectedTeam !== teamName ||
 currentFilters.selectedTreeValue !== topBarFilters.selectedTreeValue ||
 currentFilters.selectedTreeType !== treeType
 );
 }
 
 console.log('[App] Filter update check - PI needs update:', piNeedsUpdate, 'Team needs update:', teamNeedsUpdate, 'Saved PI:', savedPI, 'Current PI:', currentFilters.selectedPI);
 
 // Update filters if PI or team needs update, OR if filters are empty (intentional - user saved without filters)
 if (piNeedsUpdate || teamNeedsUpdate) {
 if (teamName && !teamsLoading && (teams.length > 0 || groups.length > 0)) {
 // Team found, set both team and PI
 console.log('[App] Setting custom dashboard filters with PI:', savedPI, 'Team:', teamName);
 setCustomDashboardFilters({
 selectedPI: savedPI,
 selectedTeam: teamName,
 selectedTreeValue: treeValue,
 selectedTreeLabel: selectedTreeLabel,
 selectedTreeType: treeType,
 });
 customDashboardFiltersInitializedRef.current = true;
 } else if (teamName) {
 // Teams not loaded yet, use saved values as-is
 console.log('[App] Setting custom dashboard filters (teams loading) with PI:', savedPI);
 setCustomDashboardFilters({
 selectedPI: savedPI,
 selectedTeam: topBarFilters.selectedTeam || '',
 selectedTreeValue: topBarFilters.selectedTreeValue || null,
 selectedTreeLabel: (topBarFilters.selectedTreeLabel || topBarFilters.selectedTeam || ''),
 selectedTreeType: (topBarFilters.selectedTreeType || 'team'),
 });
 customDashboardFiltersInitializedRef.current = true;
 } else if (piNeedsUpdate) {
 // No team but has PI - set the PI filter
 console.log('[App] Setting custom dashboard filters (PI only):', savedPI);
 setCustomDashboardFilters({
 selectedPI: savedPI,
 selectedTeam: '',
 selectedTreeValue: null,
 selectedTreeLabel: '',
 selectedTreeType: 'team',
 });
 customDashboardFiltersInitializedRef.current = true;
 }
 } else {
 // No updates needed, but mark as initialized since saved filters exist (even if empty)
 console.log('[App] Custom dashboard has saved filters (possibly empty by choice), respecting saved state');
 customDashboardFiltersInitializedRef.current = true;
 }
 return;
 }
 
 // Only initialize defaults if we haven't done so yet and there are no saved filters
 if (customDashboardFiltersInitializedRef.current) {
 return;
 }
 
 // Dashboard has no saved filters, initialize with user's default team/group (only once)
 if (!teamsLoading && teams.length > 0) {
 // Try to get user preferences for default team/group
 const currentUser = getCurrentUser();
 if (currentUser?.id) {
 getUserPreferences(currentUser.id).then(preferences => {
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
 const treeType = preferences.default_type === 'group' ? 'group' : 'team';
 const treeValue = preferences.default_type === 'group' 
 ? `group:${team.team_key || teamGroupName}`
 : `team:${team.team_key || teamGroupName}`;
 
 setCustomDashboardFilters({
 selectedPI: '',
 selectedTeam: teamGroupName,
 selectedTreeValue: treeValue,
 selectedTreeLabel: teamGroupName,
 selectedTreeType: treeType,
 });
 customDashboardFiltersInitializedRef.current = true;
 }
 } else if (teams.length > 0) {
 // Fallback: use first team if no default preference
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 setCustomDashboardFilters({
 selectedPI: '',
 selectedTeam: firstTeam.team_name,
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team' as const,
 });
 customDashboardFiltersInitializedRef.current = true;
 }
 }).catch(err => {
 console.warn('[App] Failed to load user preferences for custom dashboard:', err);
 // Fallback: use first team if preferences fail
 if (teams.length > 0) {
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 setCustomDashboardFilters({
 selectedPI: '',
 selectedTeam: firstTeam.team_name,
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team' as const,
 });
 customDashboardFiltersInitializedRef.current = true;
 }
 });
 } else if (teams.length > 0) {
 // No user, but we have teams - use first team as fallback
 const firstTeam = teams[0];
 const treeValue = `team:${firstTeam.team_key}`;
 setCustomDashboardFilters({
 selectedPI: '',
 selectedTeam: firstTeam.team_name,
 selectedTreeValue: treeValue,
 selectedTreeLabel: firstTeam.team_name,
 selectedTreeType: 'team' as const,
 });
 customDashboardFiltersInitializedRef.current = true;
 }
 }
 }, [teamsLoading, teams, groups, customDashboardData]);
 
 // Legacy state for backward compatibility (used by old code)
 const [selectedTeam, setSelectedTeam] = useState('');
 const [selectedTreeValue, setSelectedTreeValue] = useState<string | null>(null);
 const [selectedTreeLabel, setSelectedTreeLabel] = useState<string>('');
 const [selectedTreeType, setSelectedTreeType] = useState<'group' | 'team'>('team');
 const [selectedPI, setSelectedPI] = useState('');
 const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 const [isDashboardChatModalOpen, setIsDashboardChatModalOpen] = useState(false);
 const [collectedDashboardData, setCollectedDashboardData] = useState<any>(null);
 const [isInsightChatModalOpen, setIsInsightChatModalOpen] = useState(false);
 const [isKPIDashboardChatModalOpen, setIsKPIDashboardChatModalOpen] = useState(false);
 const [collectedKPIDashboardData, setCollectedKPIDashboardData] = useState<any>(null);
 
 // Listen for report-specific AI chat requests
 useEffect(() => {
 const handleReportAIChat = (event: CustomEvent) => {
 console.log('[App] Received open-report-ai-chat event:', event.detail);
 setCollectedDashboardData(event.detail || null);
 setIsDashboardChatModalOpen(true);
 };

 window.addEventListener('open-report-ai-chat', handleReportAIChat as EventListener);
 
 return () => {
 window.removeEventListener('open-report-ai-chat', handleReportAIChat as EventListener);
 };
 }, []);

 // Listen for KPI dashboard data collection responses
 useEffect(() => {
 const handleKPIDashboardDataCollected = (event: CustomEvent) => {
 console.log('[App] Received kpi-dashboard-data-collected event:', event.detail);
 setCollectedKPIDashboardData(event.detail || null);
 setIsKPIDashboardChatModalOpen(true);
 };

 window.addEventListener('kpi-dashboard-data-collected', handleKPIDashboardDataCollected as EventListener);
 
 return () => {
 window.removeEventListener('kpi-dashboard-data-collected', handleKPIDashboardDataCollected as EventListener);
 };
 }, []);
 
 // Debug: Log when modal state changes
 useEffect(() => {
 console.log('[AI Modal State]', { isDashboardChatModalOpen, activeNavItem });
 }, [isDashboardChatModalOpen, activeNavItem]);
 const [prompts, setPrompts] = useState<any[]>([]);
 const [selectedPrompt, setSelectedPrompt] = useState<string>('');
 const [loadingPrompts, setLoadingPrompts] = useState(false);
 const [isAdmin, setIsAdmin] = useState(false);
 
 // JIRA configuration check
 const jiraConfigCheck = useJiraConfigurationCheck();
 const [showJiraSetupModal, setShowJiraSetupModal] = useState(false);
 const [jiraConfigChecked, setJiraConfigChecked] = useState(false);
 
 // User preferences and welcome modal
 const { preferences, loading: preferencesLoading } = useUserPreferences();
 const [showWelcomeModal, setShowWelcomeModal] = useState(false);
 const [welcomeModalChecked, setWelcomeModalChecked] = useState(false);

 // Home: current PI and default team/group context (for rendering real metrics/insights)
 const [homeCurrentPIName, setHomeCurrentPIName] = useState<string>('');
 
 // Debug modal state changes
 useEffect(() => {
 console.log('[WelcomeModal] Modal state changed:', showWelcomeModal);
 }, [showWelcomeModal]);
 
 // Dashboard settings state
 const [dashboardSettingsState, setDashboardSettingsState] = useState<{
 hasChanges: boolean;
 isSaving: boolean;
 error: string | null;
 }>({ hasChanges: false, isSaving: false, error: null });
 const [showResetConfirm, setShowResetConfirm] = useState(false);
 const [showCreateFromPublicModal, setShowCreateFromPublicModal] = useState(false);
 const [createFromPublicName, setCreateFromPublicName] = useState('');
 
 // Insight settings state (for team-insight and pi-insight pages)
 const [insightSettingsState, setInsightSettingsState] = useState<{
 hasChanges: boolean;
 isSaving: boolean;
 error: string | null;
 }>({ hasChanges: false, isSaving: false, error: null });
 
 // Unsaved changes modal state
 const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
 const [pendingNavItem, setPendingNavItem] = useState<NavItemId | null>(null);

 // Initialize tree values for default teams when teams/groups data loads (only once)
 useEffect(() => {
 if (!teamsLoading && teams.length > 0 && !initializedTreeValues.current) {
 console.log('[App] Initializing tree values for default teams');
 initializedTreeValues.current = true;
 
 // Initialize team dashboard filters if they don't have a tree value yet
 if (!teamDashboardFilters.selectedTreeValue && teamDashboardFilters.selectedTeam) {
 const team = teams.find(t => t.team_name === teamDashboardFilters.selectedTeam);
 if (team) {
 const treeValue = `team:${team.team_key}`;
 console.log(`[App] Initializing team dashboard tree value for ${teamDashboardFilters.selectedTeam}:`, treeValue);
 setTeamDashboardFilters(prev => ({
 ...prev,
 selectedTreeValue: treeValue,
 selectedTreeLabel: teamDashboardFilters.selectedTeam,
 }));
 }
 }
 
 // Initialize PI dashboard filters if they don't have a tree value yet
 if (!piDashboardFilters.selectedTreeValue && piDashboardFilters.selectedTeam) {
 const team = teams.find(t => t.team_name === piDashboardFilters.selectedTeam);
 if (team) {
 const treeValue = `team:${team.team_key}`;
 console.log(`[App] Initializing PI dashboard tree value for ${piDashboardFilters.selectedTeam}:`, treeValue);
 setPiDashboardFilters(prev => ({
 ...prev,
 selectedTreeValue: treeValue,
 selectedTreeLabel: piDashboardFilters.selectedTeam,
 }));
 }
    }
  }
  }, [teamsLoading, teams, teamDashboardFilters.selectedTreeValue, teamDashboardFilters.selectedTeam, piDashboardFilters.selectedTreeValue, piDashboardFilters.selectedTeam]);

// Initialize dashboard filters with user's default team/group from preferences
const teamDashboardInitializedRef = useRef(false);
const piDashboardInitializedRef = useRef(false);

useEffect(() => {
  // Only initialize once when teams are loaded and no team is selected
  if (teamDashboardInitializedRef.current || teamsLoading || teams.length === 0) return;
  
  // Skip if team is already selected
  if (teamDashboardFilters.selectedTeam || teamDashboardFilters.selectedTreeValue) {
    teamDashboardInitializedRef.current = true;
    return;
  }
  
  // Skip if a restore has already been applied (meaning saved settings existed)
  // or if there's a pending restore waiting to be applied
  if (appliedRestoreRef.current || pendingRestore) {
    console.log('[App] Team Dashboard: Skipping default team load - restore applied or pending');
    teamDashboardInitializedRef.current = true;
    return;
  }

  teamDashboardInitializedRef.current = true;

  const currentUser = getCurrentUser();
  if (currentUser?.id) {
    getUserPreferences(currentUser.id).then(preferences => {
      if (preferences?.default_team_or_group && preferences.default_type) {
        let teamGroupName = preferences.default_team_or_group;
        if (teamGroupName.includes(':')) {
          teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
        }

        if (preferences.default_type === 'group') {
          const group = groups.find(g => g.group_name === teamGroupName);
          if (group) {
            const treeValue = `group:${group.group_key}`;
            console.log('[App] Team Dashboard: Loading default group (no saved settings):', teamGroupName);
            setTeamDashboardFilters({
              selectedTeam: teamGroupName,
              selectedTreeValue: treeValue,
              selectedTreeLabel: teamGroupName,
              selectedTreeType: 'group',
            });
          }
        } else {
          const team = teams.find(t => t.team_name === teamGroupName);
          if (team) {
            const treeValue = `team:${team.team_key}`;
            console.log('[App] Team Dashboard: Loading default team (no saved settings):', teamGroupName);
            setTeamDashboardFilters({
              selectedTeam: teamGroupName,
              selectedTreeValue: treeValue,
              selectedTreeLabel: teamGroupName,
              selectedTreeType: 'team',
            });
          }
        }
      }
    }).catch(err => {
      console.warn('[App] Failed to load user preferences for team dashboard:', err);
    });
  }
}, [teamsLoading, teams, groups, teamDashboardFilters.selectedTeam, teamDashboardFilters.selectedTreeValue]);

useEffect(() => {
  // Only initialize once when teams are loaded and no team is selected
  if (piDashboardInitializedRef.current || teamsLoading || teams.length === 0) return;
  
  // Skip if team is already selected
  if (piDashboardFilters.selectedTeam || piDashboardFilters.selectedTreeValue) {
    piDashboardInitializedRef.current = true;
    return;
  }
  
  // Skip if a restore has already been applied (meaning saved settings existed)
  // or if there's a pending restore waiting to be applied
  if (appliedRestoreRef.current || pendingRestore) {
    console.log('[App] PI Dashboard: Skipping default team load - restore applied or pending');
    piDashboardInitializedRef.current = true;
    return;
  }

  piDashboardInitializedRef.current = true;

  const currentUser = getCurrentUser();
  if (currentUser?.id) {
    getUserPreferences(currentUser.id).then(preferences => {
      if (preferences?.default_team_or_group && preferences.default_type) {
        let teamGroupName = preferences.default_team_or_group;
        if (teamGroupName.includes(':')) {
          teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
        }

        if (preferences.default_type === 'group') {
          const group = groups.find(g => g.group_name === teamGroupName);
          if (group) {
            const treeValue = `group:${group.group_key}`;
            console.log('[App] PI Dashboard: Loading default group (no saved settings):', teamGroupName);
            setPiDashboardFilters(prev => ({
              ...prev,
              selectedTeam: teamGroupName,
              selectedTreeValue: treeValue,
              selectedTreeLabel: teamGroupName,
              selectedTreeType: 'group',
            }));
          }
        } else {
          const team = teams.find(t => t.team_name === teamGroupName);
          if (team) {
            const treeValue = `team:${team.team_key}`;
            console.log('[App] PI Dashboard: Loading default team (no saved settings):', teamGroupName);
            setPiDashboardFilters(prev => ({
              ...prev,
              selectedTeam: teamGroupName,
              selectedTreeValue: treeValue,
              selectedTreeLabel: teamGroupName,
              selectedTreeType: 'team',
            }));
          }
        }
      }
    }).catch(err => {
      console.warn('[App] Failed to load user preferences for PI dashboard:', err);
    });
  }
}, [teamsLoading, teams, groups, piDashboardFilters.selectedTeam, piDashboardFilters.selectedTreeValue]);

// Sync dashboard filters when user changes default team/group in User Settings
const prevDefaultTeamRef = useRef<string | null | undefined>(undefined);
const prevDefaultTypeRef = useRef<string | null | undefined>(undefined);

useEffect(() => {
  // Skip while teams are still loading or preferences haven't loaded yet
  if (teamsLoading || !preferences) return;

  const currentDefault = preferences.default_team_or_group ?? null;
  const currentType = preferences.default_type ?? null;

  // On first run, just record the initial values without applying
  if (prevDefaultTeamRef.current === undefined) {
    prevDefaultTeamRef.current = currentDefault;
    prevDefaultTypeRef.current = currentType;
    return;
  }

  // Only react when the preference actually changed (user saved new default in settings)
  if (currentDefault === prevDefaultTeamRef.current && currentType === prevDefaultTypeRef.current) {
    return;
  }

  // Record the new values
  prevDefaultTeamRef.current = currentDefault;
  prevDefaultTypeRef.current = currentType;

  console.log('[App] Default team/group preference changed:', currentDefault, 'type:', currentType);

  // If cleared to none/null, don't force-clear the dashboards (user may have a manual selection)
  if (!currentDefault || currentType === 'none') return;

  let teamGroupName = currentDefault;
  if (teamGroupName.includes(':')) {
    teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
  }

  if (currentType === 'group') {
    const group = groups.find(g => g.group_name === teamGroupName);
    if (group) {
      const treeValue = `group:${group.group_key}`;
      console.log('[App] Applying new default group to dashboards:', teamGroupName);
      setTeamDashboardFilters({
        selectedTeam: teamGroupName,
        selectedTreeValue: treeValue,
        selectedTreeLabel: teamGroupName,
        selectedTreeType: 'group',
      });
      setPiDashboardFilters(prev => ({
        ...prev,
        selectedTeam: teamGroupName,
        selectedTreeValue: treeValue,
        selectedTreeLabel: teamGroupName,
        selectedTreeType: 'group',
      }));
    }
  } else if (currentType === 'team') {
    const team = teams.find(t => t.team_name === teamGroupName);
    if (team) {
      const treeValue = `team:${team.team_key}`;
      console.log('[App] Applying new default team to dashboards:', teamGroupName);
      setTeamDashboardFilters({
        selectedTeam: teamGroupName,
        selectedTreeValue: treeValue,
        selectedTreeLabel: teamGroupName,
        selectedTreeType: 'team',
      });
      setPiDashboardFilters(prev => ({
        ...prev,
        selectedTeam: teamGroupName,
        selectedTreeValue: treeValue,
        selectedTreeLabel: teamGroupName,
        selectedTreeType: 'team',
      }));
    }
  }
}, [preferences?.default_team_or_group, preferences?.default_type, teamsLoading, teams, groups]);

// Auto-select current PI for PI Dashboard when navigating to it
const piDashboardPIInitializedRef = useRef(false);
useEffect(() => {
  // Only run when navigating to PI Dashboard
  if (activeNavItem !== 'pi-dashboard') {
    piDashboardPIInitializedRef.current = false;
    return;
  }
  
  // Skip if PI is already selected or already initialized
  if (piDashboardFilters.selectedPI || piDashboardPIInitializedRef.current) {
    return;
  }
  
  piDashboardPIInitializedRef.current = true;
  
  // Auto-fetch and set current PI
  const fetchCurrentPI = async () => {
    try {
      console.log('[App] PI Dashboard: Fetching current PI...');
      const apiService = new ApiService();
      const piResponse = await apiService.getCurrentAndNextPIs();
      const currentPIs = (piResponse as any).current_pis || [];
      
      if (currentPIs.length > 0) {
        const currentPIName = currentPIs[0].pi_name;
        console.log('[App] PI Dashboard: Setting current PI to:', currentPIName);
        setPiDashboardFilters(prev => ({
          ...prev,
          selectedPI: currentPIName,
        }));
      } else {
        console.warn('[App] PI Dashboard: No current PI found');
      }
    } catch (err) {
      console.error('[App] PI Dashboard: Failed to load current PI:', err);
    }
  };
  
  fetchCurrentPI();
}, [activeNavItem, piDashboardFilters.selectedPI]);

// Switch to the appropriate dashboard filters when navigating or when filters change
useEffect(() => {
 if (activeNavItem === 'team-dashboard') {
 console.log('[App] Switching to team dashboard filters:', teamDashboardFilters);
 setSelectedTeam(teamDashboardFilters.selectedTeam);
 setSelectedTreeValue(teamDashboardFilters.selectedTreeValue);
 setSelectedTreeLabel(teamDashboardFilters.selectedTreeLabel);
 setSelectedTreeType(teamDashboardFilters.selectedTreeType);
 } else if (activeNavItem === 'pi-dashboard') {
 console.log('[App] Switching to PI dashboard filters:', piDashboardFilters);
 setSelectedPI(piDashboardFilters.selectedPI);
 setSelectedTeam(piDashboardFilters.selectedTeam);
 setSelectedTreeValue(piDashboardFilters.selectedTreeValue);
 setSelectedTreeLabel(piDashboardFilters.selectedTreeLabel);
 setSelectedTreeType(piDashboardFilters.selectedTreeType);
 }
 }, [activeNavItem, teamDashboardFilters, piDashboardFilters]);

 useEffect(() => {
 (async () => {
 try {
 const admin = await verifyAdmin();
 setIsAdmin(admin);
 } catch (error) {
 console.error('[Admin Check] Error checking admin status:', error);
 setIsAdmin(false);
 }
 })();
 }, []);

 // JIRA configuration check - run after auth and admin check
 useEffect(() => {
 // Only check once, after auth is checked and admin check is complete
 if (authChecked && !jiraConfigChecked && !jiraConfigCheck.isLoading) {
 setJiraConfigChecked(true);
 
 // Only show modal if:
 // 1. Backend is available
 // 2. JIRA is not configured
 // 3. We haven't already shown the modal
 if (
 jiraConfigCheck.backendAvailable &&
 !jiraConfigCheck.isConfigured &&
 !showJiraSetupModal
 ) {
 setShowJiraSetupModal(true);
 }
 }
 }, [authChecked, jiraConfigCheck.isLoading, jiraConfigCheck.backendAvailable, jiraConfigCheck.isConfigured, jiraConfigChecked, showJiraSetupModal]);
 
 // Welcome modal check - show on first login if onboarding not completed
 useEffect(() => {
 console.log('[WelcomeModal] Check state:', {
 authChecked,
 welcomeModalChecked,
 preferencesLoading,
 preferences,
 has_completed_onboarding: preferences?.has_completed_onboarding
 });
 
 if (authChecked && !welcomeModalChecked && !preferencesLoading && preferences) {
 setWelcomeModalChecked(true);
 
 // Show welcome modal if user hasn't completed onboarding
 // Check for false explicitly, or if the field is undefined/null (new user)
 const shouldShowModal = !preferences.has_completed_onboarding;
 console.log('[WelcomeModal] Should show modal:', shouldShowModal, 'onboarding status:', preferences.has_completed_onboarding);
 
 if (shouldShowModal) {
 console.log('[WelcomeModal] Showing welcome modal for first-time user');
 setShowWelcomeModal(true);
 }
 }
 }, [authChecked, welcomeModalChecked, preferencesLoading, preferences]);

 // Handle welcome modal close after onboarding - apply selected team to dashboard filters
 const handleWelcomeModalClose = (selection?: OnboardingTeamSelection) => {
  setShowWelcomeModal(false);
  
  if (selection?.teamOrGroupName && selection.type !== 'none') {
    const teamGroupName = selection.teamOrGroupName;
    console.log('[App] Onboarding complete: applying selected team/group to dashboard filters:', teamGroupName, 'type:', selection.type);
    
    if (selection.type === 'group') {
      const group = groups.find(g => g.group_name === teamGroupName);
      if (group) {
        const treeValue = `group:${group.group_key}`;
        setTeamDashboardFilters({
          selectedTeam: teamGroupName,
          selectedTreeValue: treeValue,
          selectedTreeLabel: teamGroupName,
          selectedTreeType: 'group',
        });
        setPiDashboardFilters(prev => ({
          ...prev,
          selectedTeam: teamGroupName,
          selectedTreeValue: treeValue,
          selectedTreeLabel: teamGroupName,
          selectedTreeType: 'group',
        }));
      }
    } else if (selection.type === 'team') {
      const team = teams.find(t => t.team_name === teamGroupName);
      if (team) {
        const treeValue = `team:${team.team_key}`;
        setTeamDashboardFilters({
          selectedTeam: teamGroupName,
          selectedTreeValue: treeValue,
          selectedTreeLabel: teamGroupName,
          selectedTreeType: 'team',
        });
        setPiDashboardFilters(prev => ({
          ...prev,
          selectedTeam: teamGroupName,
          selectedTreeValue: treeValue,
          selectedTreeLabel: teamGroupName,
          selectedTreeType: 'team',
        }));
      }
    }
    
    // Mark as initialized so the useEffect doesn't try to re-initialize
    teamDashboardInitializedRef.current = true;
    piDashboardInitializedRef.current = true;
  }
 };

 const handleJiraSetupConfirm = () => {
  setShowJiraSetupModal(false);
  if (isAdmin) {
    // Navigate to Jira settings
    userNavigatedRef.current = true; // User has navigated, allow normal rendering
    setActiveNavItem('jira-settings');
  }
 };

 // Listen for dashboard settings state changes
 useEffect(() => {
 const handleSettingsState = (event: CustomEvent) => {
 setDashboardSettingsState(event.detail);
 };
 
 const handleSettingsSaved = () => {
 setMessage({ type: 'success', text: 'Dashboard settings saved successfully' });
 setTimeout(() => setMessage(null), 3000);
 };
 
 const handleSettingsSaveFailed = (event: CustomEvent) => {
 setMessage({ type: 'error', text: 'Failed to save dashboard settings' });
 console.error('Save failed:', event.detail.error);
 setTimeout(() => setMessage(null), 5000);
 };
 
 const handleRestoreFilters = (event: CustomEvent) => {
 const { dashboard, filters } = event.detail;
 console.log(`[Dashboard Settings] Restoring filters for ${dashboard}:`, filters);
 
 // If already applied, ignore
 if (appliedRestoreRef.current) {
 console.log('[Dashboard Settings] Restore already applied, ignoring');
 return;
 }
 
 // If teams/groups are still loading, store for later
 if (teamsLoading || (groups.length === 0 && teams.length === 0)) {
 console.log('[Dashboard Settings] Teams/groups not loaded yet, storing restore for later');
 setPendingRestore({ dashboard, filters });
 return;
 }
 
 // Apply restore immediately
 applyFilterRestore(dashboard, filters);
 appliedRestoreRef.current = true;
 };
 
 window.addEventListener('dashboard-settings-state', handleSettingsState as EventListener);
 window.addEventListener('dashboard-settings-saved', handleSettingsSaved as EventListener);
 window.addEventListener('dashboard-settings-save-failed', handleSettingsSaveFailed as EventListener);
 window.addEventListener('restore-dashboard-filters', handleRestoreFilters as EventListener);
 
 return () => {
 window.removeEventListener('dashboard-settings-state', handleSettingsState as EventListener);
 window.removeEventListener('dashboard-settings-saved', handleSettingsSaved as EventListener);
 window.removeEventListener('dashboard-settings-save-failed', handleSettingsSaveFailed as EventListener);
 window.removeEventListener('restore-dashboard-filters', handleRestoreFilters as EventListener);
 };
 }, []);
 
 const handleSaveDashboardSettings = () => {
 window.dispatchEvent(new CustomEvent('save-dashboard-settings'));
 };
 
 const handleResetDashboardSettings = () => {
 window.dispatchEvent(new CustomEvent('reset-dashboard-settings'));
 setShowResetConfirm(false);
 setMessage({ type: 'success', text: 'Dashboard settings reset to defaults' });
 setTimeout(() => setMessage(null), 3000);
 // Don't reload the page - let the dashboard components handle the reset via event listener
 };

 // Autosave categories for team-ai-insights (team always resets to user default)
 const insightAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 useEffect(() => {
 if (!teamInsightSettings.isLoading && activeNavItem === 'team-ai-insights' && teamInsightsReadyRef.current) {
 // Update the current state with categories
 teamInsightSettings.updateCurrentState({
 selectedCategories: teamInsightsFilters.selectedCategories,
 });
 // Debounce the autosave to avoid rapid API calls
 if (insightAutosaveTimerRef.current) clearTimeout(insightAutosaveTimerRef.current);
 insightAutosaveTimerRef.current = setTimeout(() => {
 teamInsightSettings.saveSettings().catch(err => {
   console.warn('[App] Failed to autosave insight filters:', err);
 });
 }, 500);
 }
 return () => {
 if (insightAutosaveTimerRef.current) clearTimeout(insightAutosaveTimerRef.current);
 };
 }, [teamInsightsFilters.selectedCategories, activeNavItem, teamInsightSettings.isLoading]);

  // Update insight settings state based on active page
 useEffect(() => {
 if (activeNavItem === 'team-ai-insights') {
 setInsightSettingsState({
 hasChanges: teamInsightSettings.hasChanges,
 isSaving: teamInsightSettings.isSaving,
 error: teamInsightSettings.error,
 });
 }
 }, [
 activeNavItem,
 teamInsightSettings.hasChanges,
 teamInsightSettings.isSaving,
 teamInsightSettings.error,
 ]);

 // Handle insight settings save
 const handleSaveInsightSettings = async () => {
 try {
 if (activeNavItem === 'team-ai-insights') {
 await teamInsightSettings.saveSettings();
 }
 setMessage({ type: 'success', text: 'Insight settings saved successfully' });
 setTimeout(() => setMessage(null), 3000);
 } catch (err) {
 setMessage({ type: 'error', text: 'Failed to save insight settings' });
 setTimeout(() => setMessage(null), 3000);
 }
 };

 // Track if we're loading team insights for the first time
 const [teamInsightsReady, setTeamInsightsReady] = useState(false);
 const teamInsightsReadyRef = useRef(false);
 
 // Clear state when navigating TO team-ai-insights
 useEffect(() => {
 if (activeNavItem === 'team-ai-insights') {
 console.log('[App] Navigating to team-ai-insights, clearing state...');
 
 // Mark as not ready IMMEDIATELY using ref (synchronous)
 teamInsightsReadyRef.current = false;
 setTeamInsightsReady(false);
 
 // Clear legacy state immediately when navigating to team-ai-insights
 setSelectedTeam('');
 setSelectedTreeValue(null);
 setSelectedTreeLabel('');
 setSelectedTreeType('team');
 setSelectedCategories([]);
 
 // Clear teamInsightsFilters state
 setTeamInsightsFilters({
 selectedPI: '',
 selectedTeam: '',
 selectedTreeValue: null,
 selectedTreeLabel: '',
 selectedTreeType: 'team',
 selectedCategories: [],
 });
 
 // Clear current PI name
 setCurrentPIName('');
 } else {
 // Reset when leaving team-ai-insights
 teamInsightsReadyRef.current = false;
 setTeamInsightsReady(false);
 }
 }, [activeNavItem]);

 // Load filters when entering team-ai-insights:
 // - Team/group: always from user preferences (default team)
 // - PI and categories: from saved page settings (autosaved)
 useEffect(() => {
 if (activeNavItem === 'team-ai-insights' && !teamInsightSettings.isLoading) {
 console.log('[App] Team insights: loading filters...');

 // Restore saved PI and categories from page settings
 const saved = teamInsightSettings.savedState;
 const savedCategories = saved?.selectedCategories || [];

 if (!teamsLoading && (groups.length > 0 || teams.length > 0)) {
 const currentUser = getCurrentUser();
 if (currentUser?.id) {
 getUserPreferences(currentUser.id).then(preferences => {
 if (preferences?.default_team_or_group && preferences.default_type) {
 let teamGroupName = preferences.default_team_or_group;
 if (teamGroupName.includes(':')) {
 teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
 }

 let treeValue: string | null = null;
 if (preferences.default_type === 'group') {
 const group = groups.find(g => g.group_name === teamGroupName);
 if (group) {
 treeValue = `group:${group.group_key}`;
 console.log('[App] Setting default group for AI Insights:', teamGroupName);
 setTeamInsightsFilters(prev => ({
 ...prev,
 selectedTeam: teamGroupName,
 selectedTreeValue: treeValue,
 selectedTreeLabel: teamGroupName,
 selectedTreeType: 'group',
 selectedCategories: savedCategories,
 }));
 setSelectedTeam(teamGroupName);
 setSelectedTreeValue(treeValue);
 setSelectedTreeLabel(teamGroupName);
 setSelectedTreeType('group');
 }
 } else {
 const team = teams.find(t => t.team_name === teamGroupName);
 if (team) {
 treeValue = `team:${team.team_key}`;
 console.log('[App] Setting default team for AI Insights:', teamGroupName);
 setTeamInsightsFilters(prev => ({
 ...prev,
 selectedTeam: teamGroupName,
 selectedTreeValue: treeValue,
 selectedTreeLabel: teamGroupName,
 selectedTreeType: 'team',
 selectedCategories: savedCategories,
 }));
 setSelectedTeam(teamGroupName);
 setSelectedTreeValue(treeValue);
 setSelectedTreeLabel(teamGroupName);
 setSelectedTreeType('team');
 }
 }
 }
 // Mark as ready after preferences are applied
 teamInsightsReadyRef.current = true;
 setTeamInsightsReady(true);
 console.log('[App] Team insights ready!');
 }).catch(err => {
 console.warn('[App] Failed to load user preferences for AI Insights:', err);
 teamInsightsReadyRef.current = true;
 setTeamInsightsReady(true);
 });
 } else {
 teamInsightsReadyRef.current = true;
 setTeamInsightsReady(true);
 }
 }
 }
}, [activeNavItem, teamInsightSettings.isLoading, teamInsightSettings.savedState, groups, teams, teamsLoading]);

 // Auto-fetch and set current PI for AI Insights - always use current PI from backend
 useEffect(() => {
 if (activeNavItem === 'team-ai-insights' && 
 !teamInsightSettings.isLoading && 
 teamInsightsReadyRef.current) {
 
 const fetchCurrentPI = async () => {
 try {
 console.log('[App] Fetching current PI for AI Insights...');
 const apiService = new ApiService();
 const piResponse = await apiService.getCurrentAndNextPIs();
 
 // The API returns {current_pis: [], next_pis: []} structure
 const currentPIs = (piResponse as any).current_pis || [];
 if (currentPIs.length > 0) {
 // Use the first PI from the current_pis list
 const currentPINameValue = currentPIs[0].pi_name;
 console.log('[App] Setting current PI to:', currentPINameValue);
 
 // Always set to current PI from backend (overrides any saved PI)
 setTeamInsightsFilters(prev => ({
 ...prev,
 selectedPI: currentPINameValue,
 }));
 setSelectedPI(currentPINameValue); // Update legacy state
 setCurrentPIName(currentPINameValue); // Store for badge display
 } else {
 console.warn('[App] No current PIs returned from API');
 }
 } catch (err) {
 console.error('[App] Failed to load current PI:', err);
 }
 };
 
 fetchCurrentPI();
 }
 }, [activeNavItem, teamInsightSettings.isLoading, teamInsightsReady]);

 // Fetch custom dashboards
 const loadDashboards = useCallback(async () => {
 if (!user?.id && !user?.user_id) return;
 
 setLoadingDashboards(true);
 try {
 const userId = (user?.id || user?.user_id) as string;
 const dashboards = await getUserDashboards(userId);
 setCustomDashboards(dashboards);
 } catch (err) {
 console.error('Failed to load custom dashboards:', err);
 setCustomDashboards([]);
 } finally {
 setLoadingDashboards(false);
 }
 }, [user]);

 useEffect(() => {
 if (authChecked && user) {
 loadDashboards();
 }
 }, [authChecked, user, loadDashboards]);

 const apiService = new ApiService();

 // Fetch current PI once (used for Home and other views)
 useEffect(() => {
 if (!authChecked) return;
 if (homeCurrentPIName) return;
 (async () => {
 try {
 const piResponse = await apiService.getCurrentAndNextPIs();
 const currentPIs = (piResponse as any).current_pis || [];
 if (currentPIs.length > 0) {
 setHomeCurrentPIName(currentPIs[0].pi_name);
 }
 } catch (err) {
 console.warn('[Home] Failed to fetch current PI:', err);
 }
 })();
 }, [authChecked, homeCurrentPIName]);

 const homeDefaultContext = useMemo(() => {
 if (teamsLoading) return null as null | { name: string; type: 'team' | 'group' };

 const cleanName = (value: string) => (value.includes(':') ? (value.split(':')[1] || value) : value);

 const prefNameRaw = preferences?.default_team_or_group || '';
 const prefType = preferences?.default_type || null;
 const prefName = prefNameRaw ? cleanName(prefNameRaw) : '';

 if (prefType === 'group' && prefName) {
 const group = groups.find((g) => g.group_name === prefName);
 if (group) return { name: group.group_name, type: 'group' as const };
 }

 if (prefType === 'team' && prefName) {
 const team = teams.find((t) => t.team_name === prefName);
 if (team) return { name: team.team_name, type: 'team' as const };
 }

 // Fallback: first team if available
 if (teams.length > 0) {
 return { name: teams[0].team_name, type: 'team' as const };
 }

 return null;
 }, [teamsLoading, teams, groups, preferences?.default_team_or_group, preferences?.default_type]);

const navigationItems = [
  { id: 'team-ai-insights', label: 'AI Insights', icon: '💡' },
  { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
  { id: 'pi-dashboard', label: piLabel('Dashboard'), icon: '📈' },
  ...(isDORAEnabled() ? [{ id: 'github-analysis', label: 'DORA Metrics', icon: '📊' }] : []),
  { id: 'user-settings', label: 'Settings', icon: '👤' },
 { id: 'settings', label: 'System Settings', icon: '⚙️' },
 { id: 'general-data', label: 'View General Data', icon: '📁' },
 { id: 'create-agent-job', label: 'Create Agent Job', icon: '➕' },
 { id: 'upload-transcripts', label: 'Upload Transcripts', icon: '⬆️' },
 { id: 'goal-progress', label: 'Goal Progress', icon: '📊' },
 { id: 'pi-goals', label: piLabel('Goals', 'Define'), icon: '🎯' },
 { id: 'sprint-goals', label: 'Define Sprint Goals', icon: '▶️' },
 ...(isAdmin ? [
 { id: 'users-admin', label: 'Users', icon: '👥' },
 { id: 'teams-and-meetings', label: 'Teams & Meetings', icon: '📅' },
 { id: 'jira-settings', label: 'Jira Settings', icon: '🔷' },
 { id: 'github-settings', label: 'GitHub Settings', icon: '🐙' }
 ] : []),
 ];

 const goHome = useCallback(() => {
 setMobileSidebarOpen(false);
 handleNavigation('home');
 }, [handleNavigation]);

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    if (activeNavItem === 'home') {
      return [{ label: 'Home' }];
    }

    if (activeNavItem === 'home-detail') {
      // Use insight card name, KPI dashboard title, or homeDetail title
      const detailLabel = selectedInsightCard?.card_name ?? selectedKPIDashboard?.title ?? homeDetail?.title ?? 'Details';
      return [
        { label: 'Home', onClick: goHome },
        { label: detailLabel },
      ];
    }

    const currentLabel =
      navigationItems.find((i) => i.id === activeNavItem)?.label ??
      (typeof activeNavItem === 'string' ? activeNavItem : 'View');

    return [{ label: 'Home', onClick: goHome }, { label: currentLabel }];
  }, [activeNavItem, goHome, homeDetail?.title, selectedInsightCard?.card_name, selectedKPIDashboard?.title, navigationItems]);

 // Modern SVG icon components
 const SidebarIcon = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
 <span className={`inline-flex items-center justify-center ${className}`} style={{ width: '20px', height: '20px' }}>
 {children}
 </span>
 );

 const IconLightbulb = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
 </svg>
 </SidebarIcon>
 );

 const IconTarget = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
 <circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round" />
 <circle cx="12" cy="12" r="2" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 </SidebarIcon>
 );

 const IconFlag = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
 </svg>
 </SidebarIcon>
 );

 const IconChartBar = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 </SidebarIcon>
 );

 const IconTrendingUp = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
 </svg>
 </SidebarIcon>
 );

 const IconFolder = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
 </svg>
 </SidebarIcon>
 );

 const IconDashboard = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
 </svg>
 </SidebarIcon>
 );

 const IconUpload = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 </SidebarIcon>
 );

 const IconCog = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 </SidebarIcon>
 );

 const IconPlus = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
 </svg>
 </SidebarIcon>
 );

 const IconUsers = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
 </svg>
 </SidebarIcon>
 );

 const IconTeamsMeetings = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 </SidebarIcon>
 );

 const IconDatabase = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 2 3 8 3s8-1 8-3V7M4 7c0 2 2 3 8 3s8-1 8-3M4 7c0-2 2-3 8-3s8 1 8 3m0 5c0 2-2 3-8 3s-8-1-8-3" />
 </svg>
 </SidebarIcon>
 );

 const IconRefresh = () => (
 <SidebarIcon>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
 </svg>
 </SidebarIcon>
 );

const IconCogAlt = () => (
  <SidebarIcon>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  </SidebarIcon>
);

const IconGitHub = () => (
  <SidebarIcon>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  </SidebarIcon>
);

const IconJira = () => (
  <SidebarIcon>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  </SidebarIcon>
);

const IconShield = () => (
  <SidebarIcon>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  </SidebarIcon>
);


// Accordion navigation groups for the sidebar UI (beautified)
const navigationGroups: Array<{ title: string; items: Array<{ id: string; label: string; icon: React.ReactNode; children?: Array<{ id: string; label: string; icon: React.ReactNode }> }> }> = [
  {
    title: 'AI Insights',
    items: [
      { id: 'team-ai-insights', label: 'Teams Insights', icon: <IconLightbulb /> },
    ],
  },
  {
    title: 'System Dashboards',
    items: [
      { id: 'team-dashboard', label: 'Team Dashboard', icon: <IconChartBar /> },
      { id: 'pi-dashboard', label: piLabel('Dashboard'), icon: <IconTrendingUp /> },
      ...(isDORAEnabled() ? [{ id: 'github-analysis', label: 'DORA Metrics', icon: <IconGitHub /> }] : []),
    ],
  },
 {
 title: 'Goals',
 items: [
 { id: 'goal-progress', label: 'Goal Progress', icon: <IconChartBar /> },
      { id: 'pi-goals', label: piLabel('Goals', 'Define'), icon: <IconTarget /> },
 { id: 'sprint-goals', label: 'Define Sprint Goals', icon: <IconFlag /> },
 ],
 },
 {
 title: 'My Dashboards',
 items: customDashboards.map((dashboard) => ({
 id: `custom-dashboard-${dashboard.id}`,
 label: dashboard.name,
 icon: <IconDashboard />,
 })),
 },
 {
 title: 'Management',
 items: [
 { id: 'general-data', label: 'View General Data', icon: <IconFolder /> },
 { id: 'upload-transcripts', label: 'Upload Transcripts', icon: <IconUpload /> },
 ],
 },
 ...(isAdmin
 ? [
 {
 title: 'Administration',
 items: [
 { id: 'settings', label: 'System Settings', icon: <IconCog /> },
 { id: 'create-agent-job', label: 'Create Agent Job', icon: <IconPlus /> },
 { id: 'users-admin', label: 'Users', icon: <IconUsers /> },
 { id: 'teams-and-meetings', label: 'Teams & Meetings', icon: <IconTeamsMeetings /> },
 ],
 },
      {
        title: 'Data Sources',
        items: [
          { id: 'jira-settings', label: 'Jira Settings', icon: <IconJira /> },
          { id: 'github-settings', label: 'GitHub Settings', icon: <IconGitHub /> },
        ],
      },
 ]
 : []),
 ];

 // Track which accordion groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
   'AI Insights': true,
   'System Dashboards': true,
   'Goals': true,
   'My Dashboards': true,
   Management: true,
   Administration: true,
   'Datasource Settings': true,
 });
 const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
 'custom-dashboards': true,
 });

 const toggleGroup = (title: string) => {
 setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
 };

 // Map sidebar items to browser tab titles (no spaces around '-')
 const titles: Record<string, string> = {
  'team-ai-insights': 'SparksAI-AI Insights',
  'team-dashboard': 'SparksAI-Team Dashboard',
  'pi-dashboard': `SparksAI-${piLabel('Dashboard')}`,
  'github-analysis': 'SparksAI-DORA Metrics',
  'custom-dashboards': 'SparksAI-My Dashboards',
 'custom-dashboard-editor': 'SparksAI-Dashboard Editor',
 'settings': 'SparksAI-System Settings',
 'general-data': 'SparksAI-General Data',
 'create-agent-job': 'SparksAI-Create Agent Job',
 'upload-transcripts': 'SparksAI-Upload Transcripts',
 'users-admin': 'SparksAI-Users',
 'teams-and-meetings': 'SparksAI-Teams & Meetings',
 'jira-settings': 'SparksAI-Jira Settings',
 'github-settings': 'SparksAI-GitHub Settings',
 };

 useEffect(() => {
 const fallbackTitle = 'SparksAI';
 document.title = titles[activeNavItem] ?? fallbackTitle;
 }, [activeNavItem]);


 // Fetch prompts when on team-dashboard or pi-dashboard
 useEffect(() => {
 const fetchPrompts = async () => {
 if (activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') {
 try {
 setLoadingPrompts(true);
 // Determine prompt type based on active dashboard
    const promptType = activeNavItem === 'team-dashboard' ? 'Team Dashboard' : piLabel('Dashboard');
 const fetchedPrompts = await apiService.getPrompts({ 
 email_address: 'ofer972@gmail.com',
 prompt_type: promptType
 });
 setPrompts(fetchedPrompts || []);
 // Reset selection when prompts change
 setSelectedPrompt('');
 } catch (error) {
 console.error('Error fetching prompts:', error);
 setPrompts([]);
 } finally {
 setLoadingPrompts(false);
 }
 } else {
 setPrompts([]);
 setSelectedPrompt('');
 }
 };

 fetchPrompts();
 }, [activeNavItem]);

 const renderMainContent = () => {
 switch (activeNavItem) {
    case 'home':
        return (
          <HomeDashboard
            onOpenDetail={(detail: { id: string; title: string; description?: string; kind?: 'metric' | 'insight' | 'goal' | 'shortcut' }) => {
              setHomeDetail(detail);
              setSelectedInsightCard(null);
              setSelectedKPIDashboard(null);
              setActiveNavItem('home-detail');
            }}
            onOpenInsight={(card: AICard) => {
              setSelectedInsightCard(card);
              setHomeDetail(null);
              setSelectedKPIDashboard(null);
              setActiveNavItem('home-detail');
            }}
            onOpenKPIDashboard={(data: KPIDashboardData) => {
              setSelectedKPIDashboard(data);
              setHomeDetail(null);
              setSelectedInsightCard(null);
              setActiveNavItem('home-detail');
            }}
            onNavigate={(navItem: NavItemId | string) => handleNavigation(navItem)}
            defaultTeamOrGroupName={homeDefaultContext?.name ?? null}
            defaultTreeType={homeDefaultContext?.type ?? null}
            currentPIName={homeCurrentPIName || null}
            customDashboards={customDashboards}
          />
        );
      case 'home-detail':
        // Show InsightDashboard if an insight card is selected
        if (selectedInsightCard) {
          return (
            <InsightDashboard
              card={selectedInsightCard}
              onBack={goHome}
              currentPIName={selectedPI || homeCurrentPIName || undefined}
            />
          );
        }
        // Show KPIDashboard if a DORA KPI is selected
        if (selectedKPIDashboard) {
          return (
            <KPIDashboard
              title={selectedKPIDashboard.title}
              value={selectedKPIDashboard.value}
              tierStatus={selectedKPIDashboard.tierStatus}
              description={selectedKPIDashboard.description}
              trend={selectedKPIDashboard.trend}
              reportIds={selectedKPIDashboard.reportIds}
              initialFilters={selectedKPIDashboard.initialFilters}
              metric={selectedKPIDashboard.metric}
              onBack={goHome}
            />
          );
        }
        // Otherwise show HomeDetailPlaceholder
        return (
          <HomeDetailPlaceholder
            detail={
              homeDetail ?? {
                id: 'placeholder',
                title: 'Details',
                description: 'Placeholder detail screen',
                kind: 'metric',
              }
            }
            onBack={goHome}
          />
        );
 case 'team-ai-insights':
 return (
 <TeamAIInsightsView
 selectedPI={teamInsightsFilters.selectedPI}
 selectedTeam={teamInsightsFilters.selectedTeam}
 selectedTreeType={teamInsightsFilters.selectedTreeType}
              selectedCategories={teamInsightsFilters.selectedCategories}
              isLoading={teamInsightSettings.isLoading}
              isReady={teamInsightsReadyRef.current && teamInsightsReady}
              onOpenKPIDashboard={(data: SprintKPIDashboardData) => {
                // Convert SprintKPIDashboardData to KPIDashboardData format
                const kpiData: KPIDashboardData = {
                  title: data.title,
                  value: data.value,
                  tierStatus: (data.tierStatus === '' ? 'medium' : data.tierStatus) as 'elite' | 'high' | 'medium' | 'low',
                  description: data.description,
                  trend: data.trend,
                  reportIds: data.reportIds,
                  initialFilters: data.initialFilters,
                  metric: data.metric ? {
                    ...data.metric,
                    tier_status: (data.metric.tier_status === '' ? 'medium' : data.metric.tier_status) as 'elite' | 'high' | 'medium' | 'low',
                    trend: data.metric.trend || undefined
                  } : undefined,
                };
                setSelectedKPIDashboard(kpiData);
                setHomeDetail(null);
                setSelectedInsightCard(null);
                setActiveNavItem('home-detail');
              }}
 />
 );
 case 'team-dashboard':
 return (
 <TeamDashboardView
 selectedTeam={teamDashboardFilters.selectedTeam}
 selectedTreeType={teamDashboardFilters.selectedTreeType}
 selectedTreeValue={teamDashboardFilters.selectedTreeValue}
 />
 );
 case 'pi-dashboard':
 return (
 <PIDashboardView 
 selectedPI={piDashboardFilters.selectedPI} 
 selectedTeam={piDashboardFilters.selectedTeam}
 selectedTreeType={piDashboardFilters.selectedTreeType}
 selectedTreeValue={piDashboardFilters.selectedTreeValue}
 />
      );
      case 'settings':
 return <SystemSettingsView />;
 case 'create-agent-job':
 return <CreateAgentJobView />;
 case 'general-data':
 return (
 <div className="h-full flex flex-col">
 <div className="flex-1 overflow-hidden min-h-0">
 <GeneralDataView />
 </div>
 </div>
 );
 case 'upload-transcripts':
 return (
 <UploadTranscriptsView
 selectedTeam={uploadTranscriptsFilters.selectedTeam}
 selectedPI={uploadTranscriptsFilters.selectedPI}
 onTeamChange={(team) => setUploadTranscriptsFilters(prev => ({ ...prev, selectedTeam: team }))}
 onPIChange={(pi) => setUploadTranscriptsFilters(prev => ({ ...prev, selectedPI: pi }))}
 />
 );
 case 'users-admin':
 return <UsersAdminView />;
 case 'teams-and-meetings':
 return <TeamsAndMeetingsView />;
 case 'jira-settings':
 return <JiraSettingsView />;
 case 'github-settings':
 return <GitHubSettingsView />;
 case 'user-settings':
 return <UserSettingsView />;
 case 'goal-progress':
 return <GoalProgressTab />;
 case 'pi-goals':
 return <PIGoalsTab />;
      case 'sprint-goals':
        return <SprintGoalsTab />;
      case 'github-analysis':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden min-h-0">
              <GitHubAnalysisView />
            </div>
          </div>
        );
      case 'custom-dashboards':
 return (
 <CustomDashboardsView
 onSelectDashboard={(dashboardId) => {
 setSelectedCustomDashboardId(dashboardId);
 setActiveNavItem('custom-dashboard-editor');
 }}
 onDashboardCreated={loadDashboards}
 />
 );
 case 'custom-dashboard-editor':
 if (!selectedCustomDashboardId) {
 return (
 <div className="p-4">
 <p className="text-content-secondary">No dashboard selected. Please select a dashboard from My Dashboards.</p>
 <button
 onClick={() => setActiveNavItem('custom-dashboards')}
 className="mt-4 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover"
 >
 Go to My Dashboards
 </button>
 </div>
 );
 }
 return (
 <CustomDashboardEditor
 dashboardId={selectedCustomDashboardId}
 filters={customDashboardFilters}
 onFiltersChange={setCustomDashboardFilters}
 onDashboardLoaded={(data, options) => {
 setCustomDashboardData(data);
 setIsViewingOthersPublicDashboard(options?.isOwnedByCurrentUser === false);
 }}
 onRedirectToHome={() => { setSelectedCustomDashboardId(null); setCustomDashboardData(null); setIsViewingOthersPublicDashboard(false); setActiveNavItem('home'); }}
 onClose={() => {
 setSelectedCustomDashboardId(null);
 setCustomDashboardData(null);
 setIsViewingOthersPublicDashboard(false);
 setActiveNavItem('custom-dashboards');
 }}
 onSave={() => {
 // Dashboard saved, could show a success message
 }}
 />
 );
 default:
 return (
 <div className="bg-surface rounded-lg shadow-sm p-6 text-center">
 <div className="text-4xl mb-3">🚧</div>
 <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
 <p className="text-sm text-content-secondary">
 {navigationItems.find(item => item.id === activeNavItem)?.label} is under development.
 </p>
 </div>
 );
 }
 };

 return authChecked ? (
 <div className="h-screen bg-surface flex flex-col overflow-hidden">
 {/* Welcome Modal (first-time login) */}
 <WelcomeModal
 isOpen={showWelcomeModal}
 onClose={handleWelcomeModalClose}
 />
 
 {/* JIRA Setup Modal */}
 <JiraSetupModal
 isOpen={showJiraSetupModal}
 hasPermission={isAdmin}
 onConfirm={handleJiraSetupConfirm}
 onClose={handleJiraSetupConfirm}
 />
 
{/* Mobile Sidebar Overlay */}
{mobileSidebarOpen && (
<div className="fixed inset-0 z-50 md:hidden">
<div className="absolute inset-0 bg-black/30 dark:bg-black/60" onClick={() => setMobileSidebarOpen(false)}></div>
<div className="absolute inset-y-0 left-0 w-56 bg-surface shadow-xl border-r border-outline flex flex-col">
 <div className="flex items-center justify-between px-3 pt-3 pb-[10px] bg-surface">
 <div className="flex-1 flex justify-center">
 <SparksAILogo collapsed={false} size="small" />
 </div>
 <button
 onClick={() => setMobileSidebarOpen(false)}
 className="p-2 text-content-tertiary hover:text-content-primary dark:hover:text-white hover:bg-surface-secondary rounded-md transition-colors"
 aria-label="Close sidebar"
 type="button"
 >
 ✕
 </button>
 </div>
 {/* Mobile Nav (uses same groups) */}
              <nav data-theme-area="sidebar" className="flex-1 overflow-y-auto bg-gradient-to-b from-surface to-surface-elevated rounded-tl-2xl px-3 pt-3 pb-3 border-t border-outline">
 <div className="space-y-3">
 {/* Home Button - Mobile */}
 <button
 onClick={() => {
 handleNavigation('home');
 setMobileSidebarOpen(false);
 }}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 border ${
 activeNavItem === 'home'
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border-indigo-200/60 dark:border-indigo-700/60'
 : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 }`}
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15a1.5 1.5 0 01-1.5-1.5v-6h-3v6A1.5 1.5 0 019 22.5H4.5A1.5 1.5 0 013 21v-10.5z" />
 </svg>
 <span className="text-sm font-medium">Home</span>
 </button>
 <div className="border-b border-outline"></div>
 {navigationGroups.map((group) => (
 <div key={group.title}>
 <div className="w-full flex items-center justify-between px-2 py-2">
 <button
 onClick={() => toggleGroup(group.title)}
 className="flex-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-content-tertiary hover:text-content-primary transition-colors"
 >
 <span>{group.title}</span>
 <div className="flex items-center gap-2">
 {group.title === 'My Dashboards' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleNavigation('custom-dashboards' as NavItemId);
 setMobileSidebarOpen(false);
 }}
 className="p-1.5 rounded-md text-content-muted hover:text-content-secondary hover:bg-surface-secondary transition-colors"
 title="Open My Dashboards"
 aria-label="Open My Dashboards"
 >
 <svg 
 className="w-3.5 h-3.5" 
 fill="none" 
 viewBox="0 0 24 24" 
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
 </svg>
 </button>
 )}
 <svg 
 className={`w-3 h-3 transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-180' : ''}`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </button>
 </div>
 {expandedGroups[group.title] && (
 <div className={`mt-1 space-y-1 ${group.title === 'My Dashboards' ? 'max-h-[12.5rem] overflow-y-auto overflow-x-auto' : ''}`}>
 {group.items.map((item) => {
 const hasChildren = item.children && item.children.length > 0;
 const isExpanded = expandedItems[item.id] ?? false;
 const isItemActive = activeNavItem === item.id || (item.id.startsWith('custom-dashboard-') && selectedCustomDashboardId === item.id.replace('custom-dashboard-', '') && activeNavItem === 'custom-dashboard-editor');
 
 return (
 <div key={item.id} className={group.title === 'My Dashboards' ? 'flex-shrink-0' : ''}>
 <button
 onClick={() => {
 if (hasChildren) {
 setExpandedItems(prev => ({ ...prev, [item.id]: !isExpanded }));
 } else {
 handleNavigation(item.id as NavItemId);
 setMobileSidebarOpen(false);
 }
 }}
 className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 border ${
 isItemActive && !hasChildren
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-700/60'
                  : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 } ${group.title === 'My Dashboards' ? 'min-w-max' : ''}`}
 title={item.label}
 >
 {hasChildren ? (
 <svg 
 className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} flex-shrink-0`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 ) : null}
 <span className={`flex-shrink-0 flex items-center justify-center ${isItemActive && !hasChildren ? 'text-indigo-700 dark:text-indigo-300' : 'text-content-tertiary'}`}>{item.icon}</span>
 <span className={`text-xs font-medium ${group.title === 'My Dashboards' ? 'whitespace-nowrap' : ''}`}>{item.label}</span>
 </button>
 {hasChildren && isExpanded && (
 <div className="ml-6 mt-1 space-y-1">
 {item.children!.map((child) => {
 const isChildActive = selectedCustomDashboardId === child.id.replace('custom-dashboard-', '') && activeNavItem === 'custom-dashboard-editor';
 return (
 <button
 key={child.id}
 onClick={() => {
 handleNavigation(child.id as NavItemId);
 setMobileSidebarOpen(false);
 }}
 className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 border ${
 isChildActive
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-700/60'
                  : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 }`}
 title={child.label}
 >
 <span className={`flex-shrink-0 flex items-center justify-center ${isChildActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-content-tertiary'}`}>{child.icon}</span>
 <span className="text-xs font-medium">{child.label}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 <div className="mx-2 my-2 border-t border-outline"></div>
 </div>
 ))}
 </div>
 </nav>
 </div>
 </div>
 )}

 {/* Desktop Layout: Sidebar Column + Main Column */}
 <div className="flex flex-1 overflow-hidden">
{/* Left Column: Logo + Sidebar (Hidden on Mobile) */}
<div
className={`hidden md:flex flex-shrink-0 ml-[5px] transition-all duration-300 ${
sidebarCollapsed ? 'w-16' : 'w-56'
} flex-col bg-surface shadow-sm`}
>
 {/* Logo Area - Fixed height to match TopBar */}
 <div className="h-[57px] flex items-center justify-center bg-surface px-2">
 <SparksAILogo collapsed={sidebarCollapsed} size={sidebarCollapsed ? "small" : "medium"} />
 </div>
 
 {/* Sidebar Navigation */}
 <div data-theme-area="sidebar" className="flex-1 flex flex-col overflow-hidden">
              <nav className={`flex-1 overflow-y-auto px-3 bg-gradient-to-b from-surface to-surface-elevated border border-outline rounded-tl-2xl ${
 sidebarCollapsed ? 'pt-3 pb-0' : 'pt-3 pb-3'
 }`}>
      {sidebarCollapsed ? (
        <div className="space-y-1">
          {/* Home Button - Collapsed */}
          <button
            onClick={() => handleNavigation('home')}
            className={`w-full flex items-center justify-center px-2 py-2.5 rounded-lg transition-colors duration-200 border ${
              activeNavItem === 'home'
                ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border-indigo-200/60 dark:border-indigo-700/60'
                : 'text-content-tertiary border-transparent hover:bg-surface-elevated hover:text-content-primary'
            }`}
            title="Home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15a1.5 1.5 0 01-1.5-1.5v-6h-3v6A1.5 1.5 0 019 22.5H4.5A1.5 1.5 0 013 21v-10.5z" />
            </svg>
          </button>
          <div className="border-b border-outline my-2"></div>
          {navigationGroups.flatMap((g) => {
            // For "My Dashboards" group, show only a single "My Dashboards" icon when collapsed
            if (g.title === 'My Dashboards') {
              return [{
                id: 'custom-dashboards',
                label: 'My Dashboards',
                icon: <IconDashboard />
              }];
            }
            // For other groups, flatten items normally but exclude custom dashboard items
            return g.items.flatMap(item => {
              // Skip individual custom dashboard items
              if (item.id.startsWith('custom-dashboard-')) {
                return [];
              }
              return item.children ? [item, ...item.children] : [item];
            });
          }).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id as NavItemId)}
              className={`w-full flex items-center justify-center px-2 py-2.5 rounded-lg transition-colors duration-200 border ${
                activeNavItem === item.id || (item.id === 'custom-dashboards' && activeNavItem === 'custom-dashboards') || (item.id.startsWith('custom-dashboard-') && selectedCustomDashboardId === item.id.replace('custom-dashboard-', '') && activeNavItem === 'custom-dashboard-editor')
                  ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border-indigo-200/60 dark:border-indigo-700/60'
                  : 'text-content-tertiary border-transparent hover:bg-surface-elevated hover:text-content-primary'
              }`}
              title={item.label}
            >
              <span className="flex items-center justify-center">{item.icon}</span>
            </button>
          ))}
        </div>
 ) : (
 <div className="space-y-3">
 {/* Home Button - Expanded */}
 <button
 onClick={() => handleNavigation('home')}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 border ${
 activeNavItem === 'home'
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border-indigo-200/60 dark:border-indigo-700/60'
 : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 }`}
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15a1.5 1.5 0 01-1.5-1.5v-6h-3v6A1.5 1.5 0 019 22.5H4.5A1.5 1.5 0 013 21v-10.5z" />
 </svg>
 <span className="text-sm font-medium">Home</span>
 </button>
 <div className="border-b border-outline"></div>
 {navigationGroups.map((group) => (
 <div key={group.title}>
 <div className="w-full flex items-center justify-between px-2 py-2">
 <button
 onClick={() => toggleGroup(group.title)}
 className="flex-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-content-tertiary hover:text-content-primary transition-colors"
 >
 <span>{group.title}</span>
 <div className="flex items-center gap-2">
 {group.title === 'My Dashboards' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleNavigation('custom-dashboards' as NavItemId);
 }}
 className="p-1.5 rounded-md text-content-muted hover:text-content-secondary hover:bg-surface-secondary transition-colors"
 title="Open My Dashboards"
 aria-label="Open My Dashboards"
 >
 <svg 
 className="w-3.5 h-3.5" 
 fill="none" 
 viewBox="0 0 24 24" 
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
 </svg>
 </button>
 )}
 <svg 
 className={`w-3 h-3 transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-180' : ''}`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </div>
 </button>
 </div>
 {expandedGroups[group.title] && (
 <div className={`mt-1 space-y-1 ${group.title === 'My Dashboards' ? 'max-h-[12.5rem] overflow-y-auto overflow-x-auto' : ''}`}>
 {group.items.map((item) => {
 const hasChildren = item.children && item.children.length > 0;
 const isExpanded = expandedItems[item.id] ?? false;
 const isItemActive = activeNavItem === item.id || (item.id.startsWith('custom-dashboard-') && selectedCustomDashboardId === item.id.replace('custom-dashboard-', '') && activeNavItem === 'custom-dashboard-editor');
 
 return (
 <div key={item.id} className={group.title === 'My Dashboards' ? 'flex-shrink-0' : ''}>
 <button
 onClick={() => {
 if (hasChildren) {
 setExpandedItems(prev => ({ ...prev, [item.id]: !isExpanded }));
 } else {
 handleNavigation(item.id as NavItemId);
 }
 }}
 className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 border ${
 isItemActive && !hasChildren
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-700/60'
                  : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 } ${group.title === 'My Dashboards' ? 'min-w-max' : ''}`}
 title={item.label}
 >
 {hasChildren ? (
 <svg 
 className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} flex-shrink-0`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 ) : null}
 <span className={`flex-shrink-0 flex items-center justify-center ${isItemActive && !hasChildren ? 'text-indigo-700 dark:text-indigo-300' : 'text-content-tertiary'}`}>{item.icon}</span>
 <span className={`text-xs font-medium ${group.title === 'My Dashboards' ? 'whitespace-nowrap' : ''}`}>{item.label}</span>
 </button>
 {hasChildren && isExpanded && (
 <div className="ml-6 mt-1 space-y-1">
 {item.children!.map((child) => {
 const isChildActive = selectedCustomDashboardId === child.id.replace('custom-dashboard-', '') && activeNavItem === 'custom-dashboard-editor';
 return (
 <button
 key={child.id}
 onClick={() => handleNavigation(child.id as NavItemId)}
 className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 border ${
 isChildActive
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-700/60'
                  : 'text-content-secondary border-transparent hover:bg-surface-elevated hover:text-content-primary'
 }`}
 title={child.label}
 >
 <span className={`flex-shrink-0 flex items-center justify-center ${isChildActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-content-tertiary'}`}>{child.icon}</span>
 <span className="text-xs font-medium">{child.label}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 <div className="mx-2 my-2 border-t border-outline"></div>
 </div>
 ))}
 </div>
 )}
 </nav>

 {/* Collapse Button */}
 <div className={`mt-auto ${
                sidebarCollapsed ? 'bg-gradient-to-b from-surface to-surface-elevated border-t-0' : 'bg-gradient-to-b from-surface to-surface-elevated border-t border-outline'
 }`}>
 <button 
 onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
 className="w-full text-content-tertiary hover:text-content-primary py-3 px-3 hover:bg-surface-secondary flex items-center justify-center transition-colors"
 title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
 sidebarCollapsed ?"M9 5l7 7-7 7" :"M15 19l-7-7 7-7"
 } />
 </svg>
 {!sidebarCollapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
 </button>
 </div>
 </div>
 </div>

 {/* Right Column: TopBar + Content */}
 <div className="flex-1 flex flex-col min-w-0">
 {/* TopBar Wrapper - Contains main bar (57px) and optional filter panel */}
 <div className="flex-shrink-0">
 <TopBar
 activeNavItem={activeNavItem}
 navigationItems={navigationItems}
            customViewTitle={
              activeNavItem === 'custom-dashboards' 
                ? 'My Dashboards' 
                : activeNavItem === 'custom-dashboard-editor' && customDashboardData
                  ? customDashboardData.name
                  : activeNavItem === 'home'
                    ? 'Home'
                    : activeNavItem === 'home-detail'
                      ? (selectedInsightCard?.card_name ?? selectedKPIDashboard?.title ?? homeDetail?.title ?? 'Details')
 : undefined
 }
 breadcrumbs={breadcrumbs}
 onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
 dashboardSettings={(activeNavItem === 'custom-dashboard-editor') ? {
 hasChanges: false,
 isSaving: false,
 onSave: () => {},
 onReset: () => {},
 } : undefined}
 insightSettings={undefined}
 filters={{
 selectedPI: (() => {
 switch (activeNavItem) {
 case 'pi-dashboard': return piDashboardFilters.selectedPI;
 case 'team-ai-insights': return teamInsightsFilters.selectedPI;
 case 'upload-transcripts': return uploadTranscriptsFilters.selectedPI;
 case 'custom-dashboard-editor': return customDashboardFilters.selectedPI;
 default: return selectedPI;
 }
 })(),
 onPIChange: (pi: string) => {
 switch (activeNavItem) {
 case 'pi-dashboard':
 setPiDashboardFilters(prev => ({ ...prev, selectedPI: pi }));
 break;
 case 'team-ai-insights':
 setTeamInsightsFilters(prev => ({ ...prev, selectedPI: pi }));
 setSelectedPI(pi); // Update legacy state for views that need it
 break;
 case 'upload-transcripts':
 setUploadTranscriptsFilters(prev => ({ ...prev, selectedPI: pi }));
 break;
 case 'custom-dashboard-editor':
 setCustomDashboardFilters(prev => ({ ...prev, selectedPI: pi }));
 break;
 default:
 setSelectedPI(pi);
 }
 },
 selectedTreeValue: (() => {
 switch (activeNavItem) {
 case 'team-dashboard': return teamDashboardFilters.selectedTreeValue;
 case 'pi-dashboard': return piDashboardFilters.selectedTreeValue;
 case 'team-ai-insights': return teamInsightsFilters.selectedTreeValue;
 case 'upload-transcripts': return uploadTranscriptsFilters.selectedTreeValue;
 case 'custom-dashboard-editor': return customDashboardFilters.selectedTreeValue;
 default: return selectedTreeValue;
 }
 })(),
 selectedTreeLabel: (() => {
 switch (activeNavItem) {
 case 'team-dashboard': return teamDashboardFilters.selectedTreeLabel;
 case 'pi-dashboard': return piDashboardFilters.selectedTreeLabel;
 case 'team-ai-insights': return teamInsightsFilters.selectedTreeLabel;
 case 'upload-transcripts': return uploadTranscriptsFilters.selectedTreeLabel;
 case 'custom-dashboard-editor': return customDashboardFilters.selectedTreeLabel;
 default: return selectedTreeLabel;
 }
 })(),
 onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => {
 switch (activeNavItem) {
 case 'team-dashboard':
 setTeamDashboardFilters({
 selectedTeam: value ? label : '',
 selectedTreeValue: value,
 selectedTreeLabel: value ? label : '',
 selectedTreeType: type,
 });
 break;
 case 'pi-dashboard':
 setPiDashboardFilters(prev => ({
 ...prev,
 selectedTeam: value ? label : '',
 selectedTreeValue: value,
 selectedTreeLabel: value ? label : '',
 selectedTreeType: type,
 }));
 break;
 case 'team-ai-insights':
 setTeamInsightsFilters(prev => ({
 ...prev,
 selectedTeam: value ? label : '',
 selectedTreeValue: value,
 selectedTreeLabel: value ? label : '',
 selectedTreeType: type,
 }));
 setSelectedTeam(value ? label : ''); // Update legacy state for views that need it
 setSelectedTreeType(type); // Update legacy selectedTreeType state
 break;
 case 'upload-transcripts':
 setUploadTranscriptsFilters(prev => ({
 ...prev,
 selectedTeam: value ? label : '',
 selectedTreeValue: value,
 selectedTreeLabel: value ? label : '',
 selectedTreeType: type,
 }));
 break;
 case 'custom-dashboard-editor':
 setCustomDashboardFilters(prev => ({
 ...prev,
 selectedTeam: value ? label : '',
 selectedTreeValue: value,
 selectedTreeLabel: value ? label : '',
 selectedTreeType: type,
 }));
 break;
 default:
 setSelectedTreeValue(value);
 setSelectedTreeLabel(value ? label : '');
 setSelectedTreeType(type);
 setSelectedTeam(value ? label : '');
 }
 },
 selectedCategories: activeNavItem === 'team-ai-insights' 
 ? teamInsightsFilters.selectedCategories 
 : selectedCategories,
 onCategoriesChange: (categories: string[]) => {
 if (activeNavItem === 'team-ai-insights') {
 setTeamInsightsFilters(prev => ({ ...prev, selectedCategories: categories }));
 }
 setSelectedCategories(categories);
 },
 settingsLoading: activeNavItem === 'team-ai-insights' 
 ? teamInsightSettings.isLoading 
 : false,
 hasSavedSettings: activeNavItem === 'team-ai-insights'
 ? !!teamInsightSettings.savedState
 : false,
 currentPIName: activeNavItem === 'team-ai-insights' ? currentPIName : undefined,
 }}
 aiChat={(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'custom-dashboard-editor') ? {
 onOpenChat: (dashboardData?: any) => {
 console.log('[AI Menu] Opening chat modal with dashboard data:', dashboardData);
 setCollectedDashboardData(dashboardData || null);
 setIsDashboardChatModalOpen(true);
 },
 prompts: prompts,
 selectedPrompt: selectedPrompt,
 onPromptChange: setSelectedPrompt,
 loadingPrompts: loadingPrompts,
 } : undefined}
 insightChat={(activeNavItem === 'home-detail' && selectedInsightCard) ? {
 onOpenChat: () => {
 console.log('[AI Chat] Opening chat for insight card:', selectedInsightCard.id);
 setIsInsightChatModalOpen(true);
 },
 } : undefined}
 kpiDashboardChat={(activeNavItem === 'home-detail' && selectedKPIDashboard) ? {
 onOpenChat: () => {
 console.log('[AI Chat] Requesting KPI dashboard data for:', selectedKPIDashboard.title);
 // Dispatch event to collect current report filters from KPIDashboard
 window.dispatchEvent(new CustomEvent('collect-kpi-dashboard-data'));
 },
 } : undefined}
 currentUser={getCurrentUser()}
 onLogout={() => { logout(); try { location.assign('/login'); } catch {} }}
 onNavigateToSettings={() => setActiveNavItem('user-settings')}
 isPublic={activeNavItem === 'custom-dashboard-editor' && !isViewingOthersPublicDashboard ? isPublicDashboard : undefined}
 onTogglePublic={activeNavItem === 'custom-dashboard-editor' && !isViewingOthersPublicDashboard ? handleTogglePublicDashboard : undefined}
 isViewingOthersPublicDashboard={activeNavItem === 'custom-dashboard-editor' && isViewingOthersPublicDashboard}
 publicDashboardOwnerName={activeNavItem === 'custom-dashboard-editor' && isViewingOthersPublicDashboard ? customDashboardData?.owner_name : undefined}
 onCreateFromPublicDashboard={activeNavItem === 'custom-dashboard-editor' && isViewingOthersPublicDashboard ? () => { setCreateFromPublicName((customDashboardData?.name || '') + ' (Copy)'); setShowCreateFromPublicModal(true); } : undefined}
 />
 </div>

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

 {/* Content Area */}
 <div className={`flex-1 p-2 overflow-auto ${
 activeNavItem === 'team-ai-insights' && (teamInsightsFilters.selectedTeam || teamInsightsFilters.selectedPI)
 ? 'pb-[200px]'
 : ''
 }`}>
 {renderMainContent()}
 </div>

 {/* Metrics Bottom Bar with Tabs - only for team-ai-insights on desktop when team/group or PI is selected */}
 {activeNavItem === 'team-ai-insights' && (teamInsightsFilters.selectedTeam || teamInsightsFilters.selectedPI) && (
 <div className="hidden md:flex flex-shrink-0 flex-row bg-transparent absolute bottom-0 w-full z-30 items-start" style={{ overflow: 'visible' }}>
 
 {/* Metrics Content */}
 <div className="flex-1 border-t border-r border-outline-strong rounded-tl-lg bg-surface" style={{ zoom: 0.90, overflow: 'visible' }}>
 <div className="px-3 md:px-4 py-2 md:py-2.5 w-full" style={{ overflow: 'visible' }}>
                {insightMetricsTab === 'team' && teamInsightsFilters.selectedTeam ? (
                  <SprintKPIs 
                    teamName={teamInsightsFilters.selectedTeam} 
                    isGroup={teamInsightsFilters.selectedTreeType === 'group'} 
                    singleRowLayout={true}
                    selectedMetrics={['sprint_velocity', 'sprint_predictability', 'sprint_wip', 'sprint_completion', 'sprint_days_left', 'cycle_time', 'open_bugs']}
                    layout="wide"
                    onOpenKPIDashboard={(data: SprintKPIDashboardData) => {
                      // Convert SprintKPIDashboardData to KPIDashboardData format
                      const kpiData: KPIDashboardData = {
                        title: data.title,
                        value: data.value,
                        tierStatus: (data.tierStatus === '' ? 'medium' : data.tierStatus) as 'elite' | 'high' | 'medium' | 'low',
                        description: data.description,
                        trend: data.trend,
                        reportIds: data.reportIds,
                        initialFilters: data.initialFilters,
                        metric: data.metric ? {
                          ...data.metric,
                          tier_status: (data.metric.tier_status === '' ? 'medium' : data.metric.tier_status) as 'elite' | 'high' | 'medium' | 'low',
                          trend: data.metric.trend || undefined
                        } : undefined,
                      };
                      setSelectedKPIDashboard(kpiData);
                      setHomeDetail(null);
                      setSelectedInsightCard(null);
                      setActiveNavItem('home-detail');
                    }}
                  />
                ) : insightMetricsTab === 'pi' && teamInsightsFilters.selectedPI ? (
                  <PIMetrics 
                    piName={teamInsightsFilters.selectedPI} 
                    teamName={teamInsightsFilters.selectedTeam} 
                    isGroup={teamInsightsFilters.selectedTreeType === 'group'} 
                    singleRowLayout={true}
                    selectedMetrics={['pi_completion', 'pi_wip', 'epic_cycle_time', 'pi_outbound_dependencies', 'pi_inbound_dependencies']}
                    layout="wide"
                    onOpenKPIDashboard={(data) => {
                      const kpiData: KPIDashboardData = {
                        title: data.title,
                        value: data.value,
                        tierStatus: data.tierStatus as 'elite' | 'high' | 'medium' | 'low',
                        description: data.description,
                        trend: data.trend || undefined,
                        reportIds: data.reportIds,
                        initialFilters: data.initialFilters,
                        metric: data.metric as any,
                      };
                      setSelectedKPIDashboard(kpiData);
                      setHomeDetail(null);
                      setSelectedInsightCard(null);
                      setActiveNavItem('home-detail');
                    }}
                    defaultTeamOrGroupName={teamInsightsFilters.selectedTeam}
                    defaultTreeType={teamInsightsFilters.selectedTreeType}
                    currentPIName={teamInsightsFilters.selectedPI}
                  />
                ) : null}
 </div>
 </div>

 {/* Tabs (Vertical on Right) */}
 <div className="flex flex-col space-y-1 bg-transparent pl-0 pt-0">
 {teamInsightsFilters.selectedTeam && (
 <button
 onClick={() => setInsightMetricsTab('team')}
 className={`flex items-center justify-center px-2.5 py-4 text-sm font-medium rounded-r-lg border-y border-r border-l-0 transition-colors whitespace-nowrap ${
 insightMetricsTab === 'team'
 ? 'bg-surface text-brand border-outline-strong -ml-px z-10'
 : 'bg-surface-elevated text-content-tertiary border-outline hover:bg-surface-secondary hover:bg-surface-secondary'
 }`}
 style={{ writingMode: 'vertical-rl' }}
 >
 Sprint
 </button>
 )}
 {teamInsightsFilters.selectedPI && (
 <button
 onClick={() => setInsightMetricsTab('pi')}
 className={`flex items-center justify-center px-2.5 py-4 text-sm font-medium rounded-r-lg border-y border-r border-l-0 transition-colors whitespace-nowrap ${
 insightMetricsTab === 'pi'
 ? 'bg-surface text-brand border-outline-strong -ml-px z-10'
 : 'bg-surface-elevated text-content-tertiary border-outline hover:bg-surface-secondary hover:bg-surface-secondary'
 }`}
            style={{ writingMode: 'vertical-rl' }}
            >
            {getPITerminology()}
            </button>
 )}
 </div>
 </div>
 )}

 </div>
 </div>
 </div>

 {/* Dashboard Insights AI Chat Modal */}
 {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'custom-dashboard-editor') && (
 <AIChatModal
 isOpen={isDashboardChatModalOpen}
 onClose={() => {
 console.log('[AI Modal] Closing modal');
 setIsDashboardChatModalOpen(false);
 setCollectedDashboardData(null);
 }}
 chatType={
 activeNavItem === 'team-dashboard' 
 ? 'Team_dashboard' 
 : activeNavItem === 'pi-dashboard' 
 ? 'PI_dashboard' 
 : activeNavItem === 'custom-dashboard-editor'
 ? 'Custom_dashboard'
 : ''
 }
 teamName={
 activeNavItem === 'team-dashboard' 
 ? selectedTeam 
 : activeNavItem === 'custom-dashboard-editor' && collectedDashboardData?.topBarFilters?.selectedTeam
 ? collectedDashboardData.topBarFilters.selectedTeam
 : undefined
 }
 piName={
 activeNavItem === 'pi-dashboard' 
 ? selectedPI 
 : activeNavItem === 'custom-dashboard-editor' && collectedDashboardData?.topBarFilters?.selectedPI
 ? collectedDashboardData.topBarFilters.selectedPI
 : undefined
 }
 promptName={selectedPrompt && selectedPrompt.trim() !== '' && selectedPrompt !== '[use default]' ? selectedPrompt : undefined}
 dashboardData={collectedDashboardData}
 />
 )}

 {/* Insight Detail AI Chat Modal */}
 {activeNavItem === 'home-detail' && selectedInsightCard && (
 <AIChatModal
 isOpen={isInsightChatModalOpen}
 onClose={() => {
 console.log('[AI Modal] Closing insight chat modal');
 setIsInsightChatModalOpen(false);
 }}
 chatType="Team_insights"
 insightsId={selectedInsightCard.id}
 teamName={selectedInsightCard.team_name || ''}
 piName={selectedInsightCard.pi || undefined}
 />
 )}

 {/* KPI Dashboard AI Chat Modal */}
 {activeNavItem === 'home-detail' && selectedKPIDashboard && collectedKPIDashboardData && (
 <AIChatModal
 isOpen={isKPIDashboardChatModalOpen}
 onClose={() => {
 console.log('[AI Modal] Closing KPI dashboard chat modal');
 setIsKPIDashboardChatModalOpen(false);
 setCollectedKPIDashboardData(null);
 }}
 chatType="Custom_dashboard"
 teamName={collectedKPIDashboardData.topBarFilters?.selectedTeam || ''}
 piName={collectedKPIDashboardData.topBarFilters?.selectedPI || ''}
 dashboardData={collectedKPIDashboardData}
 />
 )}
 
 {/* Create from Public Dashboard Modal */}
 {showCreateFromPublicModal && customDashboardData && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
 <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
 <h3 className="text-lg font-semibold text-content-primary mb-2">Create from</h3>
 <p className="text-sm text-content-secondary mb-4">
 Create a copy of &quot;{customDashboardData.name}&quot; in your dashboards.
 </p>
 <input
 type="text"
 value={createFromPublicName}
 onChange={(e) => setCreateFromPublicName(e.target.value)}
 placeholder="Dashboard name"
 className="w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary mb-4"
 autoFocus
 />
 <div className="flex justify-end gap-3">
 <button
 onClick={() => { setShowCreateFromPublicModal(false); setCreateFromPublicName(''); }}
 className="px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-secondary rounded"
 >
 Cancel
 </button>
 <button
 onClick={handleCreateFromPublicDashboard}
 disabled={!createFromPublicName.trim()}
 className="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-50 rounded"
 >
 Create
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Reset Dashboard Settings Confirmation Modal */}
 {showResetConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
 <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
 <h3 className="text-lg font-semibold text-content-primary mb-2">Reset Dashboard to Defaults?</h3>
 <p className="text-sm text-content-secondary mb-6">
 This will remove all your saved layout, filter preferences, and pinned filters for this dashboard. This action cannot be undone.
 </p>
 <div className="flex justify-end gap-3">
 <button
 onClick={() => setShowResetConfirm(false)}
 className="px-4 py-2 text-sm font-medium text-content-secondary bg-surface-secondary hover:bg-gray-200 rounded-lg transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleResetDashboardSettings}
 className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
 >
 Reset to Defaults
 </button>
 </div>
 </div>
 </div>
 )}
 
 {/* Unsaved Changes Modal */}
 <UnsavedChangesModal
 isOpen={showUnsavedChangesModal}
 onSave={handleSaveAndNavigate}
 onDiscard={handleDiscardAndNavigate}
 onCancel={handleCancelNavigation}
 />
 </div>
 ) : (
 <div className="min-h-screen flex items-center justify-center text-sm text-content-secondary">
 Loading...
 </div>
 );
}

export default function Home() {
  return (
    <GitHubSettingsProvider>
      <HomeContent />
    </GitHubSettingsProvider>
  );
}