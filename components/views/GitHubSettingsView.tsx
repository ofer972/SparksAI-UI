'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/api';

interface GitHubSettings {
  github_enabled: string;
}

export default function GitHubSettingsView() {
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [githubEnabled, setGithubEnabled] = useState(false);

  // Store original values to track changes
  const originalValuesRef = useRef({
    githubEnabled: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/v1/github-service/settings');
      
      if (!response.ok) {
        throw new Error('Failed to load GitHub settings');
      }

      const data = await response.json();
      const enabled = data.settings.github_enabled === 'true';
      
      setSettings(data.settings);
      setGithubEnabled(enabled);
      originalValuesRef.current = {
        githubEnabled: enabled,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Check if any fields have changed
  const hasChanges = () => {
    const original = originalValuesRef.current;
    return githubEnabled !== original.githubEnabled;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await authFetch('/api/v1/github-service/settings/github_enabled', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_value: githubEnabled ? 'true' : 'false',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Update original values after successful save
      originalValuesRef.current = {
        githubEnabled: githubEnabled,
      };

      setSuccessMessage('GitHub settings saved successfully! Please refresh the page to see changes.');
      
      // Clear success message after 5 seconds (longer since user needs to read it)
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-content-secondary">Loading GitHub settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface p-6 overflow-auto">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6 text-content-primary">GitHub Settings</h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-surface-elevated border border-outline rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-2">General Settings</h3>
          <p className="text-sm text-content-secondary mb-4">
            Configure GitHub integration settings.
          </p>

          <div className="space-y-4">
            {/* Enable GitHub Integration */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Enable GitHub Integration:
              </label>
              <div className="flex-1 flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={githubEnabled}
                    onChange={(e) => setGithubEnabled(e.target.checked)}
                    className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                  />
                  <span className="text-sm text-content-secondary">
                    {githubEnabled ? 'Enabled - Sync operations are active' : 'Disabled - Sync operations are paused'}
                  </span>
                </label>
              </div>
            </div>

            <div className="text-sm text-content-tertiary pl-0 sm:pl-48">
              When disabled, all GitHub sync operations will be paused. Existing data will remain accessible.
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-start gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
        
        {!hasChanges() && (
          <p className="text-xs text-content-tertiary mt-2">
            No changes to save. Settings are already saved.
          </p>
        )}
      </div>
    </div>
  );
}
