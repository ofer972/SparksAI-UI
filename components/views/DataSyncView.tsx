'use client';

import React, { useState } from 'react';
import ETLDashboard from '@/components/etl/ETLDashboard';
import ETLSettingsTabs from '@/components/etl/ETLSettingsTabs';
import ETLSyncActionsView from '@/components/etl/ETLSyncActionsView';
import { useETL } from '@/hooks/etl/useETL';

export type ETLSubView = 'dashboard' | 'settings' | 'sync';

interface DataSyncViewProps {
  activeSubView?: ETLSubView;
}

export default function DataSyncView({ activeSubView: initialSubView = 'dashboard' }: DataSyncViewProps) {
  const [activeSubView, setActiveSubView] = useState<ETLSubView>(initialSubView);
  const etlData = useETL();

  // Update local state if prop changes (for navigation from parent)
  React.useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [initialSubView]);

  // Show loading state while waiting for backend
  if (etlData.waitingForBackend) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-content-secondary mb-4">{etlData.error}</p>
          <button
            onClick={etlData.etlLoadData}
            className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the appropriate view
  const renderContent = () => {
    // Safety check - should not happen due to early returns above
    if (!etlData.settings) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-content-secondary">Loading ETL configuration...</p>
          </div>
        </div>
      );
    }

    switch (activeSubView) {
      case 'dashboard':
        return (
          <ETLDashboard
            settings={etlData.settings}
            jobStatus={etlData.jobStatus}
            customFields={etlData.customFields}
            refreshingStatus={etlData.refreshingStatus}
            onRefreshJobStatus={etlData.etlRefreshJobStatus}
            onShowETLSettings={() => setActiveSubView('settings')}
            onShowETLSyncActions={() => setActiveSubView('sync')}
          />
        );
      case 'settings':
        return (
          <ETLSettingsTabs
            settings={etlData.settings}
            customFields={etlData.customFields}
            onSaved={etlData.etlHandleSettingsSaved}
          />
        );
      case 'sync':
        return (
          <ETLSyncActionsView
            settings={etlData.settings}
            jobStatus={etlData.jobStatus}
            onRefresh={etlData.etlRefreshJobStatus}
            refreshingStatus={etlData.refreshingStatus}
            onRefreshJobStatus={etlData.etlRefreshJobStatus}
          />
        );
      default:
        return (
          <div className="text-center py-12">
            <p className="text-content-secondary">View not found</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
    </div>
  );
}

