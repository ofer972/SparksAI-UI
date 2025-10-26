'use client';

import { useState } from 'react';
import BurndownChart from '@/components/BurndownChart';

export default function Home() {
  const [activeTab, setActiveTab] = useState('team');
  const [activeNavItem, setActiveNavItem] = useState('team-dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigationItems = [
    { id: 'my-team-today', label: 'Today Insights', icon: '🏠' },
    { id: 'team-dashboard', label: 'Team Dashboard', icon: '📊' },
    { id: 'pi-quarter', label: 'PI / Quarter', icon: '🕐' },
    { id: 'dashboard-collection', label: 'Dashboard Collection', icon: '📁' },
    { id: 'ai-chat', label: 'AI Direct Data Chat', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const tabs = [
    { id: 'insights', label: 'Insights & Dashboards' },
    { id: 'team', label: 'Team' },
    { id: 'program', label: 'Program (PI)' },
    { id: 'ai-summary', label: 'AI Summary' },
    { id: 'reports', label: 'Reports' },
  ];

  const renderMainContent = () => {
    switch (activeNavItem) {
      case 'team-dashboard':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Sprint Burndown Chart</h2>
              <BurndownChart 
                teamName="AutoDesign-Dev"
                issueType="all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                <div className="text-sm font-medium text-red-600 mb-2">CRITICAL</div>
                <div className="text-lg font-semibold mb-2">Dependency Bottleneck</div>
                <div className="text-sm text-gray-600 mb-2">85% Impact Score</div>
                <div className="text-xs text-gray-500 mb-3">
                  API Gateway team is blocking 4 user stories. This affects 2 upcoming releases and customer commitments.
                </div>
                <button className="bg-red-500 text-white px-3 py-1 rounded text-sm">Schedule Sync</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                <div className="text-sm font-medium text-orange-600 mb-2">HIGH</div>
                <div className="text-lg font-semibold mb-2">Velocity Decline</div>
                <div className="text-sm text-gray-600 mb-2">72% Impact Score</div>
                <div className="text-xs text-gray-500 mb-3">
                  Team velocity dropped 25% compared to last sprint. Code review cycle time increased significantly.
                </div>
                <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm">Analyze Trends</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                <div className="text-sm font-medium text-yellow-600 mb-2">MEDIUM</div>
                <div className="text-lg font-semibold mb-2">Team Capacity</div>
                <div className="text-sm text-gray-600 mb-2">58% Impact Score</div>
                <div className="text-xs text-gray-500 mb-3">
                  Two team members are over-allocated. Consider redistributing workload for next sprint planning.
                </div>
                <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">Rebalance Load</button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                <div className="text-sm font-medium text-green-600 mb-2">LOW</div>
                <div className="text-lg font-semibold mb-2">Code Quality</div>
                <div className="text-sm text-gray-600 mb-2">34% Impact Score</div>
                <div className="text-xs text-gray-500 mb-3">
                  Test coverage improved to 87%. Consider adding integration tests for payment module.
                </div>
                <button className="bg-green-500 text-white px-3 py-1 rounded text-sm">View Details</button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">Schedule Dependency Review</div>
                    <div className="text-sm text-gray-600">with API Gateway team lead</div>
                  </div>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm">Schedule</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">Generate Sprint Report</div>
                    <div className="text-sm text-gray-600">For stakeholder update</div>
                  </div>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm">Generate</button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">Process Optimization</div>
                    <div className="text-sm text-gray-600">Review code review workflow</div>
                  </div>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm">Explore</button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">23</div>
                  <div className="text-sm text-gray-600">Story Points</div>
                  <div className="text-xs text-green-600">+15% vs last sprint</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">4.2 days</div>
                  <div className="text-sm text-gray-600">Avg Cycle Time</div>
                  <div className="text-xs text-green-600">-1.3 days vs target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">68%</div>
                  <div className="text-sm text-gray-600">Predictability</div>
                  <div className="text-xs text-green-600">+12% vs last sprint</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">87%</div>
                  <div className="text-sm text-gray-600">Code Coverage</div>
                  <div className="text-xs text-green-600">↑5% vs last sprint</div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-gray-600">
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
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 h-full">
          <div className="flex items-center justify-between mb-6">
            {!sidebarCollapsed && <h1 className="text-lg font-semibold">Navigation</h1>}
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
                  sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'
                } py-2 rounded-lg text-left transition-colors ${
                  activeNavItem === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : tab.id === 'insights'
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask AI..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Team:</span>
              <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option>AutoDesign-Dev</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">PI:</span>
              <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option>Q4 2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}