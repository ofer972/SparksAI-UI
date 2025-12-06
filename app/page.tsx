'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, refreshAccessToken, clearTokens, getCurrentUser, logout } from '@/lib/auth';
import SparksAILogo from '@/components/SparksAILogo';
import TeamMetrics from '@/components/TeamMetrics';
import PIDashboardView from '@/components/PIDashboardView';
import GeneralDataView from '@/components/GeneralDataView';
import AIChatModal from '@/components/AIChatModal';
import { ApiService, verifyAdmin } from '@/lib/api';
import TopBar from '@/components/TopBar';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { usePageSettings } from '@/hooks/usePageSettings';
import TeamAIInsightsView from '@/components/views/TeamAIInsightsView';
import TeamDashboardView from '@/components/views/TeamDashboardView';
import PIAIInsightsView from '@/components/views/PIAIInsightsView';
import SystemSettingsView from '@/components/views/SystemSettingsView';
import CreateAgentJobView from '@/components/views/CreateAgentJobView';
import UploadTranscriptsView from '@/components/views/UploadTranscriptsView';
import UsersAdminView from '@/components/views/UsersAdminView';
import UnsavedChangesModal from '@/components/UnsavedChangesModal';

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
  
  // Function to check if current view has unsaved changes
  const hasUnsavedChanges = () => {
    if (activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') {
      return dashboardSettingsState.hasChanges;
    }
    if (activeNavItem === 'team-ai-insights' || activeNavItem === 'pi-quarter') {
      return insightSettingsState.hasChanges;
    }
    return false;
  };
  
  // Function to handle navigation with unsaved changes check
  const handleNavigation = (navItem: NavItemId) => {
    if (navItem === activeNavItem) {
      return; // Already on this view
    }
    
    if (hasUnsavedChanges()) {
      // Show confirmation modal
      setPendingNavItem(navItem);
      setShowUnsavedChangesModal(true);
    } else {
      // Navigate directly
      setActiveNavItem(navItem);
      setMobileSidebarOpen(false);
    }
  };
  
  // Handle save and navigate
  const handleSaveAndNavigate = async () => {
    try {
      // Trigger save based on current view
      if (activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') {
        window.dispatchEvent(new CustomEvent('save-dashboard-settings'));
        // Wait a bit for save to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (activeNavItem === 'team-ai-insights') {
        await teamInsightSettings.saveSettings();
      } else if (activeNavItem === 'pi-quarter') {
        await piInsightSettings.saveSettings();
      }
      
      // Navigate to pending item
      if (pendingNavItem) {
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDashboardChatModalOpen, setIsDashboardChatModalOpen] = useState(false);
  const [collectedDashboardData, setCollectedDashboardData] = useState<any>(null);
  
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
  
  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('[AI Modal State]', { isDashboardChatModalOpen, activeNavItem });
  }, [isDashboardChatModalOpen, activeNavItem]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
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
        return (
          <TeamAIInsightsView
            selectedTeam={selectedTeam}
            selectedTreeType={selectedTreeType}
            selectedCategories={selectedCategories}
            isLoading={teamInsightSettings.isLoading}
            isReady={teamInsightsReadyRef.current && teamInsightsReady}
          />
        );
      case 'team-dashboard':
        return (
          <TeamDashboardView
            selectedTeam={selectedTeam}
            selectedTreeType={selectedTreeType}
            selectedTreeValue={selectedTreeValue}
          />
        );
      case 'pi-quarter':
        return (
          <PIAIInsightsView
            selectedPI={selectedPI}
            isLoading={piInsightSettings.isLoading}
            isReady={piInsightsReadyRef.current && piInsightsReady}
          />
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
            selectedTeam={selectedTeam}
            selectedPI={selectedPI}
            onTeamChange={setSelectedTeam}
            onPIChange={setSelectedPI}
          />
        );
      case 'users-admin':
        return <UsersAdminView />;
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
    <div className="h-screen bg-white flex flex-col overflow-hidden">
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
                            onClick={() => handleNavigation(item.id as NavItemId)}
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

      {/* Top Row: Logo + TopBar in same container */}
      <div className="hidden md:flex flex-shrink-0 items-center bg-gradient-to-r from-white to-gray-50 py-1">
        {/* Spacer matching sidebar width */}
        <div className={`flex-shrink-0 ml-[5px] transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}>
          {!sidebarCollapsed && (
            <div className="flex justify-center">
              <SparksAILogo collapsed={sidebarCollapsed} size="medium" />
            </div>
          )}
        </div>

        {/* TopBar Content - will render inline due to contents class */}
        <div className="flex-1 px-4">
          <TopBar
            activeNavItem={activeNavItem}
            navigationItems={navigationItems}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
            dashboardSettings={(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') ? {
              hasChanges: dashboardSettingsState.hasChanges,
              isSaving: dashboardSettingsState.isSaving,
              onSave: handleSaveDashboardSettings,
              onReset: () => setShowResetConfirm(true),
            } : undefined}
            insightSettings={(['team-ai-insights', 'pi-quarter'].includes(activeNavItem)) ? {
              hasChanges: insightSettingsState.hasChanges,
              isSaving: insightSettingsState.isSaving,
              onSave: handleSaveInsightSettings,
            } : undefined}
            filters={{
              selectedPI: activeNavItem === 'pi-dashboard' ? piDashboardFilters.selectedPI : selectedPI,
              onPIChange: (pi: string) => {
                if (activeNavItem === 'pi-dashboard') {
                  setSelectedPI(pi);
                  setPiDashboardFilters(prev => ({ ...prev, selectedPI: pi }));
                } else {
                  setSelectedPI(pi);
                }
              },
              selectedTreeValue: activeNavItem === 'team-dashboard' ? teamDashboardFilters.selectedTreeValue : 
                                 activeNavItem === 'pi-dashboard' ? piDashboardFilters.selectedTreeValue : 
                                 selectedTreeValue,
              onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => {
                setSelectedTreeValue(value);
                setSelectedTreeLabel(value ? label : '');
                setSelectedTreeType(type);
                setSelectedTeam(value ? label : '');
                
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
              },
              selectedCategories,
              onCategoriesChange: setSelectedCategories,
              settingsLoading: teamInsightSettings.isLoading,
              hasSavedSettings: !!teamInsightSettings.savedState,
            }}
            aiChat={(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') ? {
              onOpenChat: (dashboardData?: any) => {
                console.log('[AI Menu] Opening chat modal with dashboard data:', dashboardData);
                setCollectedDashboardData(dashboardData || null);
                setIsDashboardChatModalOpen(true);
              },
              prompts,
              selectedPrompt,
              onPromptChange: setSelectedPrompt,
              loadingPrompts,
            } : undefined}
            currentUser={getCurrentUser()}
            onLogout={() => { logout(); try { location.assign('/login'); } catch {} }}
          />
        </div>
      </div>

      {/* Bottom Row: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation (desktop) */}
        <div className={`hidden md:block bg-white shadow-sm ml-[5px] flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-56'
        }`}>
          <div className="h-full flex flex-col">
          
          <nav className={`flex-1 overflow-y-auto px-3 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-tl-2xl ${
            sidebarCollapsed ? 'pt-3 pb-0' : 'pt-3 pb-3'
          }`}>
            {sidebarCollapsed ? (
              <div className="space-y-1">
                {navigationGroups.flatMap((g) => g.items).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id as NavItemId)}
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
                              onClick={() => handleNavigation(item.id as NavItemId)}
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
        <div className="flex-1 flex flex-col min-w-0 border-t border-gray-200">
          {/* Mobile TopBar */}
          <div className="md:hidden">
            <TopBar
              activeNavItem={activeNavItem}
              navigationItems={navigationItems}
              onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
              dashboardSettings={(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') ? {
                hasChanges: dashboardSettingsState.hasChanges,
                isSaving: dashboardSettingsState.isSaving,
                onSave: handleSaveDashboardSettings,
                onReset: () => setShowResetConfirm(true),
              } : undefined}
              insightSettings={(['team-ai-insights', 'pi-quarter'].includes(activeNavItem)) ? {
                hasChanges: insightSettingsState.hasChanges,
                isSaving: insightSettingsState.isSaving,
                onSave: handleSaveInsightSettings,
              } : undefined}
              filters={{
                selectedPI: activeNavItem === 'pi-dashboard' ? piDashboardFilters.selectedPI : selectedPI,
                onPIChange: (pi: string) => {
                  if (activeNavItem === 'pi-dashboard') {
                    setSelectedPI(pi);
                    setPiDashboardFilters(prev => ({ ...prev, selectedPI: pi }));
                  } else {
                    setSelectedPI(pi);
                  }
                },
                selectedTreeValue: activeNavItem === 'team-dashboard' ? teamDashboardFilters.selectedTreeValue : 
                                   activeNavItem === 'pi-dashboard' ? piDashboardFilters.selectedTreeValue : 
                                   selectedTreeValue,
                onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => {
                  setSelectedTreeValue(value);
                  setSelectedTreeLabel(value ? label : '');
                  setSelectedTreeType(type);
                  setSelectedTeam(value ? label : '');
                  
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
                },
                selectedCategories,
                onCategoriesChange: setSelectedCategories,
                settingsLoading: teamInsightSettings.isLoading,
                hasSavedSettings: !!teamInsightSettings.savedState,
              }}
              aiChat={(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') ? {
                onOpenChat: (dashboardData?: any) => {
                  console.log('[AI Menu] Opening chat modal with dashboard data:', dashboardData);
                  setCollectedDashboardData(dashboardData || null);
                  setIsDashboardChatModalOpen(true);
                },
                prompts,
                selectedPrompt,
                onPromptChange: setSelectedPrompt,
                loadingPrompts,
              } : undefined}
              currentUser={getCurrentUser()}
              onLogout={() => { logout(); try { location.assign('/login'); } catch {} }}
            />
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
      </div>

      {/* Dashboard Insights AI Chat Modal */}
      {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') && (
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
                : ''
          }
          teamName={activeNavItem === 'team-dashboard' ? selectedTeam : undefined}
          piName={activeNavItem === 'pi-dashboard' ? selectedPI : undefined}
          promptName={selectedPrompt && selectedPrompt.trim() !== '' && selectedPrompt !== '[use default]' ? selectedPrompt : undefined}
          dashboardData={collectedDashboardData}
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
      
      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
      />
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading...
    </div>
  );
}