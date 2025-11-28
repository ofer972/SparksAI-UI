'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, refreshAccessToken, clearTokens, getCurrentUser, logout } from '@/lib/auth';
import SettingsScreen from '@/components/SettingsScreen';
import TreeSelect from '@/components/TreeSelect';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';
import InsightCategoryFilter from '@/components/InsightCategoryFilter';
import AICards from '@/components/AICards';
import Recommendations from '@/components/Recommendations';
import TeamMetrics from '@/components/TeamMetrics';
import PIAICards from '@/components/PIAICards';
import TeamDashboard from '@/components/TeamDashboard';
import SparksAILogo from '@/components/SparksAILogo';
import ReportPanel from '@/components/ReportPanel';
import PIDashboardView from '@/components/PIDashboardView';
import GeneralDataView from '@/components/GeneralDataView';
import UploadTranscripts from '@/components/UploadTranscripts';
import AIChatModal from '@/components/AIChatModal';
import { getIssueTypes, getDefaultIssueType } from '@/lib/issueTypes';
import { ApiService, verifyAdmin, listUsers, getUserRoles, getAllowlist, addAllowlist, deleteAllowlist, deleteUser, listRoles, assignRoleToUser, unassignRoleFromUser, getPendingRoles, assignPendingRole, unassignPendingRole, RoleDto, UserDto } from '@/lib/api';
import DashboardAIMenu from '@/components/DashboardAIMenu';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { usePageSettings } from '@/hooks/usePageSettings';

