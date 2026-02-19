'use client';

import { useState, useEffect } from 'react';
import { ETLSettings, Job, etlApiService } from '@/lib/etl';
import ETLJobStatus from './ETLJobStatus';

interface ETLDashboardProps {
  settings: ETLSettings | null;
  jobStatus: { current_job: Job | null; last_finished_job: Job | null } | null;
  customFields: { [field_id: string]: string };
  refreshingStatus: boolean;
  onRefreshJobStatus: () => void;
  onShowETLSettings: () => void;
  onShowETLSyncActions: () => void;
}

function etlGetFieldDisplayName(fieldId: string | null | undefined, customFields: { [field_id: string]: string }): string {
  if (!fieldId) return 'Not Set';
  if (fieldId === 'sprint') return 'Sprint (System Default)';
  if (fieldId === 'duedate') return 'Due Date (System Default)';
  const fieldName = customFields?.[fieldId];
  return fieldName ? `${fieldName} (${fieldId})` : fieldId;
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid';
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day} ${month} ${year} ${time}`;
  } catch {
    return 'Error';
  }
}

export default function ETLDashboard({
  settings,
  jobStatus,
  customFields,
  refreshingStatus,
  onRefreshJobStatus,
}: ETLDashboardProps) {
  const [confirmFullImport, setConfirmFullImport] = useState(false);
  const [confirmDefaultBackfill, setConfirmDefaultBackfill] = useState(false);
  const [confirmDailyBackfill, setConfirmDailyBackfill] = useState(false);
  const [confirmResetJobs, setConfirmResetJobs] = useState(false);
  const [showEnableSyncWarning, setShowEnableSyncWarning] = useState(false);
  const [dailyBackfillDays, setDailyBackfillDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resettingQueue, setResettingQueue] = useState(false);

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

  const getEnableSync = (): boolean => {
    if (!settings) return false;
    if (typeof settings.enable_sync === 'boolean') return settings.enable_sync;
    if (typeof settings.enable_sync === 'string') {
      const normalized = settings.enable_sync.toLowerCase().trim();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  };

  const etlCheckEnableSync = (): boolean => {
    if (!getEnableSync()) {
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
      onRefreshJobStatus();
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
      onRefreshJobStatus();
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
      onRefreshJobStatus();
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
      onRefreshJobStatus();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetQueueClick = () => {
    setConfirmResetJobs(true);
  };

  const etlHandleResetJobs = async () => {
    try {
      setResettingQueue(true);
      await etlApiService.resetJobsQueue();
      setConfirmResetJobs(false);
      onRefreshJobStatus();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setResettingQueue(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-surface">
      {/* Content - scrolls within parent on mobile */}
      <div className="flex-1 min-h-0 p-4 sm:p-6">
        <div className="h-full flex flex-col gap-6">
          {/* Job Status & History - Side by Side */}
          <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-stretch">
            {/* Left: Job Status */}
            <div className="flex-shrink-0 h-full">
              <ETLJobStatus 
                jobStatus={jobStatus} 
                lastHistoryBackfill={settings?.history_last_backfill_timestamp || null}
                showHeader={true}
                refreshingStatus={refreshingStatus}
                onRefresh={onRefreshJobStatus}
                onResetQueue={handleResetQueueClick}
                resettingQueue={resettingQueue}
              />
            </div>

            {/* Right: Last Sync Issue / History */}
            <div className="flex-shrink-0 bg-surface rounded-lg shadow-sm border border-outline p-4 h-full">
              <h3 className="text-sm font-semibold text-content-primary mb-3">Last Sync Issue / History</h3>
              <div className="space-y-3">
                {settings?.periodic_sync_of_data_minutes && (
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-xs font-bold text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Sync Data period:</span>
                    <span className="text-xs font-bold text-brand">
                      {settings.periodic_sync_of_data_minutes} minutes
                    </span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Last Sync Issues:</span>
                  <span className="text-xs text-brand">
                    {formatDate(settings?.last_import_timestamp || null)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Last History Backfill:</span>
                  <span className="text-xs text-brand">
                    {formatDate(settings?.history_last_backfill_timestamp || null)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Sync Actions */}
          <div className="flex-shrink-0 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Data Sync Operations */}
            <div className="bg-surface rounded-lg shadow-sm border border-outline">
              <div className="px-5 py-4 border-b border-outline">
                <h3 className="text-base font-semibold text-content-primary">Data Sync</h3>
              </div>
              <div className="p-5 space-y-3">
                <button
                  onClick={etlHandleSyncChanges}
                  disabled={loading || isJobRunning}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-brand/30 bg-brand/10 hover:bg-brand/20 hover:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">⚡</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-content-primary">Sync Changes</div>
                    <div className="text-xs text-content-secondary">Incremental sync</div>
                  </div>
                </button>

                <button
                  onClick={() => { if (!etlCheckEnableSync()) return; setConfirmFullImport(true); }}
                  disabled={loading || isJobRunning}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-danger-border bg-danger-bg hover:bg-danger-bg/80 hover:border-danger-border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">💾</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-content-primary">Full Re-import</div>
                    <div className="text-xs text-content-secondary">Truncate & reload</div>
                  </div>
                </button>
              </div>
            </div>

            {/* History Backfill */}
            <div className="bg-surface rounded-lg shadow-sm border border-outline">
              <div className="px-5 py-4 border-b border-outline">
                <h3 className="text-base font-semibold text-content-primary">History Backfill</h3>
              </div>
              <div className="p-5 space-y-3">
                <button
                  onClick={() => { if (!etlCheckEnableSync()) return; setConfirmDailyBackfill(true); }}
                  disabled={loading || isJobRunning}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-brand/30 bg-brand/10 hover:bg-brand/20 hover:border-brand/50 transition-all disabled:opacity-50"
                >
                  <span className="text-2xl">📆</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-content-primary">Daily</div>
                    <div className="text-xs text-content-secondary">Custom days</div>
                  </div>
                </button>

                <button
                  onClick={() => { if (!etlCheckEnableSync()) return; setConfirmDefaultBackfill(true); }}
                  disabled={loading || isJobRunning}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-danger-border bg-danger-bg hover:bg-danger-bg/80 hover:border-danger-border transition-all disabled:opacity-50"
                >
                  <span className="text-2xl">⏳</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-content-primary">Full</div>
                    <div className="text-xs text-content-secondary">{settings?.history_default_backfill_days || 30} days</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Project Keys & Fields */}
          <div className="flex-1 bg-surface rounded-lg shadow-sm border border-outline p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-content-primary mb-3">Project Keys & Fields</h3>
            <div className="space-y-3">
              {/* Selected Project Keys */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Project Keys:</span>
                <span className="text-xs text-brand">
                  {settings?.selected_project_keys && settings.selected_project_keys.length > 0
                    ? settings.selected_project_keys.join(', ')
                    : 'None (All projects will be synced)'}
                </span>
              </div>

              {/* JQL Scope */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">JQL Scope:</span>
                <span className="text-xs text-brand">
                  {((settings as any)?.jql_scope && String((settings as any).jql_scope).trim()) 
                    ? String((settings as any).jql_scope) 
                    : 'None'}
                </span>
              </div>

              {/* Field IDs */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected PI Custom Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_pi_custom_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Sprint Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_sprint_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Sizing Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_sizing_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Team Name Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_team_name_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Flagged Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_flagged_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Epic Target Completion Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_epic_target_completion_field_id, customFields)}</span>
              </div>

              {/* Selected Custom Fields */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-content-secondary w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Custom Fields:</span>
                <div className="space-y-1">
                  {settings?.selected_custom_fields && settings.selected_custom_fields.length > 0
                    ? settings.selected_custom_fields.map(id => {
                        const fieldName = customFields[id];
                        const displayText = fieldName ? `${fieldName} (${id})` : id;
                        return (
                          <div key={id} className="text-xs text-brand">
                            {displayText}
                          </div>
                        );
                      })
                    : <span className="text-xs text-brand">None</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {confirmFullImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-3 text-content-primary">Confirm Full Import</h3>
            <p className="text-sm text-content-secondary mb-6">
              This will <strong className="text-danger-text">delete all</strong> existing data from relevant tables.
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleFullImport} className="flex-1 px-4 py-2 bg-danger-text text-content-primary rounded-lg hover:opacity-90 font-medium">
                Proceed
              </button>
              <button onClick={() => setConfirmFullImport(false)} className="flex-1 px-4 py-2 bg-surface-elevated text-content-secondary rounded-lg hover:bg-surface-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDefaultBackfill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-3 text-content-primary">Confirm History Backfill</h3>
            <p className="text-sm text-content-secondary mb-6">
              Backfill history for <strong>{settings?.history_default_backfill_days || 30} days</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleDefaultBackfill} className="flex-1 px-4 py-2 bg-brand text-content-primary rounded-lg hover:bg-brand-hover font-medium">
                Start
              </button>
              <button onClick={() => setConfirmDefaultBackfill(false)} className="flex-1 px-4 py-2 bg-surface-elevated text-content-secondary rounded-lg hover:bg-surface-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDailyBackfill && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-4 text-content-primary">Daily History Backfill</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Days (1-30):
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={dailyBackfillDays}
                onChange={(e) => setDailyBackfillDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={etlHandleDailyBackfill} className="flex-1 px-4 py-2 bg-brand text-content-primary rounded-lg hover:bg-brand-hover font-medium">
                Start
              </button>
              <button onClick={() => setConfirmDailyBackfill(false)} className="flex-1 px-4 py-2 bg-surface-elevated text-content-secondary rounded-lg hover:bg-surface-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmResetJobs && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-3 text-content-primary">Reset Jobs Queue</h3>
            <p className="text-sm text-content-secondary mb-6">
              Delete all entries from the jobs table.
              {isJobRunning && <span className="block mt-2 text-danger-text">Warning: A job is running!</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={etlHandleResetJobs} className="flex-1 px-4 py-2 bg-danger-text text-content-primary rounded-lg hover:opacity-90 font-medium">
                Reset
              </button>
              <button onClick={() => setConfirmResetJobs(false)} className="flex-1 px-4 py-2 bg-surface-elevated text-content-secondary rounded-lg hover:bg-surface-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnableSyncWarning && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-3 text-content-primary">Sync Disabled</h3>
            <p className="text-sm text-content-secondary mb-6">
              Enable sync in the <strong>Connection</strong> tab before running operations.
            </p>
            <button onClick={() => setShowEnableSyncWarning(false)} className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover font-medium">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
