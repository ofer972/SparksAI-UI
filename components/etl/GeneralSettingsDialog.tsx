'use client';

import { useState } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface GeneralSettingsDialogProps {
  settings: ETLSettings;
  onClose: () => void;
  onSaved: () => void;
}

export default function GeneralSettingsDialog({ settings, onClose, onSaved }: GeneralSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodicSyncMinutes, setPeriodicSyncMinutes] = useState(settings.periodic_sync_of_data_minutes || 60);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsUpdate: { [key: string]: any } = {
        periodic_sync_of_data_minutes: periodicSyncMinutes,
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
            <h2 className="text-xl font-semibold">⚙️ General Settings</h2>
            <button
              onClick={onClose}
              className="text-content-tertiary hover:text-content-secondary text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-2">
                Periodic Sync Interval (minutes)
              </label>
              <input
                type="number"
                value={periodicSyncMinutes}
                onChange={(e) => setPeriodicSyncMinutes(parseInt(e.target.value) || 60)}
                min="1"
                className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
              <p className="text-xs text-content-tertiary mt-1">How often to automatically sync data (in minutes)</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-outline flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : '💾 Save'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-content-secondary rounded hover:bg-gray-400"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

