import { useState } from 'react';
import AgentJobsTab from './AgentJobsTab';
import TeamAICardsTab from './TeamAICardsTab';
import PIAICardsTab from './PIAICardsTab';
import TranscriptsTab from './TranscriptsTab';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { 
    id: 'agent-jobs', 
    label: 'Agent Jobs', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  { 
    id: 'team-ai-cards', 
    label: 'Team AI Cards', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    id: 'pi-ai-cards', 
    label: 'PI AI Cards', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  { 
    id: 'view-transcripts', 
    label: 'View Transcripts', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )
  },
  { 
    id: 'security-logs', 
    label: 'Security Logs', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
];

export default function GeneralDataView() {
  const [activeTab, setActiveTab] = useState('agent-jobs');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agent-jobs':
        return <AgentJobsTab />;
      case 'team-ai-cards':
        return <TeamAICardsTab />;
      case 'pi-ai-cards':
        return <PIAICardsTab />;
      case 'view-transcripts':
        return <TranscriptsTab />;
      case 'security-logs':
        return (
          <div className="h-full flex flex-col min-h-0 px-6 pt-6">
            <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold mb-2">Security Logs</h2>
            <p className="text-sm text-gray-600">
              Security Logs tab will be implemented using the generic architecture.
            </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🚧</div>
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-sm text-gray-600">
              This tab is under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col px-4 md:px-6">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 mt-4">
        <div className="px-4 md:pl-0 md:pr-6">
          {/* Mobile: 3 tabs per row grid */}
          <nav className="grid grid-cols-3 gap-1 md:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center justify-center px-2 py-2 text-xs font-medium rounded-t-lg border transition-colors
                    ${isActive ? 'bg-white text-blue-600 border-x border-t border-gray-300 border-b-white -mb-px relative z-10' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}
                  `}
                >
                  <span className="mb-1">{tab.icon}</span>
                  <span className="text-center leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop: single row */}
          <nav className="hidden md:flex md:flex-nowrap gap-1 md:justify-start">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
                    ${isActive ? 'bg-white text-blue-600 border-x border-t border-gray-300 border-b-white -mb-px relative z-10' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-gray-300 rounded-tr-lg rounded-b-lg shadow-sm mb-4">
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 md:p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