export default function Home() {
  const router = useRouter();
  const { groups, teams, loading: teamsLoading } = useTeamsGroups();
  
  // Page settings hooks for insights pages
  const teamInsightSettings = usePageSettings('team-insight');
  const piInsightSettings = usePageSettings('pi-insight');
  
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{dashboard: string, filters: any} | null>(null);
  const initializedTreeValues = useRef(false);
  const appliedRestoreRef = useRef(false);
  useEffect(() => {
    (async () => {
      const token = getAccessToken();
      async function goLogin() {
        clearTokens();
        try { router.replace('/login'); } catch {}
        if (typeof window !== 'undefined') window.location.assign('/login');
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

  type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-quarter' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin';
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('team-ai-insights');
  const prevActiveNavItemRef = useRef<NavItemId>(activeNavItem);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
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
  
  // Separate filter state for each dashboard
  const [teamDashboardFilters, setTeamDashboardFilters] = useState({
    selectedTeam: '',
    selectedTreeValue: null as string | null,
    selectedTreeLabel: '',
    selectedTreeType: 'team' as 'group' | 'team',
  });
  
  const [piDashboardFilters, setPiDashboardFilters] = useState({
    selectedPI: 'Q32025',
    selectedTeam: '',
    selectedTreeValue: null as string | null,
    selectedTreeLabel: '',
    selectedTreeType: 'team' as 'group' | 'team',
  });
  
  // Legacy state for backward compatibility (team AI insights, etc.)
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTreeValue, setSelectedTreeValue] = useState<string | null>(null);
  const [selectedTreeLabel, setSelectedTreeLabel] = useState<string>('');
  const [selectedTreeType, setSelectedTreeType] = useState<'group' | 'team'>('team');
  const [selectedPI, setSelectedPI] = useState('Q32025');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    sprintGoal: false,
    dailyAgent: false,
    piSync: false,
    teamPiInsight: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDashboardChatModalOpen, setIsDashboardChatModalOpen] = useState(false);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [allowPattern, setAllowPattern] = useState('');
  const [makeAdminOnRegister, setMakeAdminOnRegister] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; userId?: string; userName?: string}>({show: false});
  const [deleteAllowlistConfirm, setDeleteAllowlistConfirm] = useState<{show: boolean; allowlistId?: string; pattern?: string}>({show: false});
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [pendingRoleAssignments, setPendingRoleAssignments] = useState<Record<string, RoleDto[]>>({});
  
  // Dashboard settings state
  const [dashboardSettingsState, setDashboardSettingsState] = useState<{
    hasChanges: boolean;
    isSaving: boolean;
    error: string | null;
  }>({ hasChanges: false, isSaving: false, error: null });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Insight settings state (for team-insight and pi-insight pages)
  const [insightSettingsState, setInsightSettingsState] = useState<{
    hasChanges: boolean;
    isSaving: boolean;
    error: string | null;
  }>({ hasChanges: false, isSaving: false, error: null });

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
    // Reload the page to apply defaults
    setTimeout(() => window.location.reload(), 500);
  };

  // Track team insight settings changes
  useEffect(() => {
    if (!teamInsightSettings.isLoading && activeNavItem === 'team-ai-insights') {
      teamInsightSettings.updateCurrentState({
        topBarFilters: {
          selectedTeam,
          selectedTreeType,
        },
        selectedCategories,
      });
    }
  }, [selectedTeam, selectedTreeType, selectedCategories, activeNavItem, teamInsightSettings.isLoading]);

  // Track PI insight settings changes
  useEffect(() => {
    if (!piInsightSettings.isLoading && activeNavItem === 'pi-quarter') {
      piInsightSettings.updateCurrentState({
        topBarFilters: {
          selectedPI,
          selectedTeam,
          selectedTreeType,
        },
      });
    }
  }, [selectedPI, selectedTeam, selectedTreeType, activeNavItem, piInsightSettings.isLoading]);

  // Update insight settings state based on active page
  useEffect(() => {
    if (activeNavItem === 'team-ai-insights') {
      setInsightSettingsState({
        hasChanges: teamInsightSettings.hasChanges,
        isSaving: teamInsightSettings.isSaving,
        error: teamInsightSettings.error,
      });
    } else if (activeNavItem === 'pi-quarter') {
      setInsightSettingsState({
        hasChanges: piInsightSettings.hasChanges,
        isSaving: piInsightSettings.isSaving,
        error: piInsightSettings.error,
      });
    }
  }, [
    activeNavItem,
    teamInsightSettings.hasChanges,
    teamInsightSettings.isSaving,
    teamInsightSettings.error,
    piInsightSettings.hasChanges,
    piInsightSettings.isSaving,
    piInsightSettings.error,
  ]);

  // Handle insight settings save
  const handleSaveInsightSettings = async () => {
    try {
      if (activeNavItem === 'team-ai-insights') {
        await teamInsightSettings.saveSettings();
      } else if (activeNavItem === 'pi-quarter') {
        await piInsightSettings.saveSettings();
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
  
  // Track if we're loading PI insights for the first time
  const [piInsightsReady, setPiInsightsReady] = useState(false);
  const piInsightsReadyRef = useRef(false);

  // Clear state when navigating TO team-ai-insights
  useEffect(() => {
    if (activeNavItem === 'team-ai-insights') {
      console.log('[App] Navigating to team-ai-insights, clearing state...');
      
      // Mark as not ready IMMEDIATELY using ref (synchronous)
      teamInsightsReadyRef.current = false;
      setTeamInsightsReady(false);
      
      // Clear state immediately when navigating to team-ai-insights
      setSelectedTeam('');
      setSelectedTreeValue(null);
      setSelectedTreeLabel('');
      setSelectedTreeType('team');
      setSelectedCategories([]);
    } else {
      // Reset when leaving team-ai-insights
      teamInsightsReadyRef.current = false;
      setTeamInsightsReady(false);
    }
  }, [activeNavItem]);

  // Load saved team insight settings after clearing
  useEffect(() => {
    if (activeNavItem === 'team-ai-insights' && !teamInsightSettings.isLoading && teamInsightSettings.savedState) {
      console.log('[App] Loading saved team insight settings:', teamInsightSettings.savedState);
      const saved = teamInsightSettings.savedState;
      
      if (saved.topBarFilters) {
        const teamName = saved.topBarFilters.selectedTeam;
        const treeType = saved.topBarFilters.selectedTreeType;
        
        if (teamName) {
          console.log('[App] Team Insight: Setting selectedTeam to:', teamName);
          setSelectedTeam(teamName);
          setSelectedTreeLabel(teamName);
          
          // Find and set the tree value from the team/group name
          if (treeType === 'group') {
            const group = groups.find(g => g.group_name === teamName);
            if (group) setSelectedTreeValue(`group:${group.group_key}`);
          } else {
            const team = teams.find(t => t.team_name === teamName);
            if (team) setSelectedTreeValue(`team:${team.team_key}`);
          }
        }
        
        if (treeType) setSelectedTreeType(treeType);
      }
      
      // Restore saved categories if they exist
      if (saved.selectedCategories !== undefined) {
        console.log('[App] Restoring saved categories:', saved.selectedCategories);
        setSelectedCategories(saved.selectedCategories);
      }
      
      // Mark as ready after settings are loaded (both ref and state)
      teamInsightsReadyRef.current = true;
      setTeamInsightsReady(true);
      console.log('[App] Team insights ready!');
    }
  }, [activeNavItem, teamInsightSettings.isLoading, teamInsightSettings.savedState, groups, teams]);

  // Clear state when navigating TO pi-quarter
  useEffect(() => {
    if (activeNavItem === 'pi-quarter') {
      console.log('[App] Navigating to pi-quarter, clearing state...');
      
      // Mark as not ready IMMEDIATELY using ref (synchronous)
      piInsightsReadyRef.current = false;
      setPiInsightsReady(false);
      
      // Clear state immediately when navigating to pi-quarter
      setSelectedPI('');
      setSelectedTeam('');
      setSelectedTreeValue(null);
      setSelectedTreeLabel('');
      setSelectedTreeType('team');
      setSelectedCategories([]);
    } else {
      // Reset when leaving pi-quarter
      piInsightsReadyRef.current = false;
      setPiInsightsReady(false);
    }
  }, [activeNavItem]);

  // Load saved PI insight settings after clearing
  useEffect(() => {
    if (activeNavItem === 'pi-quarter' && !piInsightSettings.isLoading && piInsightSettings.savedState) {
      console.log('[App] Loading saved PI insight settings:', piInsightSettings.savedState);
      const saved = piInsightSettings.savedState;
      
      if (saved.topBarFilters) {
        if (saved.topBarFilters.selectedPI) {
          console.log('[App] PI Insight: Setting selectedPI to:', saved.topBarFilters.selectedPI);
          setSelectedPI(saved.topBarFilters.selectedPI);
        }
        
        const teamName = saved.topBarFilters.selectedTeam;
        const treeType = saved.topBarFilters.selectedTreeType;
        
        if (teamName) {
          console.log('[App] PI Insight: Setting selectedTeam to:', teamName);
          setSelectedTeam(teamName);
          setSelectedTreeLabel(teamName);
          
          // Find and set the tree value from the team/group name
          if (treeType === 'group') {
            const group = groups.find(g => g.group_name === teamName);
            if (group) setSelectedTreeValue(`group:${group.group_key}`);
          } else {
            const team = teams.find(t => t.team_name === teamName);
            if (team) setSelectedTreeValue(`team:${team.team_key}`);
          }
        }
        
        if (treeType) setSelectedTreeType(treeType);
      }
      
      // Restore saved categories if they exist
      if (saved.selectedCategories !== undefined) {
        console.log('[App] Restoring saved PI categories:', saved.selectedCategories);
        setSelectedCategories(saved.selectedCategories);
      }
      
      // Mark as ready after settings are loaded (both ref and state)
      piInsightsReadyRef.current = true;
      setPiInsightsReady(true);
      console.log('[App] PI insights ready!');
    }
  }, [activeNavItem, piInsightSettings.isLoading, piInsightSettings.savedState, groups, teams]);

  const apiService = new ApiService();

  const navigationItems = [
    { id: 'team-ai-insights', label: 'Team AI Insights', icon: '💡' },
    { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
    { id: 'pi-quarter', label: 'PI AI Insights', icon: '🎯' },
    { id: 'pi-dashboard', label: 'PI Dashboard', icon: '📈' },
    { id: 'settings', label: 'System Settings', icon: '⚙️' },
    { id: 'general-data', label: 'View General Data', icon: '📁' },
    { id: 'create-agent-job', label: 'Create Agent Job', icon: '➕' },
    { id: 'upload-transcripts', label: 'Upload Transcripts', icon: '⬆️' },
    ...(isAdmin ? [{ id: 'users-admin', label: 'Users', icon: '👥' }] : []),
  ];

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

  // Accordion navigation groups for the sidebar UI (beautified)
  const navigationGroups: Array<{ title: string; items: { id: string; label: string; icon: React.ReactNode }[] }> = [
    {
      title: 'Insights',
      items: [
        { id: 'team-ai-insights', label: 'Team AI Insights', icon: <IconLightbulb /> },
        { id: 'pi-quarter', label: 'PI AI Insights', icon: <IconTarget /> },
      ],
    },
    {
      title: 'Dashboards',
      items: [
        { id: 'team-dashboard', label: 'Team Dashboard', icon: <IconChartBar /> },
        { id: 'pi-dashboard', label: 'PI Dashboard', icon: <IconTrendingUp /> },
      ],
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
            ],
          },
        ]
      : []),
  ];

  // Track which accordion groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Insights: true,
    Dashboards: true,
    Management: true,
    Administration: true,
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Map sidebar items to browser tab titles (no spaces around '-')
  const titles: Record<string, string> = {
    'team-ai-insights': 'SparksAI-Team AI Insights',
    'team-dashboard': 'SparksAI-Team Dashboard',
    'pi-quarter': 'SparksAI-PI AI Insights',
    'pi-dashboard': 'SparksAI-PI Dashboard',
    'settings': 'SparksAI-System Settings',
    'general-data': 'SparksAI-General Data',
    'create-agent-job': 'SparksAI-Create Agent Job',
    'upload-transcripts': 'SparksAI-Upload Transcripts',
    'users-admin': 'SparksAI-Users',
  };

  useEffect(() => {
    const fallbackTitle = 'SparksAI';
    document.title = titles[activeNavItem] ?? fallbackTitle;
  }, [activeNavItem]);

  // Load roles only once when admin status is confirmed
  useEffect(() => {
    if (!isAdmin || allRoles.length > 0) return;
    (async () => {
      try {
        const roles = await listRoles();
        setAllRoles(roles);
      } catch (e) {
        console.error('Failed loading roles', e);
      }
    })();
  }, [isAdmin]);

  // Load users and allowlist when entering users-admin section
  useEffect(() => {
    if (activeNavItem !== 'users-admin' || !isAdmin) return;
    (async () => {
      try {
        const [ulist, alist] = await Promise.all([listUsers(), getAllowlist()]);
        // fetch roles for each user (parallel)
        const rolesList = await Promise.all(ulist.map((u: UserDto) => getUserRoles(u.id).catch(() => [] as RoleDto[])));
        const merged = ulist.map((u: UserDto, idx: number) => ({ ...u, roles: rolesList[idx] }));
        setUsersList(merged);
        setAllowlist(alist);

        // Load pending role assignments for all invited users (email-type allowlist entries)
        const emailEntries = alist.filter((e: any) => e.type === 'email');
        const pendingRolesMap: Record<string, RoleDto[]> = {};
        
        await Promise.all(
          emailEntries.map(async (e: any) => {
            const emailLower = e.pattern.toLowerCase();
            // Check if user is already registered
            const isRegistered = merged.some((u: any) => u.email?.toLowerCase() === emailLower);
            if (!isRegistered) {
              try {
                const roles = await getPendingRoles(e.pattern);
                pendingRolesMap[emailLower] = roles;
              } catch (err) {
                console.error(`Failed to load pending roles for ${e.pattern}:`, err);
                pendingRolesMap[emailLower] = [];
              }
            }
          })
        );

        setPendingRoleAssignments(pendingRolesMap);
      } catch (e) {
        console.error('Failed loading admin data', e);
      }
    })();
  }, [activeNavItem, isAdmin]);

  const handleCreateJob = async (jobType: 'Sprint Goal' | 'Daily Agent' | 'PI Sync' | 'Team PI Insight') => {
    const loadingKey = jobType === 'Sprint Goal' ? 'sprintGoal' : 
                     jobType === 'Daily Agent' ? 'dailyAgent' : 
                     jobType === 'PI Sync' ? 'piSync' : 'teamPiInsight';
    
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setMessage(null);

    try {
      if (jobType === 'PI Sync') {
        if (!selectedPI) {
          throw new Error('Please select a PI');
        }
        await apiService.createPiAgentJob(jobType, selectedPI);
      } else if (jobType === 'Team PI Insight') {
        if (!selectedTeam) {
          throw new Error('Please select a team');
        }
        if (!selectedPI) {
          throw new Error('Please select a PI');
        }
        await apiService.createPiJobForTeam(jobType, selectedPI, selectedTeam);
      } else {
        if (!selectedTeam) {
          throw new Error('Please select a team');
        }
        await apiService.createTeamAgentJob(jobType, selectedTeam);
      }

      setMessage({ type: 'success', text: `${jobType} job created successfully!` });
    } catch (error) {
      console.error(`Error creating ${jobType} job:`, error);
      setMessage({ 
        type: 'error', 
        text: `Failed to create ${jobType} job: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Fetch prompts when on team-dashboard or pi-dashboard
  useEffect(() => {
    const fetchPrompts = async () => {
      if (activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') {
        try {
          setLoadingPrompts(true);
          // Determine prompt type based on active dashboard
          const promptType = activeNavItem === 'team-dashboard' ? 'Team Dashboard' : 'PI Dashboard';
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
      case 'team-ai-insights':
        // Wait for settings to load before rendering to avoid fetching with wrong team
        // Use ref for immediate check (synchronous) to prevent any rendering with stale state
        if (!teamInsightsReadyRef.current || !teamInsightsReady || teamInsightSettings.isLoading) {
          console.log('[App] Team insights not ready yet, showing loading...', {
            refReady: teamInsightsReadyRef.current,
            stateReady: teamInsightsReady,
            isLoading: teamInsightSettings.isLoading
          });
          return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center px-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading team insights...</p>
              </div>
            </div>
          );
        }
        
        // Check if no team is selected (after settings are loaded)
        const noTeamSelected = !selectedTeam || 
          selectedTeam.trim() === '' || 
          selectedTeam === 'Select team or group' ||
          selectedTeam.trim() === 'Select team or group';
        
        if (noTeamSelected) {
          return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center px-4">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a Team or Group</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Please select a team or group from the dropdown above to view AI insights and metrics.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <>
            <div className="pt-2 pb-2 pr-2 pl-[7px]" style={{ zoom: 0.90 }}>
              <AICards 
                teamName={selectedTeam} 
                categories={selectedCategories.length > 0 ? selectedCategories : undefined}
              />
            </div>
            {/* Team Metrics on mobile - inline after content */}
            <div className="md:hidden mt-4 border-t border-gray-200 bg-white" style={{ zoom: 0.90 }}>
              <div className="px-3 py-2">
                <TeamMetrics teamName={selectedTeam} isGroup={selectedTreeType === 'group'} />
              </div>
            </div>
          </>
        );
      case 'team-dashboard':
        return (
          <div className="h-full flex flex-col">
            {/* Dashboard Content */}
            <div className="flex-1 overflow-auto">
              <TeamDashboard 
                selectedTeam={selectedTeam} 
                selectedTreeType={selectedTreeType}
                selectedTreeValue={selectedTreeValue}
              />
            </div>
          </div>
        );
      case 'pi-quarter':
        // Wait for settings to load before rendering to avoid fetching with wrong PI
        // Use ref for immediate check (synchronous) to prevent any rendering with stale state
        if (!piInsightsReadyRef.current || !piInsightsReady || piInsightSettings.isLoading) {
          console.log('[App] PI insights not ready yet, showing loading...', {
            refReady: piInsightsReadyRef.current,
            stateReady: piInsightsReady,
            isLoading: piInsightSettings.isLoading
          });
          return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center px-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PI insights...</p>
              </div>
            </div>
          );
        }
        
        // Check if no PI is selected (after settings are loaded)
        const noPISelected = !selectedPI || 
          selectedPI.trim() === '' || 
          selectedPI === 'Select PI';
        
        if (noPISelected) {
          return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center px-4">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Select a PI</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Please select a PI from the dropdown above to view AI insights.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="h-full overflow-auto">
            <div className="p-2" style={{ zoom: 0.90 }}>
              {/* PI AI Cards Section */}
              <div className="mb-4">
                <PIAICards piName={selectedPI} />
              </div>
            </div>
          </div>
        );
      case 'pi-dashboard':
        return (
          <PIDashboardView 
            selectedPI={selectedPI} 
            selectedTeam={selectedTeam}
            selectedTreeType={selectedTreeType}
            selectedTreeValue={selectedTreeValue}
          />
        );
      case 'settings':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <SettingsScreen />
            </div>
          </div>
        );
      case 'create-agent-job':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 relative">
              
              {/* Sprint Goal Row */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">Sprint Goal</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                    <TeamFilter
                      selectedTeam={selectedTeam}
                      onTeamChange={setSelectedTeam}
                    />
                    <button
                      onClick={() => handleCreateJob('Sprint Goal')}
                      disabled={loading.sprintGoal || !selectedTeam}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.sprintGoal ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Daily Agent Row */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">Daily Agent</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                    <TeamFilter
                      selectedTeam={selectedTeam}
                      onTeamChange={setSelectedTeam}
                    />
                    <button
                      onClick={() => handleCreateJob('Daily Agent')}
                      disabled={loading.dailyAgent || !selectedTeam}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.dailyAgent ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>

              {/* PI Sync Row */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">PI Sync</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 flex-1">
                    <PIFilter
                      selectedPI={selectedPI}
                      onPIChange={setSelectedPI}
                    />
                    <button
                      onClick={() => handleCreateJob('PI Sync')}
                      disabled={loading.piSync || !selectedPI}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.piSync ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Team PI Insight Row */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">Team PI Insight</h3>
                  <div className="flex items-center space-x-4 flex-1">
                    <TeamFilter
                      selectedTeam={selectedTeam}
                      onTeamChange={setSelectedTeam}
                    />
                    <PIFilter
                      selectedPI={selectedPI}
                      onPIChange={setSelectedPI}
                    />
                    <button
                      onClick={() => handleCreateJob('Team PI Insight')}
                      disabled={loading.teamPiInsight || !selectedTeam || !selectedPI}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.teamPiInsight ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Success/Error Message - Fixed at bottom */}
              {message && (
                <div className={`p-4 rounded-lg mt-6 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
            </div>
          </div>
        );
      case 'general-data':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <GeneralDataView />
            </div>
          </div>
        );
      case 'upload-transcripts':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto">
              <UploadTranscripts selectedTeam={selectedTeam} selectedPI={selectedPI} onTeamChange={setSelectedTeam} onPIChange={setSelectedPI} />
            </div>
          </div>
        );
      case 'users-admin':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-3">Allowlist Management</h2>
              <div className="space-y-2 mb-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={allowPattern}
                    onChange={(e) => setAllowPattern(e.target.value)}
                    placeholder="Enter pattern (email, @domain.com, *.example.com)"
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={async () => { 
                      if (!allowPattern) return; 
                      try { 
                        await addAllowlist(allowPattern); 
                        setAllowPattern(''); 
                        setMakeAdminOnRegister(false);
                        const al = await getAllowlist(); 
                        setAllowlist(al);
                        // TODO: If makeAdminOnRegister is true and pattern is email, 
                        // store this intent and assign ADMIN role when user registers
                      } catch(e:any){ 
                        alert(e?.message || 'Failed to add'); 
                      } 
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                  >Add</button>
                </div>
                {allowPattern.includes('@') && !allowPattern.startsWith('@') && !allowPattern.includes('*') && (
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={makeAdminOnRegister}
                      onChange={(e) => setMakeAdminOnRegister(e.target.checked)}
                      className="rounded"
                    />
                    <span>Assign ADMIN role when user registers</span>
                  </label>
                )}
              </div>
              <div className="border rounded overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Pattern</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Created</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowlist.filter((e:any) => e.type !== 'email').map((e:any) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-2">{e.pattern}</td>
                        <td className="p-2 uppercase text-xs">{e.type}</td>
                        <td className="p-2 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <button 
                            onClick={() => setDeleteAllowlistConfirm({show: true, allowlistId: e.id, pattern: e.pattern})} 
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-3">Users</h2>
              <div className="border rounded overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Roles</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Show registered users */}
                    {usersList.map((u:any) => {
                      const roles = (u.roles || []) as RoleDto[];
                      const isAdminRole = roles.some(r => r.roleName === 'ADMIN');
                      return (
                        <tr key={u.id} className="border-t">
                          <td className="p-2">{u.name}</td>
                          <td className="p-2">{u.email}</td>
                          <td className="p-2">
                            {editingRolesFor === u.id ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {roles.map(r => (
                                    <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                      {r.roleName}
                                      <button
                                        onClick={async () => {
                                          try {
                                            await unassignRoleFromUser(u.id, r.id);
                                            const updatedRoles = await getUserRoles(u.id);
                                            setUsersList(usersList.map(usr => 
                                              usr.id === u.id ? { ...usr, roles: updatedRoles } : usr
                                            ));
                                          } catch (e: any) {
                                            alert(e?.message || 'Failed to remove role');
                                          }
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                        title="Remove role"
                                      >×</button>
                                    </span>
                                  ))}
                                </div>
                                <select
                                  className="text-xs border rounded p-1"
                                  value=""
                                  onChange={async (e) => {
                                    const roleId = e.target.value;
                                    if (!roleId) return;
                                    try {
                                      await assignRoleToUser(u.id, roleId);
                                      const updatedRoles = await getUserRoles(u.id);
                                      setUsersList(usersList.map(usr => 
                                        usr.id === u.id ? { ...usr, roles: updatedRoles } : usr
                                      ));
                                      e.target.value = '';
                                    } catch (error: any) {
                                      alert(error?.message || 'Failed to assign role');
                                    }
                                  }}
                                >
                                  <option value="">Add role...</option>
                                  {allRoles.filter(r => !roles.some(ur => ur.id === r.id)).map(r => (
                                    <option key={r.id} value={r.id}>{r.roleName}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setEditingRolesFor(null)}
                                  className="ml-2 text-xs text-gray-600 hover:text-gray-800"
                                >Done</button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">{roles.map(r => r.roleName).join(', ') || '-'}</span>
                                <button
                                  onClick={() => setEditingRolesFor(u.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  title="Edit roles"
                                >✏️</button>
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => setDeleteConfirm({show: true, userId: u.id, userName: u.name || u.email})}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Show email-type allowlist entries (invited but not yet registered) */}
                    {allowlist.filter((e:any) => e.type === 'email').map((e:any) => {
                      // Check if this email is already in usersList
                      const isRegistered = usersList.some((u:any) => u.email?.toLowerCase() === e.pattern.toLowerCase());
                      if (isRegistered) return null; // Don't show duplicates
                      const emailLower = e.pattern.toLowerCase();
                      const pendingKey = `email:${emailLower}`;
                      const roles = pendingRoleAssignments[emailLower] || [];
                      return (
                        <tr key={`allowlist-${e.id}`} className="border-t bg-gray-50">
                          <td className="p-2 italic text-gray-500">Invited (not registered)</td>
                          <td className="p-2">{e.pattern}</td>
                          <td className="p-2">
                            {editingRolesFor === pendingKey ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {roles.map(r => (
                                    <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                      {r.roleName}
                                      <button
                                        onClick={async () => {
                                          try {
                                            await unassignPendingRole(e.pattern, r.id);
                                            const updated = { ...pendingRoleAssignments };
                                            if (!updated[emailLower]) updated[emailLower] = [];
                                            updated[emailLower] = updated[emailLower].filter(role => role.id !== r.id);
                                            if (updated[emailLower].length === 0) {
                                              delete updated[emailLower];
                                            }
                                            setPendingRoleAssignments(updated);
                                          } catch (err: any) {
                                            alert(err?.message || 'Failed to remove role');
                                          }
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                        title="Remove role"
                                      >×</button>
                                    </span>
                                  ))}
                                </div>
                                <select
                                  className="text-xs border rounded p-1"
                                  value=""
                                  onChange={async (evt) => {
                                    const roleId = evt.target.value;
                                    if (!roleId) return;
                                    const role = allRoles.find(r => r.id === roleId);
                                    if (!role) return;
                                    try {
                                      await assignPendingRole(e.pattern, roleId);
                                      const updated = { ...pendingRoleAssignments };
                                      if (!updated[emailLower]) updated[emailLower] = [];
                                      if (!updated[emailLower].some(r => r.id === role.id)) {
                                        updated[emailLower] = [...updated[emailLower], role];
                                        setPendingRoleAssignments(updated);
                                      }
                                      evt.target.value = '';
                                    } catch (err: any) {
                                      alert(err?.message || 'Failed to assign role');
                                    }
                                  }}
                                >
                                  <option value="">Add role...</option>
                                  {allRoles.filter(r => !roles.some(ur => ur.id === r.id)).map(r => (
                                    <option key={r.id} value={r.id}>{r.roleName}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setEditingRolesFor(null)}
                                  className="ml-2 text-xs text-gray-600 hover:text-gray-800"
                                >Done</button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs">{roles.map(r => r.roleName).join(', ') || '-'}</span>
                                <button
                                  onClick={() => setEditingRolesFor(pendingKey)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  title="Edit roles"
                                >✏️</button>
                              </div>
                            )}
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delete User Confirmation Modal */}
            {deleteConfirm.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Confirm Delete User</h3>
                  <p className="mb-4">
                    Are you sure you want to delete user <strong>{deleteConfirm.userName}</strong>? 
                    This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteConfirm({show: false})}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!deleteConfirm.userId) return;
                        try {
                          await deleteUser(deleteConfirm.userId);
                          setUsersList(usersList.filter(u => u.id !== deleteConfirm.userId));
                          setDeleteConfirm({show: false});
                        } catch (error: any) {
                          alert(error?.message || 'Failed to delete user');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Allowlist Confirmation Modal */}
            {deleteAllowlistConfirm.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Confirm Delete Pattern</h3>
                  <p className="mb-4">
                    Are you sure you want to delete pattern <strong>{deleteAllowlistConfirm.pattern}</strong>? 
                    This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteAllowlistConfirm({show: false})}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!deleteAllowlistConfirm.allowlistId) return;
                        try {
                          await deleteAllowlist(deleteAllowlistConfirm.allowlistId);
                          const al = await getAllowlist();
                          setAllowlist(al);
                          setDeleteAllowlistConfirm({show: false});
                        } catch (error: any) {
                          alert(error?.message || 'Failed to delete pattern');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🚧</div>
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-sm text-gray-600">
              {navigationItems.find(item => item.id === activeNavItem)?.label} is under development.
            </p>
          </div>
        );
    }
  };

  return authChecked ? (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-56 bg-white shadow-xl border-r border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-3 pt-3 pb-[10px] bg-white">
              <div className="w-32 flex justify-center">
                <SparksAILogo collapsed={false} size="small" />
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-800"
                aria-label="Close sidebar"
              >✕</button>
            </div>
            {/* Mobile Nav (uses same groups) */}
            <nav className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 rounded-tl-2xl px-3 pt-3 pb-3 border-t border-gray-200">
              <div className="space-y-3">
                {navigationGroups.map((group) => (
                  <div key={group.title}>
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <span>{group.title}</span>
                      <svg 
                        className={`w-3 h-3 transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedGroups[group.title] && (
                      <div className="mt-1 space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveNavItem(item.id as NavItemId); setMobileSidebarOpen(false); }}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                              activeNavItem === item.id
                                  ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 text-indigo-700 shadow-md border border-indigo-200/60'
                                  : 'text-gray-700 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:shadow-sm'
                            }`}
                            title={item.label}
                          >
                              <span className={`flex-shrink-0 flex items-center justify-center ${activeNavItem === item.id ? 'text-indigo-700' : 'text-gray-600'}`}>{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mx-2 my-2 border-t border-gray-100"></div>
                  </div>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Left Sidebar Navigation (desktop) */}
      <div className={`hidden md:block bg-white shadow-sm border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}>
        <div className="h-full flex flex-col">
          {!sidebarCollapsed && (
            <div className="px-3 pt-3 pb-[10px] bg-white">
              <SparksAILogo collapsed={sidebarCollapsed} size="medium" />
            </div>
          )}
          
          <nav className={`flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 px-3 ${
            sidebarCollapsed ? 'rounded-none border-t-0 pt-3 pb-0' : 'rounded-tl-2xl border-t border-gray-200 pt-3 pb-3'
          }`}>
            {sidebarCollapsed ? (
              <div className="space-y-1">
                {navigationGroups.flatMap((g) => g.items).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavItem(item.id as NavItemId)}
                    className={`w-full flex items-center justify-center px-2 py-2.5 rounded-lg transition-all duration-200 ${
                      activeNavItem === item.id
                        ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 text-indigo-700 shadow-md border border-indigo-200/60'
                        : 'text-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:shadow-sm'
                    }`}
                    title={item.label}
                  >
                    <span className="flex items-center justify-center">{item.icon}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {navigationGroups.map((group) => (
                  <div key={group.title}>
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <span>{group.title}</span>
                      <svg 
                        className={`w-3 h-3 transition-transform duration-200 ${expandedGroups[group.title] ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                      {expandedGroups[group.title] && (
                        <div className="mt-1 space-y-1">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setActiveNavItem(item.id as NavItemId)}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                                activeNavItem === item.id
                                  ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 text-indigo-700 shadow-md border border-indigo-200/60'
                                  : 'text-gray-700 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:shadow-sm'
                              }`}
                              title={item.label}
                            >
                              <span className={`flex-shrink-0 flex items-center justify-center ${activeNavItem === item.id ? 'text-indigo-700' : 'text-gray-600'}`}>{item.icon}</span>
                              <span className="text-xs font-medium">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    <div className="mx-2 my-2 border-t border-gray-100"></div>
                  </div>
                ))}
              </div>
            )}
          </nav>

          <div className={`mt-auto ${
            sidebarCollapsed ? 'bg-gradient-to-b from-white to-gray-50 border-t-0' : 'bg-gradient-to-b from-white to-gray-50 border-t border-gray-200'
          }`}>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full text-gray-600 hover:text-gray-800 py-3 px-3 hover:bg-gray-100 flex items-center justify-center transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                  sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"
                } />
              </svg>
              {!sidebarCollapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 flex-shrink-0 relative z-30 rounded-tl-2xl md:rounded-tl-2xl overflow-visible md:overflow-hidden">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-0 md:gap-2 h-[62px] md:h-auto md:min-h-[62px] pl-3 md:pl-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded hover:bg-gray-100 text-gray-600"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dashboard views: Unified top bar */}
            {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') ? (
              <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4 flex-1 min-w-0 pr-3 md:px-4 md:py-2 w-full">
                {/* Mobile: Title and Actions Row */}
                <div className="flex md:hidden items-center justify-between w-full gap-0 h-full">
                  {/* View title */}
                  <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate">
                    {navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI'}
                  </h1>
                  
                  {/* Mobile Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Manage Reports Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Manage Reports button clicked (mobile)');
                        window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
                      }}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 text-gray-500 active:text-green-600 active:border-green-400 active:bg-green-50 transition-all touch-manipulation"
                      title="Manage dashboard reports"
                      aria-label="Manage reports"
                      type="button"
                    >
                      <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    
                    {/* AI Chat Button */}
                    <DashboardAIMenu
                      onOpenAIChat={() => setIsDashboardChatModalOpen(true)}
                      prompts={prompts}
                      selectedPrompt={selectedPrompt}
                      onPromptChange={setSelectedPrompt}
                      loadingPrompts={loadingPrompts}
                    />
                    
                    {/* Mobile Logout Button */}
                    <button
                      onClick={() => { logout(); try { location.assign('/login'); } catch {} }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 text-gray-700"
                      title="Logout"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* Desktop: Full Layout */}
                <div className="hidden md:flex md:items-center md:gap-4 w-full">
                {/* View title */}
                <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                  {navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI'}
                </h1>

                {/* PI Filter - for PI Dashboard */}
                {activeNavItem === 'pi-dashboard' && (
                    <div style={{ minWidth: '180px', maxWidth: '250px' }}>
                    <PIFilter 
                      selectedPI={selectedPI}
                      onPIChange={(pi) => {
                        setSelectedPI(pi);
                        setPiDashboardFilters(prev => ({ ...prev, selectedPI: pi }));
                      }}
                    />
                  </div>
                )}
                
                {/* Team/Group Filter */}
                  <div style={{ minWidth: '180px', maxWidth: '250px' }}>
                  <TreeSelect 
                    selectedValue={selectedTreeValue}
                    onSelect={(value, label, type) => {
                      // Update legacy state
                      setSelectedTreeValue(value);
                      setSelectedTreeLabel(value ? label : '');
                      setSelectedTreeType(type);
                      // If value is null (All Teams selected), set to empty string instead of placeholder text
                      setSelectedTeam(value ? label : '');
                      
                      // Update dashboard-specific state
                      if (activeNavItem === 'team-dashboard') {
                        setTeamDashboardFilters(prev => ({
                          ...prev,
                          selectedTeam: value ? label : '',
                          selectedTreeValue: value,
                          selectedTreeLabel: value ? label : '',
                          selectedTreeType: type,
                        }));
                      } else if (activeNavItem === 'pi-dashboard') {
                        setPiDashboardFilters(prev => ({
                          ...prev,
                          selectedTeam: value ? label : '',
                          selectedTreeValue: value,
                          selectedTreeLabel: value ? label : '',
                          selectedTreeType: type,
                        }));
                      }
                    }}
                    placeholder="Select team or group"
                  />
                </div>

                  {/* Spacer to push actions to the right on desktop */}
                  <div className="flex-1 min-w-0"></div>

                  {/* Desktop Actions: Dashboard buttons, AI Chat, User, Logout */}
                  <div className="flex items-center gap-2">
                  {/* Manage Reports Button */}
                  <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Manage Reports button clicked (desktop)');
                      window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
                    }}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 text-gray-500 hover:text-green-600 hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    title="Manage dashboard reports"
                    aria-label="Manage reports"
                      type="button"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  
                  {/* Save Settings Button - for dashboards */}
                  <button
                    onClick={handleSaveDashboardSettings}
                    disabled={!dashboardSettingsState.hasChanges || dashboardSettingsState.isSaving}
                    className={`hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-all ${
                      dashboardSettingsState.hasChanges && !dashboardSettingsState.isSaving
                        ? 'border-blue-500 text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer' 
                        : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                    title={dashboardSettingsState.isSaving ? 'Saving...' : dashboardSettingsState.hasChanges ? 'Save dashboard layout and filters' : 'No changes to save'}
                    aria-label="Save dashboard settings"
                  >
                    {dashboardSettingsState.isSaving ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Reset to Defaults Button - for dashboards only */}
                  {(['team-dashboard', 'pi-dashboard'].includes(activeNavItem)) && (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={dashboardSettingsState.isSaving}
                    className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Reset dashboard to defaults"
                    aria-label="Reset to defaults"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  )}
                  
                  {/* Divider */}
                  {(['team-dashboard', 'pi-dashboard'].includes(activeNavItem)) && (
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                  )}
                  
                  {/* AI Chat Button */}
                  <DashboardAIMenu
                    onOpenAIChat={() => setIsDashboardChatModalOpen(true)}
                    prompts={prompts}
                    selectedPrompt={selectedPrompt}
                    onPromptChange={setSelectedPrompt}
                    loadingPrompts={loadingPrompts}
                  />
                  <div className="flex items-center space-x-3 text-sm text-gray-700">
                    {(() => {
                      const u = getCurrentUser();
                      if (!u) return <span>Signed in</span>;
                      const fullName = (u.name || '').trim();
                      const firstName = fullName ? fullName.split(/\s+/)[0] : (u.email ? String(u.email).split('@')[0] : 'Signed in');
                      const desktopLabel = u.name && u.email ? `${u.name} (${u.email})` : (u.name || u.email || 'Signed in');
                      return (
                        <>
                          {/* Mobile: first name only, no email */}
                          <span className="md:hidden truncate max-w-[120px]" title={fullName || ''}>{firstName}</span>
                          {/* Desktop: name (email) */}
                          <span className="hidden md:inline" title={u.email || ''}>{desktopLabel}</span>
                        </>
                      );
                    })()}
                    <button
                      onClick={() => { logout(); try { location.assign('/login'); } catch {} }}
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                      title="Logout"
                    >Logout</button>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4 flex-1 min-w-0 pr-3 md:px-4 md:py-2 w-full">
                {/* Mobile: Title and Logout Row */}
                <div className="flex md:hidden items-center justify-between w-full gap-0 h-full">
                {/* View title */}
                  <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate">
                    {navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI'}
                  </h1>
                  
                  {/* Mobile Logout Button */}
                  <button
                    onClick={() => { logout(); try { location.assign('/login'); } catch {} }}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 text-gray-700"
                    title="Logout"
                  >
                    Logout
                  </button>
                </div>
                
                {/* Desktop: View title */}
                <h1 className="hidden md:block text-xl font-semibold text-gray-900 whitespace-nowrap">
                  {navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI'}
                </h1>

                {/* PI Filter - shown first for PI Quarter and Upload Transcripts views */}
                {(activeNavItem === 'pi-quarter' || activeNavItem === 'upload-transcripts') && (
                  <div className="hidden md:block" style={{ minWidth: '200px', maxWidth: '300px' }}>
                    <PIFilter 
                      selectedPI={selectedPI}
                      onPIChange={setSelectedPI}
                    />
                  </div>
                )}
                
                {/* Team/Group Filter - for views that need it */}
                {(activeNavItem === 'team-ai-insights' || activeNavItem === 'upload-transcripts') && (
                  <div className="hidden md:block" style={{ minWidth: '200px', maxWidth: '300px' }}>
                    <TreeSelect 
                      selectedValue={selectedTreeValue}
                      onSelect={(value, label, type) => {
                        setSelectedTreeValue(value);
                        setSelectedTreeLabel(value ? label : '');
                        setSelectedTreeType(type);
                        // If value is null (All Teams selected), set to empty string instead of placeholder text
                        setSelectedTeam(value ? label : '');
                      }}
                      placeholder="Select team or group"
                    />
                  </div>
                )}
                
                {/* Insight Category Filter - for team-ai-insights view only */}
                {activeNavItem === 'team-ai-insights' && (
                  <div className="hidden md:block">
                    <InsightCategoryFilter
                      selectedCategories={selectedCategories}
                      onCategoriesChange={setSelectedCategories}
                      settingsLoading={teamInsightSettings.isLoading}
                      hasSavedSettings={!!teamInsightSettings.savedState}
                    />
                  </div>
                )}

                {/* Spacer to push actions to the right */}
                <div className="flex-1"></div>

                {/* Right side: save button (for insights), user info, logout */}
                <div className="hidden md:flex items-center gap-2">
                  {/* Save Settings Button - for insights */}
                  {(['team-ai-insights', 'pi-quarter'].includes(activeNavItem)) && (
                    <button
                      onClick={handleSaveInsightSettings}
                      disabled={!insightSettingsState.hasChanges || insightSettingsState.isSaving}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-all ${
                        insightSettingsState.hasChanges && !insightSettingsState.isSaving
                          ? 'border-blue-500 text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer' 
                          : 'border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      title={insightSettingsState.isSaving ? 'Saving...' : insightSettingsState.hasChanges ? 'Save insight filters' : 'No changes to save'}
                      aria-label="Save insight settings"
                    >
                      {insightSettingsState.isSaving ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      )}
                    </button>
                  )}
                  
                  <div className="flex items-center space-x-3 text-sm text-gray-700">
                    {(() => {
                      const u = getCurrentUser();
                      if (!u) return <span>Signed in</span>;
                      const fullName = (u.name || '').trim();
                      const firstName = fullName ? fullName.split(/\s+/)[0] : (u.email ? String(u.email).split('@')[0] : 'Signed in');
                      const desktopLabel = u.name && u.email ? `${u.name} (${u.email})` : (u.name || u.email || 'Signed in');
                      return (
                        <>
                          {/* Mobile: first name only, no email */}
                          <span className="md:hidden truncate max-w-[120px]" title={fullName || ''}>{firstName}</span>
                          {/* Desktop: name (email) */}
                          <span className="hidden md:inline" title={u.email || ''}>{desktopLabel}</span>
                        </>
                      );
                    })()}
                    <button
                      onClick={() => { logout(); try { location.assign('/login'); } catch {} }}
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                      title="Logout"
                    >Logout</button>
                  </div>
                </div>
              </div>
            )}
        </div>
        {/* Mobile controls panel (everything except title) */}
          <div className="md:hidden border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 pl-3 pr-3 pt-2 pb-2 space-y-2 -mt-[1px] overflow-visible">
          {/* Filters */}
          <div className="flex flex-col gap-2">
            {/* PI Filter - shown first for PI views */}
            {(activeNavItem === 'pi-quarter' || activeNavItem === 'pi-dashboard' || activeNavItem === 'upload-transcripts') && (
              <PIFilter 
                selectedPI={selectedPI}
                onPIChange={setSelectedPI}
              />
            )}
            {/* Team/Group Filter */}
            {(activeNavItem === 'team-ai-insights' || activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'upload-transcripts') && (
              <TreeSelect 
                selectedValue={selectedTreeValue}
                onSelect={(value, label, type) => {
                  setSelectedTreeValue(value);
                  setSelectedTreeLabel(value ? label : '');
                  setSelectedTreeType(type);
                  // If value is null (All Teams selected), set to empty string instead of placeholder text
                  setSelectedTeam(value ? label : '');
                }}
                placeholder="Select team or group"
              />
            )}
            {/* Insight Category Filter */}
            {activeNavItem === 'team-ai-insights' && (
              <InsightCategoryFilter
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                settingsLoading={teamInsightSettings.isLoading}
                hasSavedSettings={!!teamInsightSettings.savedState}
              />
            )}
          </div>

          {/* Dashboard controls - removed duplicate AI menu on mobile */}

          {/* Search removed on mobile */}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-2 overflow-auto">
          {renderMainContent()}
        </div>

        {/* Team Metrics Bottom Bar - only for team-ai-insights on desktop */}
        {activeNavItem === 'team-ai-insights' && (
          <div className="hidden md:flex flex-shrink-0 border-t border-gray-200 bg-white relative z-30" style={{ zoom: 0.90 }}>
            <div className="px-3 md:px-4 py-2 md:py-2.5 w-full">
              <TeamMetrics teamName={selectedTeam} isGroup={selectedTreeType === 'group'} />
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Insights AI Chat Modal */}
      {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') && (
        <AIChatModal
          isOpen={isDashboardChatModalOpen}
          onClose={() => setIsDashboardChatModalOpen(false)}
          chatType={
            activeNavItem === 'team-dashboard' 
              ? 'Team_dashboard' 
              : activeNavItem === 'pi-dashboard' 
                ? 'PI_dashboard' 
                : ''
          }
          teamName={activeNavItem === 'team-dashboard' ? selectedTeam : undefined}
          piName={activeNavItem === 'pi-dashboard' ? selectedPI : undefined}
          promptName={selectedPrompt && selectedPrompt.trim() !== '' && selectedPrompt !== '[use default]' ? selectedPrompt : undefined}
        />
      )}
      
      {/* Reset Dashboard Settings Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Dashboard to Defaults?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will remove all your saved layout, filter preferences, and pinned filters for this dashboard. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading...
    </div>
  );
}