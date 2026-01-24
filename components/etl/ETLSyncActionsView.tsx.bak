'use client';

import { useState, useEffect } from 'react';
import { ETLSettings, Job } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';
import ETLJobStatus from './ETLJobStatus';

interface ETLSyncActionsViewProps {
  settings: ETLSettings | null;
  jobStatus: { current_job: Job | null; last_finished_job: Job | null } | null;
  onRefresh: () => void;
  refreshingStatus?: boolean;
  onRefreshJobStatus?: () => void;
}

export default function ETLSyncActionsView({
  settings,
  jobStatus,
  onRefresh,
  refreshingStatus = false,
  onRefreshJobStatus,
}: ETLSyncActionsViewProps) {
  const [confirmFullImport, setConfirmFullImport] = useState(false);
  const [confirmDefaultBackfill, setConfirmDefaultBackfill] = useState(false);
  const [confirmDailyBackfill, setConfirmDailyBackfill] = useState(false);
  const [confirmResetJobs, setConfirmResetJobs] = useState(false);
  const [showEnableSyncWarning, setShowEnableSyncWarning] = useState(false);
  const [dailyBackfillDays, setDailyBackfillDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [enableSync, setEnableSync] = useState<boolean>(() => {
    if (!settings) return false;
    if (typeof settings.enable_sync === 'boolean') return settings.enable_sync;
    if (typeof settings.enable_sync === 'string') {
      const normalized = settings.enable_sync.toLowerCase().trim();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  });

  // Update enableSync when settings change
  useEffect(() => {
    if (!settings) return;
    if (typeof settings.enable_sync === 'boolean') {
      setEnableSync(settings.enable_sync);
    } else if (typeof settings.enable_sync === 'string') {
      const normalized = settings.enable_sync.toLowerCase().trim();
      setEnableSync(normalized === 'true' || normalized === '1' || normalized === 'yes');
    }
  }, [settings?.enable_sync]);

  useEffect(() => {
    const etlCalculateDefaultDays = async () => {
      try {
        const lastBackfillTimestamp = await etlApiService.getLastHistoryBackfill();
        if (lastBackfillTimestamp) {
          const lastBackfillDate = new Date(lastBackfillTimestamp);
          const now = new Date();
          const daysSinceLast = Math.floor((now.getTime() - lastBackfillDate.getTime()) / (1000 * 60 * 60 * 24));
          const calculatedDays = Math.min(30, Math.max(1, daysSinceLast + 1));
          setDailyBackfillDays(calculatedDays);
        }
      } catch {}
    };

    if (confirmDailyBackfill) {
      etlCalculateDefaultDays();
    }
  }, [confirmDailyBackfill]);

  const currentJob = jobStatus?.current_job;
  const isJobRunning = !!(currentJob && (currentJob.status === 'RUNNING' || currentJob.status === 'QUEUED'));

  const handleToggleEnableSync = async () => {
    try {
      const newValue = !enableSync;
      await etlApiService.updateSetting('enable_sync', newValue ? 'true' : 'false');
      setEnableSync(newValue);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const etlCheckEnableSync = (): boolean => {
    if (!enableSync) {
      setShowEnableSyncWarning(true);
      return false;
    }
    return true;
  };

  const etlHandleSyncChanges = async () => {
    if (!etlCheckEnableSync()) return;
    try {
      setLoading(true);
      await etlApiService.queueJob('sync', ['delta']);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const etlHandleFullImport = async () => {
    try {
      setLoading(true);
      await etlApiService.truncateTables(['jira_issues', 'jira_sprints', 'jira_components', 'jira_releases', 'etl_jobs', 'issue_status_durations']);
      await etlApiService.queueJob('sync', ['full']);
      setConfirmFullImport(false);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const etlHandleDefaultBackfill = async () => {
    try {
      setLoading(true);
      await etlApiService.queueJob('backfill', [{ type: 'default', days: settings?.history_default_backfill_days || 30 }]);
      setConfirmDefaultBackfill(false);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const etlHandleDailyBackfill = async () => {
    if (dailyBackfillDays < 1 || dailyBackfillDays > 30) {
      alert(`Invalid number of days: ${dailyBackfillDays}. Must be between 1 and 30.`);
      return;
    }
    try {
      setLoading(true);
      await etlApiService.queueJob('backfill', [{ type: 'daily', days: dailyBackfillDays }]);
      setConfirmDailyBackfill(false);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const etlHandleResetJobs = async () => {
    try {
      setLoading(true);
      await etlApiService.resetJobsQueue();
      setConfirmResetJobs(false);
      onRefresh();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-6 overflow-auto bg-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sync & History</h1>
        <p className="text-sm text-gray-500 mt-1">Manage data synchronization operations</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Job Status - Spans 4 columns */}
        {jobStatus && (
          <div className="xl:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-5">
              <ETLJobStatus 
                jobStatus={jobStatus} 
                lastHistoryBackfill={settings?.history_last_backfill_timestamp || null}
                showHeader={true}
                refreshingStatus={refreshingStatus || false}
                onRefresh={onRefreshJobStatus}
              />
            </div>
          </div>
        )}

        {/* Data Sync Operations */}
        <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Data Sync</h3>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={etlHandleSyncChanges}
              disabled={loading || isJobRunning}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">⚡</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Sync Changes</div>
                <div className="text-xs text-gray-600">Incremental sync</div>
              </div>
            </button>

            <button
              onClick={() => { if (!etlCheckEnableSync()) return; setConfirmFullImport(true); }}
              disabled={loading || isJobRunning}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">💾</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Full Re-import</div>
                <div className="text-xs text-gray-600">Truncate & reload</div>
              </div>
            </button>
          </div>
        </div>

        {/* History Backfill */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">History Backfill</h3>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={() => { if (!etlCheckEnableSync()) return; setConfirmDailyBackfill(true); }}
              disabled={loading || isJobRunning}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all disabled:opacity-50"
            >
              <span className="text-2xl">📆</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Daily</div>
                <div className="text-xs text-gray-600">Custom days</div>
              </div>
            </button>

            <button
              onClick={() => { if (!etlCheckEnableSync()) return; setConfirmDefaultBackfill(true); }}
              disabled={loading || isJobRunning}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all disabled:opacity-50"
            >
              <span className="text-2xl">⏳</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Full</div>
                <div className="text-xs text-gray-600">{settings?.history_default_backfill_days || 30} days</div>
              </div>
            </button>
          </div>
        </div>

        {/* Management Panel with Enable Sync */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Management</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Enable Sync Toggle */}
            <button
              onClick={handleToggleEnableSync}
              disabled={loading}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${
                enableSync
                  ? 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{enableSync ? '🟢' : '⚪'}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Enable Sync</div>
                <div className="text-xs text-gray-600">{enableSync ? 'System is active' : 'System is paused'}</div>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-medium ${
                enableSync 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {enableSync ? 'Active' : 'Inactive'}
              </div>
            </button>

            {/* Reset Queue Button */}
            <button
              onClick={() => setConfirmResetJobs(true)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all disabled:opacity-50"
            >
              <span className="text-2xl">⚠️</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-gray-900">Reset Queue</div>
                <div className="text-xs text-gray-600">Clear jobs</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modals - Clean minimal design */}
      {confirmFullImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Confirm Full Import</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will <strong className="text-red-600">delete all</strong> existing data from relevant tables.
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleFullImport} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                Proceed
              </button>
              <button onClick={() => setConfirmFullImport(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDefaultBackfill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Confirm History Backfill</h3>
            <p className="text-sm text-gray-600 mb-6">
              Backfill history for <strong>{settings?.history_default_backfill_days || 30} days</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleDefaultBackfill} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">
                Start
              </button>
              <button onClick={() => setConfirmDefaultBackfill(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDailyBackfill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Daily History Backfill</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days (1-30):
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={dailyBackfillDays}
                onChange={(e) => setDailyBackfillDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={etlHandleDailyBackfill} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">
                Start
              </button>
              <button onClick={() => setConfirmDailyBackfill(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmResetJobs && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Reset Jobs Queue</h3>
            <p className="text-sm text-gray-600 mb-6">
              Delete all entries from the jobs table.
              {isJobRunning && <span className="block mt-2 text-red-600">Warning: A job is running!</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleResetJobs} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                Reset
              </button>
              <button onClick={() => setConfirmResetJobs(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnableSyncWarning && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">Sync Disabled</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enable sync in <strong>ETL Settings</strong> before running operations.
            </p>
            <button onClick={() => setShowEnableSyncWarning(false)} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
