'use client';

import { useState, useEffect } from 'react';
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
import { ApiService } from '@/lib/api';

export default function Home() {
  const [activeNavItem, setActiveNavItem] = useState('team-ai-insights');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const apiService = new ApiService();

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
    { id: 'ai-chat', label: 'AI Direct Data Chat', icon: '🤖' },
  ];

  // Map sidebar items to browser tab titles (no spaces around '-')
  const titles: Record<string, string> = {
    'team-ai-insights': 'SparksAI-Team AI Insights',
    'team-dashboard': 'SparksAI-Team Dashboard',
    'pi-quarter': 'SparksAI-PI AI Insights',
    'pi-dashboard': 'SparksAI-PI Dashboard',
    'prompts': 'SparksAI-Prompts',
    'ai-chat': 'SparksAI-AI Chat',
    'settings': 'SparksAI-Settings',
    'general-data': 'SparksAI-General Data',
    'create-agent-job': 'SparksAI-Create Agent Job',
    'upload-transcripts': 'SparksAI-Upload Transcripts',
    'api-test': 'SparksAI-API Test',
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
          <div className="h-full flex flex-col">
            {/* AI Cards Section - Reduced height with padding */}
            <div className="bg-white rounded-lg shadow-sm pt-2 pb-2 pr-2 pl-[7px] flex-shrink-0" style={{ height: '45vh' }}>
              <h2 className="text-lg font-semibold mb-1 pt-3">Team AI Insights</h2>
              <div className="h-full pb-4">
                <AICards teamName={selectedTeam} />
              </div>
            </div>
            
            {/* Recommendations Section - Fixed height with top spacing after AI cards */}
            <div className="flex-shrink-0 mt-2" style={{ height: '200px' }}>
              <Recommendations teamName={selectedTeam} />
            </div>
            
            {/* Team Metrics Section - Fixed height, right after recommendations */}
            <div className="flex-shrink-0 -mt-4" style={{ height: '120px' }}>
              <TeamMetrics teamName={selectedTeam} />
            </div>
          </div>
        );
      case 'team-dashboard':
        return <TeamDashboard selectedTeam={selectedTeam} />;
      case 'pi-quarter':
        return (
          <div className="h-full flex flex-col">
            {/* PI AI Cards Section - Reduced height with padding */}
            <div className="bg-white rounded-lg shadow-sm p-2 flex-shrink-0" style={{ height: '45vh' }}>
              <h2 className="text-lg font-semibold mb-1">PI AI Insights</h2>
              <div className="h-full pb-4">
                <PIAICards piName={selectedPI} />
              </div>
            </div>
            
            {/* PI Recommendations Section - Fixed height with no margin */}
            <div className="flex-shrink-0" style={{ height: '200px' }}>
              <PIRecommendations piName={selectedPI} />
            </div>
          </div>
        );
      case 'pi-dashboard':
        return (
          <div className="space-y-4">
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
            <div className="bg-white rounded-lg shadow-sm p-4">
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
        );
      case 'prompts':
        return <PromptsTab />;
      case 'settings':
        return <SettingsScreen />;
      case 'create-agent-job':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 relative">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Agent Job</h2>
              
              {/* Sprint Goal Row */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">Sprint Goal</h3>
                  <div className="flex items-center space-x-4 flex-1">
                    <TeamFilter
                      selectedTeam={selectedTeam}
                      onTeamChange={setSelectedTeam}
                    />
                    <button
                      onClick={() => handleCreateJob('Sprint Goal')}
                      disabled={loading.sprintGoal || !selectedTeam}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.sprintGoal ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Daily Agent Row */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">Daily Agent</h3>
                  <div className="flex items-center space-x-4 flex-1">
                    <TeamFilter
                      selectedTeam={selectedTeam}
                      onTeamChange={setSelectedTeam}
                    />
                    <button
                      onClick={() => handleCreateJob('Daily Agent')}
                      disabled={loading.dailyAgent || !selectedTeam}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading.dailyAgent ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                </div>
              </div>

              {/* PI Sync Row */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 mr-4">PI Sync</h3>
                  <div className="flex items-center space-x-4 flex-1">
                    <PIFilter
                      selectedPI={selectedPI}
                      onPIChange={setSelectedPI}
                    />
                    <button
                      onClick={() => handleCreateJob('PI Sync')}
                      disabled={loading.piSync || !selectedPI}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
        );
      case 'general-data':
        return <GeneralDataView />;
      case 'upload-transcripts':
        return <UploadTranscripts selectedTeam={selectedTeam} selectedPI={selectedPI} onTeamChange={setSelectedTeam} onPIChange={setSelectedPI} />;
      case 'api-test':
        return <ApiTest teamName={selectedTeam} />;
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

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar Navigation */}
      <div className={`bg-white shadow-sm border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-48'
      }`}>
        <div className="p-3 h-full">
          <div className="flex flex-col items-center mb-4">
            <div className="w-full">
              <SparksAILogo collapsed={sidebarCollapsed} size="medium" />
            </div>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 mt-2"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                  sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"
                } />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNavItem(item.id)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-2' : 'space-x-2 px-2'
                } py-1.5 rounded-lg text-left transition-colors ${
                  activeNavItem === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="text-sm">{item.icon}</span>
                {!sidebarCollapsed && <span className="text-xs font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 relative">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-blue-600">SparksAI Insights & Dashboards</h1>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask SparksAI..."
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          
          <div className="flex items-center space-x-3">
            <PIFilter 
              selectedPI={selectedPI}
              onPIChange={setSelectedPI}
            />
            <TeamFilter 
              selectedTeam={selectedTeam}
              onTeamChange={setSelectedTeam}
            />
            {(activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard') && (
              <div className="flex items-center space-x-3" style={{ marginLeft: '150px' }}>
                <button
                  onClick={() => setIsDashboardChatModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  Get Dashboard AI Insights
                </button>
                <div className="flex items-center space-x-2">
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
          </div>
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
  );
}