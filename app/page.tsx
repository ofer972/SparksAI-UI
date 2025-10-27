'use client';

import { useState } from 'react';
import BurndownChart from '@/components/BurndownChart';
import SettingsScreen from '@/components/SettingsScreen';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';
import AICards from '@/components/AICards';
import Recommendations from '@/components/Recommendations';
import TeamMetrics from '@/components/TeamMetrics';
import ApiTest from '@/components/ApiTest';
import TeamDashboard from '@/components/TeamDashboard';
import SparksAILogo from '@/components/SparksAILogo';

export default function Home() {
  const [activeNavItem, setActiveNavItem] = useState('team-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('AutoDesign-Dev');
  const [selectedPI, setSelectedPI] = useState('Q4 2025');

  const navigationItems = [
    { id: 'my-team-today', label: 'Team AI Insights', icon: '🏠' },
    { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
    { id: 'pi-quarter', label: 'PI / Quarter', icon: '🕐' },
    { id: 'ai-chat', label: 'AI Direct Data Chat', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'api-test', label: 'API Test', icon: '🔧' },
  ];

  const renderMainContent = () => {
    switch (activeNavItem) {
      case 'my-team-today':
        return (
          <div className="h-full flex flex-col">
            {/* AI Cards Section - Reduced height with padding */}
            <div className="bg-white rounded-lg shadow-sm p-2 flex-shrink-0" style={{ height: '45vh' }}>
              <h2 className="text-lg font-semibold mb-1">Team AI Insights</h2>
              <div className="h-full pb-4">
                <AICards teamName={selectedTeam} />
              </div>
            </div>
            
            {/* Recommendations Section - Fixed height with no margin */}
            <div className="flex-shrink-0" style={{ height: '200px' }}>
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
      case 'settings':
        return <SettingsScreen />;
      case 'api-test':
        return <ApiTest />;
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
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-blue-600">SparksAI Insights & Dashboards</h1>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask AI..."
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
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-2 overflow-auto">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}