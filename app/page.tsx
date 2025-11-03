'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, refreshAccessToken, clearTokens, getCurrentUser, logout } from '@/lib/auth';
import SettingsScreen from '@/components/SettingsScreen';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';
import AICards from '@/components/AICards';
import Recommendations from '@/components/Recommendations';
import TeamMetrics from '@/components/TeamMetrics';
import PIAICards from '@/components/PIAICards';
import PIRecommendations from '@/components/PIRecommendations';
import ApiTest from '@/components/ApiTest';
import TeamDashboard from '@/components/TeamDashboard';
import SparksAILogo from '@/components/SparksAILogo';
import PIPredictability from '@/components/PIPredictability';
import PIBurndownChart from '@/components/PIBurndownChart';
import EpicScopeChangesChart from '@/components/EpicScopeChangesChart';
import GeneralDataView from '@/components/GeneralDataView';
import PromptsTab from '@/components/PromptsTab';
import UploadTranscripts from '@/components/UploadTranscripts';
import AIChatModal from '@/components/AIChatModal';
import { getIssueTypes, getDefaultIssueType } from '@/lib/issueTypes';
import { ApiService, verifyAdmin, listUsers, getUserRoles, getAllowlist, addAllowlist, deleteAllowlist, deleteUser, listRoles, assignRoleToUser, unassignRoleFromUser, getPendingRoles, assignPendingRole, unassignPendingRole, RoleDto, UserDto } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    // Bypass auth check on localhost if env var is set
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isLocalhost && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
      setAuthChecked(true);
      return;
    }

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

  const [activeNavItem, setActiveNavItem] = useState('team-ai-insights');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('AutoDesign-Dev');
  const [selectedPI, setSelectedPI] = useState('Q32025'); // Default to Q32025 which has data
  const [selectedPIIssueType, setSelectedPIIssueType] = useState(getDefaultIssueType('burndown')); // Default to Epic
  const [piBurndownCollapsed, setPiBurndownCollapsed] = useState(false);
  const [scopeChangesCollapsed, setScopeChangesCollapsed] = useState(false);
  const [loading, setLoading] = useState({
    sprintGoal: false,
    dailyAgent: false,
    piSync: false,
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

  useEffect(() => {
    // Bypass admin check on localhost if env var is set
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    
    console.log('[Admin Check] Starting admin verification...', {
      isLocalhost,
      bypassAuth,
      envVar: process.env.NEXT_PUBLIC_BYPASS_AUTH
    });
    
    if (isLocalhost && bypassAuth) {
      console.log('[Admin Check] Bypass mode active - setting isAdmin=true without API call');
      setIsAdmin(true); // Assume admin when bypassing auth on localhost
      return;
    }

    console.log('[Admin Check] Making API call to verify-admin endpoint...');
    (async () => {
      try {
        const admin = await verifyAdmin();
        console.log('[Admin Check] verifyAdmin() returned:', admin);
        setIsAdmin(admin);
      } catch (error) {
        console.error('[Admin Check] Error checking admin status:', error);
        setIsAdmin(false);
      }
    })();
  }, []);

  const apiService = new ApiService();

  const navigationItems = [
    { id: 'team-ai-insights', label: 'Team AI Insights', icon: '🏠' },
    { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
    { id: 'pi-quarter', label: 'PI AI Insights', icon: '🕐' },
    { id: 'pi-dashboard', label: 'PI Dashboard', icon: '📈' },
    { id: 'prompts', label: 'Prompts', icon: '🧠' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'general-data', label: 'View General Data', icon: '📋' },
    { id: 'create-agent-job', label: 'Create Agent Job', icon: '➕' },
    { id: 'upload-transcripts', label: 'Upload Transcripts', icon: '📤' },
    { id: 'api-test', label: 'API Test', icon: '🔧' },
    ...(isAdmin ? [{ id: 'users-admin', label: 'Users', icon: '👤' }] : []),
  ];

  // Accordion navigation groups for the sidebar UI (beautified)
  const navigationGroups: Array<{ title: string; items: { id: string; label: string; icon: string }[] }> = [
    {
      title: 'Insights',
      items: [
        { id: 'team-ai-insights', label: 'Team AI Insights', icon: '🏠' },
        { id: 'pi-quarter', label: 'PI AI Insights', icon: '🕐' },
      ],
    },
    {
      title: 'Dashboards',
      items: [
        { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
        { id: 'pi-dashboard', label: 'PI Dashboard', icon: '📈' },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'prompts', label: 'Prompts', icon: '🧠' },
        { id: 'general-data', label: 'View General Data', icon: '📋' },
        { id: 'create-agent-job', label: 'Create Agent Job', icon: '➕' },
        { id: 'upload-transcripts', label: 'Upload Transcripts', icon: '📤' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { id: 'api-test', label: 'API Test', icon: '🔧' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Administration',
            items: [{ id: 'users-admin', label: 'Users', icon: '👤' }],
          },
        ]
      : []),
  ];

  // Track which accordion groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Insights: true,
    Dashboards: true,
    Management: true,
    Tools: true,
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
    'prompts': 'SparksAI-Prompts',
    'settings': 'SparksAI-Settings',
    'general-data': 'SparksAI-General Data',
    'create-agent-job': 'SparksAI-Create Agent Job',
    'upload-transcripts': 'SparksAI-Upload Transcripts',
    'api-test': 'SparksAI-API Test',
    'users-admin': 'SparksAI-Users',
  };

  useEffect(() => {
    const fallbackTitle = 'SparksAI';
    document.title = titles[activeNavItem] ?? fallbackTitle;
  }, [activeNavItem]);

  // Load roles only once when admin status is confirmed
  useEffect(() => {
    // Bypass roles API call on localhost if env var is set
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isLocalhost && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
      // Set empty roles array when bypassing
      if (allRoles.length === 0) {
        setAllRoles([]);
      }
      return;
    }

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

  const handleCreateJob = async (jobType: 'Sprint Goal' | 'Daily Agent' | 'PI Sync') => {
    const loadingKey = jobType === 'Sprint Goal' ? 'sprintGoal' : 
                     jobType === 'Daily Agent' ? 'dailyAgent' : 'piSync';
    
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setMessage(null);

    try {
      if (jobType === 'PI Sync') {
        if (!selectedPI) {
          throw new Error('Please select a PI');
        }
        await apiService.createPiAgentJob(jobType, selectedPI);
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
        return (
          <div className="h-full flex flex-col">
            {/* AI Cards Section - responsive height (no wrapper background) */}
            <div className="pt-2 pb-2 pr-2 pl-[7px] md:flex-shrink-0 md:h-[45vh]">
              <div className="h-full md:pb-4">
                <AICards teamName={selectedTeam} />
              </div>
            </div>
            
            {/* Recommendations Section - responsive height */}
            <div className="mt-2 md:flex-shrink-0 md:h-52">
              <Recommendations teamName={selectedTeam} />
            </div>
            
            {/* Team Metrics Section - responsive height, no negative margin */}
            <div className="mt-2 md:flex-shrink-0 md:h-28">
              <TeamMetrics teamName={selectedTeam} />
            </div>
          </div>
        );
      case 'team-dashboard':
        return (
          <div className="h-full flex flex-col">
            {/* Dashboard Content */}
            <div className="flex-1 overflow-auto">
              <TeamDashboard selectedTeam={selectedTeam} />
            </div>
          </div>
        );
      case 'pi-quarter':
        return (
          <div className="h-full flex flex-col">
            {/* PI AI Cards Section - Reduced height with padding (no wrapper background) */}
            <div className="p-2 md:flex-shrink-0 md:h-[45vh]">
              <div className="h-full pb-4">
                <PIAICards piName={selectedPI} />
              </div>
            </div>
            
            {/* PI Recommendations Section - Fixed height with no margin */}
            <div className="flex-shrink-0 mt-2" style={{ height: '200px' }}>
              <PIRecommendations piName={selectedPI} />
            </div>
          </div>
        );
      case 'pi-dashboard':
        return (
          <div className="h-full flex flex-col">
            {/* Dashboard Content */}
            <div className="flex-1 overflow-auto space-y-4">
            <div className="bg-white rounded-lg shadow-sm pt-2 pb-4 px-4">
              <div className="flex items-center mb-3">
                <button 
                  onClick={() => setPiBurndownCollapsed(!piBurndownCollapsed)}
                  className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
                >
                  {piBurndownCollapsed ? '▼' : '▲'}
                </button>
                <h2 className="text-lg font-semibold">PI Burndown Chart</h2>
              </div>
              {!piBurndownCollapsed && (
                <div className="space-y-3">
                  {/* Issue Type Filter */}
                  <div className="flex items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-700">Issue Type:</label>
                      <select
                        value={selectedPIIssueType}
                        onChange={(e) => setSelectedPIIssueType(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ 
                          minWidth: '120px',
                          backgroundColor: 'white',
                          zIndex: 9999,
                          position: 'relative'
                        }}
                      >
                        {getIssueTypes().map((issueType) => (
                          <option key={issueType.value} value={issueType.value}>
                            {issueType.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 text-center text-sm font-medium text-gray-800" style={{ transform: 'translateX(-80px)' }}>
                      {selectedPI}
                    </div>
                    <div className="w-24"></div> {/* Spacer to balance the layout */}
                  </div>
                  
                  <PIBurndownChart 
                    piName={selectedPI}
                    issueType={selectedPIIssueType}
                    isVisible={!piBurndownCollapsed}
                  />
                </div>
              )}
            </div>
            <PIPredictability selectedPI={selectedPI} selectedTeam={selectedTeam} />
            
            {/* Epic Scope Changes Chart */}
            <div className="bg-white rounded-lg shadow-sm p-4 overflow-x-auto">
              <div className="flex items-center mb-3">
                <button 
                  onClick={() => setScopeChangesCollapsed(!scopeChangesCollapsed)}
                  className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
                >
                  {scopeChangesCollapsed ? '▼' : '▲'}
                </button>
                <h2 className="text-lg font-semibold">Epic Scope Changes</h2>
              </div>

              {!scopeChangesCollapsed && (
                <EpicScopeChangesChart 
                  selectedQuarter={selectedPI} 
                  isVisible={!scopeChangesCollapsed}
                />
              )}
              </div>
            </div>
          </div>
        );
      case 'prompts':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto">
              <PromptsTab />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto">
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
              <div className="border border-gray-200 rounded-lg p-4">
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
            <div className="flex-1 overflow-auto">
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
      case 'api-test':
        return (
          <div className="h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-auto">
              <ApiTest teamName={selectedTeam} />
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-56 bg-white shadow-xl border-r border-gray-200 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="w-32">
                <SparksAILogo collapsed={false} size="small" />
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-800"
                aria-label="Close sidebar"
              >✕</button>
            </div>
            {/* Mobile Nav (uses same groups) */}
            <nav className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {navigationGroups.map((group) => (
                  <div key={group.title}>
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800"
                    >
                      <span>{group.title}</span>
                      <span className={`transition-transform ${expandedGroups[group.title] ? 'rotate-180' : ''}`}>⌄</span>
                    </button>
                    {expandedGroups[group.title] && (
                      <div className="mt-1 space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setActiveNavItem(item.id); setMobileSidebarOpen(false); }}
                            className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                              activeNavItem === item.id
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            title={item.label}
                          >
                            <span className="text-sm">{item.icon}</span>
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
        <div className="p-3 h-full flex flex-col">
          <div className="flex flex-col items-center mb-1">
            <div className="w-full">
              <SparksAILogo collapsed={sidebarCollapsed} size="medium" />
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto">
            {sidebarCollapsed ? (
              <div className="space-y-1">
                {navigationGroups.flatMap((g) => g.items).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavItem(item.id)}
                    className={`w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors ${
                      activeNavItem === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <span className="text-base">{item.icon}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {navigationGroups.map((group) => (
                  <div key={group.title}>
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-800"
                    >
                      <span>{group.title}</span>
                      <span className={`transition-transform ${expandedGroups[group.title] ? 'rotate-180' : ''}`}>⌄</span>
                    </button>
                    {expandedGroups[group.title] && (
                      <div className="mt-1 space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setActiveNavItem(item.id)}
                            className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                              activeNavItem === item.id
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            title={item.label}
                          >
                            <span className="text-sm">{item.icon}</span>
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

          <div className="mt-auto pt-2 border-t border-gray-200">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 flex items-center justify-center"
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
        <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 md:py-3 flex-shrink-0 relative z-30">
          <div className="flex items-center justify-between gap-2">
            {/* Left side: View title and filters */}
            <div className="flex items-center gap-2 md:space-x-4 flex-1 min-w-0">
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
              <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                {navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI'}
              </h1>
              
              {/* Team Filter - for views that need it */}
              <div className="hidden md:block">
                {(activeNavItem === 'team-ai-insights' || activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'api-test' || activeNavItem === 'upload-transcripts') && (
                  <TeamFilter 
                    selectedTeam={selectedTeam}
                    onTeamChange={setSelectedTeam}
                  />
                )}
              </div>
              
              {/* PI Filter - for views that need it */}
              <div className="hidden md:block">
                {(activeNavItem === 'pi-quarter' || activeNavItem === 'pi-dashboard' || activeNavItem === 'upload-transcripts') && (
                  <PIFilter 
                    selectedPI={selectedPI}
                    onPIChange={setSelectedPI}
                  />
                )}
              </div>
            </div>
            
            {/* Center: Dashboard AI Insights button and Prompt selector */}
            {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') && (
              <div className="hidden sm:flex items-center justify-center space-x-3 flex-1">
                <button
                  onClick={() => setIsDashboardChatModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  AI Insights
                </button>
                <div className="hidden md:flex items-center space-x-2 relative z-10">
                  <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Prompt:</label>
                  <select
                    value={selectedPrompt}
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                    disabled={loadingPrompts}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px] bg-white"
                  >
                    <option value="">Select a prompt...</option>
                    {prompts.map((prompt) => (
                      <option key={`${prompt.email_address}/${prompt.prompt_name}`} value={prompt.prompt_name}>
                        {prompt.prompt_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Right side: user info */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-1 justify-end">
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
        {/* Mobile controls panel (everything except title) */}
        <div className="md:hidden border-t border-gray-200 px-3 py-2 space-y-2 relative z-10">
          {/* Filters */}
          <div className="flex flex-col gap-2">
            {(activeNavItem === 'team-ai-insights' || activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'api-test' || activeNavItem === 'upload-transcripts') && (
              <TeamFilter 
                selectedTeam={selectedTeam}
                onTeamChange={setSelectedTeam}
              />
            )}
            {(activeNavItem === 'pi-quarter' || activeNavItem === 'pi-dashboard' || activeNavItem === 'upload-transcripts') && (
              <PIFilter 
                selectedPI={selectedPI}
                onPIChange={setSelectedPI}
              />
            )}
          </div>

          {/* Dashboard controls */}
          {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setIsDashboardChatModalOpen(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
              >
                AI Insights
              </button>
            <div className="flex items-center gap-2 relative z-10">
                <label className="text-[11px] font-medium text-gray-700 whitespace-nowrap">Prompt:</label>
                <select
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                  disabled={loadingPrompts}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] bg-white"
                >
                  <option value="">Select a prompt...</option>
                  {prompts.map((prompt) => (
                    <option key={`${prompt.email_address}/${prompt.prompt_name}`} value={prompt.prompt_name}>
                      {prompt.prompt_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Search removed on mobile */}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-2 overflow-auto">
          {renderMainContent()}
        </div>
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
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading...
    </div>
  );
}