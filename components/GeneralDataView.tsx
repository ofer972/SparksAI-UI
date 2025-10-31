import { useState } from 'react';
import AgentJobsTab from './AgentJobsTab';
import TeamAICardsTab from './TeamAICardsTab';
import PIAICardsTab from './PIAICardsTab';
import PromptsTab from './PromptsTab';
import TranscriptsTab from './TranscriptsTab';

interface TabItem {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { id: 'agent-jobs', label: 'Agent Jobs', icon: '🤖' },
  { id: 'team-ai-cards', label: 'Team AI Cards', icon: '🎯' },
  { id: 'pi-ai-cards', label: 'PI AI Cards', icon: '📈' },
  { id: 'view-transcripts', label: 'View Transcripts', icon: '📝' },
  { id: 'security-logs', label: 'Security Logs', icon: '🔒' },
  { id: 'prompts', label: 'Prompts', icon: '💬' },
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
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-semibold mb-2">Security Logs</h2>
            <p className="text-sm text-gray-600">
              Security Logs tab will be implemented using the generic architecture.
            </p>
          </div>
        );
      case 'prompts':
        return <PromptsTab />;
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
          <nav className="flex">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600 bg-blue-50'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                } ${
                  index === 0 ? 'ml-0' : ''
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
