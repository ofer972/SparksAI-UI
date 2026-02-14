'use client';

import { useState, useMemo, useEffect } from 'react';
import DORAAnalysisTab from './github/DORAAnalysisTab';
import PRQualityMetricsTab from './github/PRQualityMetricsTab';
import GitHubHelpDialog from './github/GitHubHelpDialog';
import { useGitHubSettings } from '@/contexts/GitHubSettingsContext';

const tabIdToHelpTopic = { 'pr-quality-metrics': 'pr-metrics' as const, 'dora-insights': 'dora-metrics' as const };

function HelpIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-content-tertiary hover:text-content-primary"
      aria-label="Help"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const allTabs: TabItem[] = [
  { 
    id: 'pr-quality-metrics', 
    label: 'PR Quality Metrics', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    id: 'dora-insights', 
    label: 'DORA Metrics', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
];

export default function GitHubAnalysisView() {
  const { settings } = useGitHubSettings();
  const [activeTab, setActiveTab] = useState('pr-quality-metrics');
  const [helpTopic, setHelpTopic] = useState<'pr-metrics' | 'dora-metrics' | null>(null);

  // Filter tabs: always show PR Quality Metrics, only show DORA Metrics if deployments are enabled
  const tabs = useMemo(() => {
    const deploymentsEnabled = settings?.github_deployments_enabled !== 'false';
    return allTabs.filter(tab => 
      tab.id === 'pr-quality-metrics' || (tab.id === 'dora-insights' && deploymentsEnabled)
    );
  }, [settings?.github_deployments_enabled]);

  // If active tab is DORA Metrics but it's now hidden, switch to PR Quality Metrics
  useEffect(() => {
    if (activeTab === 'dora-insights' && !tabs.find(t => t.id === 'dora-insights')) {
      setActiveTab('pr-quality-metrics');
    }
  }, [activeTab, tabs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dora-insights':
        return <DORAAnalysisTab />;
      case 'pr-quality-metrics':
        return <PRQualityMetricsTab />;
      default:
        return (
          <div className="bg-surface rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🚧</div>
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-sm text-content-tertiary">
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
          {/* Mobile: tabs grid */}
          <nav className={`grid ${tabs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1 md:hidden`}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const topic = tabIdToHelpTopic[tab.id as keyof typeof tabIdToHelpTopic];
              return (
                <div key={tab.id} className="relative flex">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex flex-col items-center justify-center flex-1 px-2 py-2 text-xs font-medium rounded-t-lg border transition-colors
                      ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated/50 text-content-tertiary border border-outline hover:bg-surface-secondary'}
                    `}
                  >
                    <span className="mb-1">{tab.icon}</span>
                    <span className="text-center leading-tight">{tab.label}</span>
                  </button>
                  {topic && (
                    <span className="absolute top-1 right-1 z-20">
                      <HelpIconButton onClick={() => setHelpTopic(topic)} />
                    </span>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Desktop: single row */}
          <nav className="hidden md:flex md:flex-nowrap gap-1 md:justify-start">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const topic = tabIdToHelpTopic[tab.id as keyof typeof tabIdToHelpTopic];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
                    ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated/50 text-content-tertiary border border-outline hover:bg-surface-secondary'}
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {topic && <HelpIconButton onClick={() => setHelpTopic(topic)} />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-surface border border-outline-strong rounded-tr-lg rounded-b-lg shadow-sm mb-4">
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 md:p-6">
          {renderTabContent()}
        </div>
      </div>

      <GitHubHelpDialog isOpen={helpTopic !== null} onClose={() => setHelpTopic(null)} topic={helpTopic} />
    </div>
  );
}

