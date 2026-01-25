'use client';

import { Job } from '@/lib/etl';

interface ETLJobStatusProps {
  jobStatus: { current_job: Job | null; last_finished_job: Job | null } | null;
  lastHistoryBackfill: string | null;
  showHeader?: boolean;
  refreshingStatus?: boolean;
  onRefresh?: () => void;
}

export default function ETLJobStatus({ 
  jobStatus, 
  lastHistoryBackfill,
  showHeader = false,
  refreshingStatus = false,
  onRefresh
}: ETLJobStatusProps) {
  const renderContent = () => {
    if (!jobStatus) {
      return <div className="text-content-secondary">Loading status...</div>;
    }

    const { current_job, last_finished_job } = jobStatus;

    if (current_job) {
    const progress = current_job.progress_details;
    const progressPercent = progress.progress_percent || 0;
    const isStale = progress.last_update
      ? (Date.now() - new Date(progress.last_update).getTime()) > 300000 // 5 minutes
      : false;

      return (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isStale ? (
                <span className="text-content-tertiary font-semibold">⏳ Stale</span>
              ) : current_job.status === 'RUNNING' ? (
                <span className="text-brand font-semibold">⚙️ Running</span>
              ) : (
                <span className="text-content-secondary font-semibold">⏳ Queued</span>
              )}
              <span className="text-sm text-content-secondary">
                {current_job.job_type} (ID: ...{current_job.job_id.slice(-8)})
              </span>
            </div>
          </div>

          <div className="mb-2">
            <div className="w-full bg-surface-secondary rounded-full h-2.5">
              <div
                className="bg-brand h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent * 100))}%` }}
              />
            </div>
          </div>

          <div className="text-sm text-content-secondary mb-2">{progress.message}</div>

          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-content-secondary">
            {typeof progress.processed_count === 'number' && (
              <span>Processed: {progress.processed_count.toLocaleString()}</span>
            )}
            {typeof progress.upserted_count === 'number' && (
              <span>Upserted: {progress.upserted_count.toLocaleString()}</span>
            )}
            {progress.total_expected && progress.total_expected !== '?' && (
              <span>Total Est: {progress.total_expected}</span>
            )}
            {typeof progress.api_calls === 'number' && (
              <span>API Calls: {progress.api_calls.toLocaleString()}</span>
            )}
            {progress.last_update && (
              <span>
                Last Update: {new Date(progress.last_update).toLocaleTimeString()}
              </span>
            )}
          </div>
        </>
      );
    }

    if (last_finished_job) {
    const isSuccess = last_finished_job.status === 'COMPLETED';
    const finishedTime = last_finished_job.completed_at
      ? (() => {
          const date = new Date(last_finished_job.completed_at);
          const day = date.getDate();
          const month = date.toLocaleString('en-US', { month: 'long' });
          const year = date.getFullYear();
          const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          return `${day} ${month} ${year} ${time}`;
        })()
      : 'Unknown';

      return (
        <>
          <div className={`flex items-center gap-2 mb-2 ${isSuccess ? 'text-positive-text' : 'text-danger-text'}`}>
            <span className="font-semibold">{isSuccess ? '✅' : '❌'}</span>
            <span className="font-semibold">
              Last job ({last_finished_job.job_type}) {isSuccess ? 'completed' : 'failed'} at; &nbsp;&nbsp;{finishedTime}
            </span>
          </div>
          {last_finished_job.error_details && (
            <div className="mt-2 p-2 bg-danger-bg border border-danger-border rounded text-sm text-danger-text">
              {last_finished_job.error_details.substring(0, 200)}
            </div>
          )}
        </>
      );
    }

    return <div className="text-content-secondary">System Idle. Ready to start.</div>;
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm p-4">
      {showHeader && (
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-content-primary">Data Sync Job Status</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshingStatus}
              className="px-2.5 py-1 bg-brand text-content-primary text-xs rounded hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span className={refreshingStatus ? 'animate-spin' : ''}>🔄</span>
              <span>Refresh</span>
            </button>
          )}
        </div>
      )}
      {renderContent()}
    </div>
  );
}

