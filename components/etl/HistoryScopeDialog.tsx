'use client';

import { useState } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface HistoryScopeDialogProps {
  settings: ETLSettings;
  onClose: () => void;
  onSaved: () => void;
}

export default function HistoryScopeDialog({ settings, onClose, onSaved }: HistoryScopeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRetention, setHistoryRetention] = useState<number>(settings.history_retention_months);
  const [defaultBackfillDays, setDefaultBackfillDays] = useState<number>(settings.history_default_backfill_days);
  const [etlStartMonthsBack, setEtlStartMonthsBack] = useState<number>(settings.etl_start_months_back);
  const [periodicSyncOfDataMinutes, setPeriodicSyncOfDataMinutes] = useState<number>(
    settings.periodic_sync_of_data_minutes || 60
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsUpdate: { [key: string]: any } = {
        history_retention_months: historyRetention.toString(),
        history_default_backfill_days: defaultBackfillDays.toString(),
        etl_start_months_back: etlStartMonthsBack.toString(),
        periodic_sync_of_data_minutes: periodicSyncOfDataMinutes.toString(),
      };

      await etlApiService.updateSettings(settingsUpdate);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-outline">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">📊 Sync Scope and History Days</h2>
            <button
              onClick={onClose}
              className="text-content-tertiary hover:text-content-secondary text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-danger-bg border border-danger-border rounded text-danger-text">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                History Retention Period (Months):
              </label>
              <input
                type="number"
                min="1"
                value={historyRetention}
                onChange={(e) => setHistoryRetention(parseInt(e.target.value) || 6)}
                className="flex-1 border border-outline rounded px-3 py-2"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
              Snapshots older than this will be automatically deleted.
            </p>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Default History Backfill Depth (Days):
              </label>
              <input
                type="number"
                min="1"
                max="730"
                value={defaultBackfillDays}
                onChange={(e) => setDefaultBackfillDays(parseInt(e.target.value) || 30)}
                className="flex-1 border border-outline rounded px-3 py-2"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
              Default number of days to backfill issue history.
            </p>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Global Sync Lookback (Months):
              </label>
              <input
                type="number"
                min="1"
                value={etlStartMonthsBack}
                onChange={(e) => setEtlStartMonthsBack(parseInt(e.target.value) || 9)}
                className="flex-1 border border-outline rounded px-3 py-2"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
              Sync issues CREATED or UPDATED within this period from today.
            </p>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Periodic Sync of Data (Minutes):
              </label>
              <input
                type="number"
                min="1"
                value={periodicSyncOfDataMinutes}
                onChange={(e) => setPeriodicSyncOfDataMinutes(parseInt(e.target.value) || 60)}
                className="flex-1 border border-outline rounded px-3 py-2"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
              Sync Issues/Sprint/Projects etc that were updated since last sync.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-outline flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-brand text-content-primary rounded hover:bg-brand-hover disabled:bg-surface-elevated"
          >
            {loading ? 'Saving...' : '💾 Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-elevated text-content-secondary rounded hover:bg-surface-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

