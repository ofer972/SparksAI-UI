'use client';

import { useState } from 'react';
import { useETL } from '@/hooks/etl/useETL';
import ETLDashboard from '@/components/etl/ETLDashboard';
import ETLSettingsTabs from '@/components/etl/ETLSettingsTabs';

export default function JiraSettingsView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const etlData = useETL();

  // Show loading state while waiting for backend
  if (etlData.waitingForBackend) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-content-secondary">Connecting to ETL backend...</p>
        </div>
      </div>
    );
  }

  // Show loading state while initial data is being fetched
  if (etlData.loading && !etlData.settings) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-content-secondary">Loading ETL configuration...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (etlData.error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-danger-text text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-content-secondary mb-4">{etlData.error}</p>
          <button
            onClick={etlData.etlLoadData}
            className="px-4 py-2 bg-brand text-content-primary rounded hover:bg-brand-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Safety check
  if (!etlData.settings) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-content-secondary">Loading ETL configuration...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'connection', label: 'Connection' },
    { id: 'projects', label: 'Projects' },
    { id: 'jql', label: 'JQL Scope' },
    { id: 'fields', label: 'Fields' },
    { id: 'history', label: 'History' },
    { id: 'derived', label: 'Derived Fields' },
    { id: 'pi', label: 'PI Dates' },
  ];

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <ETLDashboard
          settings={etlData.settings}
          jobStatus={etlData.jobStatus}
          customFields={etlData.customFields}
          refreshingStatus={etlData.refreshingStatus}
          onRefreshJobStatus={etlData.etlRefreshJobStatus}
          onShowETLSettings={() => setActiveTab('connection')}
          onShowETLSyncActions={() => {}}
        />
      );
    }

    // For all other tabs, render ETLSettingsTabs with the appropriate initial tab
    const tabMapping: { [key: string]: string } = {
      'connection': 'jira-connection',
      'projects': 'projects',
      'jql': 'jql',
      'fields': 'fields',
      'history': 'history',
      'derived': 'derived',
      'pi': 'pi',
    };

    return (
      <ETLSettingsTabs
        settings={etlData.settings}
        customFields={etlData.customFields}
        onSaved={etlData.etlHandleSettingsSaved}
        initialTab={tabMapping[activeTab]}
        hideNavigation={true}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top-level Tabs */}
      <div className="flex-shrink-0 px-4 md:px-6 mt-4">
        <div className="px-4 md:pl-0 md:pr-6">
          {/* Mobile: scrollable tabs */}
          <nav className="flex gap-1 overflow-x-auto md:hidden pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 px-4 py-2.5 text-xs font-medium rounded-t-lg border transition-colors whitespace-nowrap
                    ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary'}
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop: single row */}
          <nav className="hidden md:flex md:flex-wrap gap-1 md:justify-start">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
                    ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary'}
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-surface border border-outline-strong rounded-tr-lg rounded-b-lg shadow-sm mb-4 mx-4 md:mx-6">
        {renderContent()}
      </div>
    </div>
  );
}

