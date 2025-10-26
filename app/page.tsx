'use client';

import { useState } from 'react';
import BurndownChart from '@/components/BurndownChart';
import SettingsScreen from '@/components/SettingsScreen';
import TeamFilter from '@/components/TeamFilter';
import PIFilter from '@/components/PIFilter';
import AICards from '@/components/AICards';
import Recommendations from '@/components/Recommendations';
import TeamMetrics from '@/components/TeamMetrics';

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
  ];

  const renderMainContent = () => {
    switch (activeNavItem) {
      case 'my-team-today':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-2">
              <h2 className="text-lg font-semibold mb-1">Team AI Insights</h2>
              <AICards teamName={selectedTeam} />
            </div>
            <Recommendations teamName={selectedTeam} />
            <TeamMetrics teamName={selectedTeam} />
          </div>
        );
      case 'team-dashboard':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-3">Sprint Burndown Chart</h2>
                  <BurndownChart
                    teamName={selectedTeam}
                    issueType="all"
                  />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-500">
                <div className="text-xs font-medium text-red-600 mb-1">CRITICAL</div>
                <div className="text-sm font-semibold mb-1">Dependency Bottleneck</div>
                <div className="text-xs text-gray-600 mb-1">85% Impact Score</div>
                <div className="text-xs text-gray-500 mb-2">
                  API Gateway team is blocking 4 user stories. This affects 2 upcoming releases and customer commitments.
                </div>
                <button className="bg-red-500 text-white px-2 py-1 rounded text-xs">Schedule Sync</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-orange-500">
                <div className="text-xs font-medium text-orange-600 mb-1">HIGH</div>
                <div className="text-sm font-semibold mb-1">Velocity Decline</div>
                <div className="text-xs text-gray-600 mb-1">72% Impact Score</div>
                <div className="text-xs text-gray-500 mb-2">
                  Team velocity dropped 25% compared to last sprint. Code review cycle time increased significantly.
                </div>
                <button className="bg-orange-500 text-white px-2 py-1 rounded text-xs">Analyze Trends</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-yellow-500">
                <div className="text-xs font-medium text-yellow-600 mb-1">MEDIUM</div>
                <div className="text-sm font-semibold mb-1">Team Capacity</div>
                <div className="text-xs text-gray-600 mb-1">58% Impact Score</div>
                <div className="text-xs text-gray-500 mb-2">
                  Two team members are over-allocated. Consider redistributing workload for next sprint planning.
                </div>
                <button className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Rebalance Load</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-500">
                <div className="text-xs font-medium text-green-600 mb-1">LOW</div>
                <div className="text-sm font-semibold mb-1">Code Quality</div>
                <div className="text-xs text-gray-600 mb-1">34% Impact Score</div>
                <div className="text-xs text-gray-500 mb-2">
                  Test coverage improved to 87%. Consider adding integration tests for payment module.
                </div>
                <button className="bg-green-500 text-white px-2 py-1 rounded text-xs">View Details</button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium">Schedule Dependency Review</div>
                    <div className="text-xs text-gray-600">with API Gateway team lead</div>
                  </div>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Schedule</button>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium">Generate Sprint Report</div>
                    <div className="text-xs text-gray-600">For stakeholder update</div>
                  </div>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Generate</button>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium">Process Optimization</div>
                    <div className="text-xs text-gray-600">Review code review workflow</div>
                  </div>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Explore</button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">23</div>
                  <div className="text-xs text-gray-600">Story Points</div>
                  <div className="text-xs text-green-600">+15% vs last sprint</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">4.2 days</div>
                  <div className="text-xs text-gray-600">Avg Cycle Time</div>
                  <div className="text-xs text-green-600">-1.3 days vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">68%</div>
                  <div className="text-xs text-gray-600">Predictability</div>
                  <div className="text-xs text-green-600">+12% vs last sprint</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">87%</div>
                  <div className="text-xs text-gray-600">Code Coverage</div>
                  <div className="text-xs text-green-600">↑5% vs last sprint</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return <SettingsScreen />;
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
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && <h1 className="text-sm font-semibold">Navigation</h1>}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
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
              <h1 className="text-lg font-bold text-blue-600">AI Insights & Dashboards</h1>
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
        <div className="flex-1 p-4 overflow-auto">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}