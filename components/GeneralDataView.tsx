import { useState } from 'react';
import AgentJobsTabNew from './AgentJobsTabNew';
import TeamAICardsTab from './TeamAICardsTab';

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { id: 'agent-jobs', label: 'Agent Jobs', icon: '🤖' },
  { id: 'team-ai-cards', label: 'Team AI Cards', icon: '🎯' },
  { id: 'security-logs', label: 'Security Logs', icon: '🔒' },
  { id: 'view-transcripts', label: 'View Transcripts', icon: '📝' },
];

export default function GeneralDataView() {
  const [activeTab, setActiveTab] = useState('agent-jobs');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agent-jobs':
        return <AgentJobsTabNew />;
      case 'team-ai-cards':
        return <TeamAICardsTab />;
      case 'security-logs':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold mb-2">Security Logs</h2>
            <p className="text-sm text-gray-600">
              Security Logs tab will be implemented using the generic architecture.
            </p>
          </div>
        );
      case 'view-transcripts':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-lg font-semibold mb-2">View Transcripts</h2>
            <p className="text-sm text-gray-600">
              View Transcripts tab will be implemented using the generic architecture.
            </p>
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
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">View General Data</h1>
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
