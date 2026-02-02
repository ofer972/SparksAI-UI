'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { authFetch } from '@/lib/api';
import { useGitHubSettings } from '@/contexts/GitHubSettingsContext';
import GoalsConfirmationModal from '../pigoals/GoalsConfirmationModal';
import DataTable from '../DataTable';

interface GitHubSettings {
  github_enabled: string;
  github_token?: string;
  github_sync_interval_minutes?: string;
  github_sync_lookback_days?: string;
  github_sync_max_concurrent_repos?: string;
  github_available_repos_type?: string;
  github_deployments_enabled?: string;
}

interface RemoteRepository {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  updated_at: string;
  language: string;
  is_private: boolean;
  stars: number;
  open_issues: number;
  owner: {
    login: string;
    type: string;
  };
}

interface SyncedRepository {
  id: number;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  language?: string;
  last_synced_at?: string;
  pushed_at?: string;
  updated_at?: string;
}

export default function GitHubSettingsView() {
  const { refetch: refetchContextSettings } = useGitHubSettings();
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [syncInterval, setSyncInterval] = useState<number>(30);
  const [lookbackDays, setLookbackDays] = useState<number>(90);
  const [maxConcurrentRepos, setMaxConcurrentRepos] = useState<number>(2);
  const [availableReposType, setAvailableReposType] = useState<string>('all');
  const [deploymentsEnabled, setDeploymentsEnabled] = useState<boolean>(true);

  const MASK = '********';

  // Remote repositories state
  const [remoteRepos, setRemoteRepos] = useState<RemoteRepository[]>([]);
  const [syncedRepos, setSyncedRepos] = useState<SyncedRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedSyncedRepos, setSelectedSyncedRepos] = useState<Set<number>>(new Set());
  const [selectedAvailableRepos, setSelectedAvailableRepos] = useState<Set<string>>(new Set());
  const [repoActionMessage, setRepoActionMessage] = useState<string | null>(null);

  // Sync actions state
  const [showFullSyncConfirm, setShowFullSyncConfirm] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Store original values to track changes
  const originalValuesRef = useRef({
    githubEnabled: false,
    syncInterval: 30,
    lookbackDays: 90,
    maxConcurrentRepos: 2,
    availableReposType: 'all',
    deploymentsEnabled: true,
  });

  // Flag to prevent reloading when navigating back to tab (pattern from usePageSettings)
  const initialLoadDone = useRef(false);

  // Initialize API token mask if token exists
  useEffect(() => {
    if (settings?.github_token && !githubToken) {
      setGithubToken(MASK);
    }
  }, [settings?.github_token, githubToken]);

  useEffect(() => {
    fetchSettings();
    fetchRepositories();
  }, []);

  const fetchSettings = async () => {
    // Only load once - prevent reloading when navigating back to tab
    if (initialLoadDone.current) return;

    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/v1/github-service/settings');
      
      if (!response.ok) {
        throw new Error('Failed to load GitHub settings');
      }

      const data = await response.json();
      const enabled = data.settings.github_enabled === 'true';
      const syncIntervalValue = parseInt(data.settings.github_sync_interval_minutes || '30');
      const lookbackDaysValue = parseInt(data.settings.github_sync_lookback_days || '90');
      const maxConcurrentValue = parseInt(data.settings.github_sync_max_concurrent_repos || '2');
      const reposTypeValue = data.settings.github_available_repos_type || 'all';
      
      // Process deployments enabled setting (default to true if not set)
      const deploymentsEnabledValue = data.settings.github_deployments_enabled === 'true' || 
        data.settings.github_deployments_enabled === undefined;
      
      setSettings(data.settings);
      setGithubEnabled(enabled);
      setSyncInterval(syncIntervalValue);
      setLookbackDays(lookbackDaysValue);
      setMaxConcurrentRepos(maxConcurrentValue);
      setAvailableReposType(reposTypeValue);
      setDeploymentsEnabled(deploymentsEnabledValue);

      originalValuesRef.current = {
        githubEnabled: enabled,
        syncInterval: syncIntervalValue,
        lookbackDays: lookbackDaysValue,
        maxConcurrentRepos: maxConcurrentValue,
        availableReposType: reposTypeValue,
        deploymentsEnabled: deploymentsEnabledValue,
      };

      // Initialize token mask if token exists
      if (data.settings.github_token) {
        setGithubToken(MASK);
      }

      // Mark as loaded - won't reload when navigating back to tab
      initialLoadDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async () => {
    setLoadingRepos(true);
    setReposError(null);
    try {
      // Fetch both remote and synced repos in parallel
      const [remoteResponse, syncedResponse] = await Promise.all([
        authFetch('/api/v1/github-service/repositories/remote-list?limit=200'),
        authFetch('/api/v1/github-service/repositories'),
      ]);

      if (!remoteResponse.ok) {
        throw new Error('Failed to load remote repositories');
      }
      if (!syncedResponse.ok) {
        throw new Error('Failed to load synced repositories');
      }

      const remoteData = await remoteResponse.json();
      const syncedData = await syncedResponse.json();

      setRemoteRepos(remoteData.repositories || []);
      setSyncedRepos(syncedData || []);
    } catch (err) {
      setReposError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Filter available repos (exclude those already in database)
  const availableRepos = useMemo(() => {
    const syncedFullNames = new Set(syncedRepos.map(r => r.full_name));
    return remoteRepos
      .filter(remote => !syncedFullNames.has(remote.full_name))
      .sort((a, b) => {
        // Sort by updated_at desc (newest first)
        const aDate = new Date(a.updated_at).getTime();
        const bDate = new Date(b.updated_at).getTime();
        return bDate - aDate;
      });
  }, [remoteRepos, syncedRepos]);

  // Sort synced repos by last_synced_at desc
  const sortedSyncedRepos = useMemo(() => {
    return [...syncedRepos].sort((a, b) => {
      const aDate = a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0;
      const bDate = b.last_synced_at ? new Date(b.last_synced_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [syncedRepos]);

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectAllSynced = () => {
    if (selectedSyncedRepos.size === sortedSyncedRepos.length) {
      setSelectedSyncedRepos(new Set());
    } else {
      setSelectedSyncedRepos(new Set(sortedSyncedRepos.map(r => r.id)));
    }
  };

  const handleToggleSyncedRepo = (id: number) => {
    const newSelected = new Set(selectedSyncedRepos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSyncedRepos(newSelected);
  };

  const handleSelectAllAvailable = () => {
    if (selectedAvailableRepos.size === availableRepos.length) {
      setSelectedAvailableRepos(new Set());
    } else {
      setSelectedAvailableRepos(new Set(availableRepos.map(r => r.full_name)));
    }
  };

  const handleToggleAvailableRepo = (fullName: string) => {
    const newSelected = new Set(selectedAvailableRepos);
    if (newSelected.has(fullName)) {
      newSelected.delete(fullName);
    } else {
      newSelected.add(fullName);
    }
    setSelectedAvailableRepos(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedAvailableRepos.size === 0) {
      setRepoActionMessage('No repositories selected');
      setTimeout(() => setRepoActionMessage(null), 3000);
      return;
    }

    const toAdd = availableRepos.filter(r => selectedAvailableRepos.has(r.full_name));
    setLoadingRepos(true);
    setRepoActionMessage(null);

    try {
      const response = await authFetch('/api/v1/github-service/repositories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositories: toAdd.map(r => ({
            owner: r.owner.login,
            name: r.name,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add repositories');
      }

      const data = await response.json();
      const successCount = data.added?.length || 0;
      const failCount = data.failed?.length || 0;

      if (failCount === 0) {
        setRepoActionMessage(`Successfully added ${successCount} repository${successCount !== 1 ? 'ies' : ''}`);
      } else {
        setRepoActionMessage(`Added ${successCount}, failed ${failCount}`);
      }
    } catch (err) {
      setRepoActionMessage('Error adding repositories. Please try again.');
    }

    setLoadingRepos(false);
    setTimeout(() => setRepoActionMessage(null), 5000);
    setSelectedAvailableRepos(new Set());
    fetchRepositories();
  };

  const handleRemoveSelected = async () => {
    if (selectedSyncedRepos.size === 0) {
      setRepoActionMessage('No repositories selected');
      setTimeout(() => setRepoActionMessage(null), 3000);
      return;
    }

    const toRemove = sortedSyncedRepos.filter(r => selectedSyncedRepos.has(r.id));
    setLoadingRepos(true);
    setRepoActionMessage(null);
    let successCount = 0;
    let failCount = 0;

    for (const repo of toRemove) {
      try {
        const response = await authFetch(`/api/v1/github-service/repositories/${repo.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setLoadingRepos(false);
    if (failCount === 0) {
      setRepoActionMessage(`Successfully removed ${successCount} repository${successCount !== 1 ? 'ies' : ''}`);
    } else {
      setRepoActionMessage(`Removed ${successCount}, failed ${failCount}`);
    }
    setTimeout(() => setRepoActionMessage(null), 5000);
    setSelectedSyncedRepos(new Set());
    fetchRepositories();
  };

  // Check if any fields have changed
  const hasChanges = () => {
    const original = originalValuesRef.current;
    // Check if token was changed (not MASK and not empty)
    const tokenChanged = githubToken && githubToken !== MASK && githubToken !== '';
    return (
      githubEnabled !== original.githubEnabled ||
      syncInterval !== original.syncInterval ||
      lookbackDays !== original.lookbackDays ||
      maxConcurrentRepos !== original.maxConcurrentRepos ||
      availableReposType !== original.availableReposType ||
      deploymentsEnabled !== original.deploymentsEnabled ||
      tokenChanged
    );
  };

  const handleSave = async () => {
    // Validation
    if (syncInterval < 15 || syncInterval > 1440) {
      setError('Sync interval must be between 15 and 1440 minutes (15 min to 24 hours)');
      return;
    }
    if (lookbackDays < 7 || lookbackDays > 365) {
      setError('Lookback days must be between 7 and 365');
      return;
    }
    if (maxConcurrentRepos < 1 || maxConcurrentRepos > 10) {
      setError('Max concurrent repos must be between 1 and 10');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Build settings object with only changed values
      const settingsToUpdate: Record<string, string> = {};

      if (githubEnabled !== originalValuesRef.current.githubEnabled) {
        settingsToUpdate.github_enabled = githubEnabled ? 'true' : 'false';
      }
      if (syncInterval !== originalValuesRef.current.syncInterval) {
        settingsToUpdate.github_sync_interval_minutes = syncInterval.toString();
      }
      if (lookbackDays !== originalValuesRef.current.lookbackDays) {
        settingsToUpdate.github_sync_lookback_days = lookbackDays.toString();
      }
      if (maxConcurrentRepos !== originalValuesRef.current.maxConcurrentRepos) {
        settingsToUpdate.github_sync_max_concurrent_repos = maxConcurrentRepos.toString();
      }
      if (availableReposType !== originalValuesRef.current.availableReposType) {
        settingsToUpdate.github_available_repos_type = availableReposType;
      }
      if (deploymentsEnabled !== originalValuesRef.current.deploymentsEnabled) {
        settingsToUpdate.github_deployments_enabled = deploymentsEnabled ? 'true' : 'false';
      }
      // Only include token if it was changed by the user (not MASK and not empty)
      if (githubToken && githubToken !== MASK && githubToken !== '') {
        settingsToUpdate.github_token = githubToken;
      }

      // Batch update all changed settings in one request
      const response = await authFetch('/api/v1/github-service/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // After save, refresh settings from database to update the UI
      // Reset flag to allow refresh after save
      initialLoadDone.current = false;
      await fetchSettings();

      // Also refresh the context so navigation menu updates immediately
      await refetchContextSettings();

      // After save, update token state - if a token was sent, mark it as saved (show MASK)
      if (settingsToUpdate.github_token) {
        setGithubToken(MASK);
      }

      // Update original values after successful save
      originalValuesRef.current = {
        githubEnabled,
        syncInterval,
        lookbackDays,
        maxConcurrentRepos,
        availableReposType,
        deploymentsEnabled,
      };

      setSuccessMessage(
        `Settings saved successfully! Changes will take effect on the next sync cycle (within ${syncInterval} minutes).`
      );
      
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncDelta = async () => {
    try {
      setError(null);
      setSyncMessage(null);
      
      const response = await authFetch('/api/v1/github-service/sync/all', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSyncMessage('Successfully started delta sync');
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        setSyncMessage('Error starting sync. Please try again.');
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (error) {
      setSyncMessage('Error starting sync. Please try again.');
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const confirmFullSync = async () => {
    setShowFullSyncConfirm(false);
    try {
      setError(null);
      setSyncMessage(null);
      
      const response = await authFetch('/api/v1/github-service/sync/all?force_full=true', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSyncMessage('Successfully started full sync');
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        setSyncMessage('Error starting sync. Please try again.');
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (error) {
      setSyncMessage('Error starting sync. Please try again.');
      setTimeout(() => setSyncMessage(null), 5000);
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
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Token Missing Warning */}
      {!settings?.github_token && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <strong>Warning:</strong> GitHub API token is required. Please set it in the General Settings section below.
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
          {successMessage}
        </div>
      )}

      {/* Top Row: General Settings and Sync Configuration side by side */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* General Settings */}
        <div className="bg-surface-elevated border border-outline rounded-lg pt-4 pb-6 px-6">
          <h3 className="font-semibold mb-1">General Settings</h3>

          <div className="space-y-3">
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

            {/* GitHub API Token */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                GitHub API Token *:
              </label>
              <div className="flex-1">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="Enter GitHub personal access token"
                  className="w-full px-2 py-1.5 border border-outline rounded text-sm focus:ring-brand focus:border-brand"
                />
                {!settings?.github_token && (
                  <p className="text-xs text-red-600 mt-1">GitHub API token is required</p>
                )}
              </div>
            </div>

            {/* Repository Type */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Repository Type:
              </label>
              <div className="flex-1">
                <select
                  value={availableReposType}
                  onChange={(e) => setAvailableReposType(e.target.value)}
                  disabled={!githubEnabled}
                  className="w-full px-2 py-1.5 border border-outline rounded text-sm focus:ring-brand focus:border-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="all">All Repositories</option>
                  <option value="owner">My Repositories Only</option>
                  <option value="member">Organization Repositories</option>
                </select>
              </div>
            </div>

            {/* Sync Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSyncDelta}
                disabled={!githubEnabled}
                className="flex-1 px-2 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                🔄 Sync Delta
              </button>
              <button
                onClick={() => setShowFullSyncConfirm(true)}
                disabled={!githubEnabled}
                className="flex-1 px-2 py-1.5 text-sm bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                ⚡ Full Sync
              </button>
            </div>

            {/* Sync Message */}
            {syncMessage && (
              <div className={`p-3 rounded text-sm ${
                syncMessage.includes('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                {syncMessage}
              </div>
            )}
          </div>
        </div>

        {/* Sync Configuration */}
        <div className="bg-surface-elevated border border-outline rounded-lg pt-4 pb-6 px-6">
          <h3 className="font-semibold mb-1">Sync Configuration</h3>

          <div className="space-y-3">
            {/* Sync Interval */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Sync Interval (minutes):
              </label>
              <div className="flex-1 flex items-center space-x-3">
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                  disabled={!githubEnabled}
                  className="w-20 px-2 py-1.5 border border-outline rounded text-sm focus:ring-brand focus:border-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-content-tertiary">
                  How often to sync data from GitHub. Lower values provide fresher data but increase API usage.
                </span>
              </div>
            </div>

            {/* Lookback Days */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Lookback Days:
              </label>
              <div className="flex-1 flex items-center space-x-3">
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(parseInt(e.target.value) || 90)}
                  disabled={!githubEnabled}
                  className="w-20 px-2 py-1.5 border border-outline rounded text-sm focus:ring-brand focus:border-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-content-tertiary">
                  How many days back to sync historical data. Longer periods provide more context but take longer to sync initially.
                </span>
              </div>
            </div>

            {/* Max Concurrent Repos */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Max Concurrent Repos:
              </label>
              <div className="flex-1 flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxConcurrentRepos}
                  onChange={(e) => setMaxConcurrentRepos(parseInt(e.target.value) || 2)}
                  disabled={!githubEnabled}
                  className="w-20 px-2 py-1.5 border border-outline rounded text-sm focus:ring-brand focus:border-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-content-tertiary">
                  Maximum repositories to sync simultaneously. Higher values sync faster but use more API rate limits.
                </span>
              </div>
            </div>

            {/* Deployments Enabled */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
                Deployments are in GitHub:
              </label>
              <div className="flex-1 flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deploymentsEnabled}
                    onChange={(e) => setDeploymentsEnabled(e.target.checked)}
                    disabled={!githubEnabled}
                    className="w-4 h-4 text-brand border-outline rounded focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-content-secondary">
                    {deploymentsEnabled ? 'Enabled - Deployment sync is active' : 'Disabled - Deployment sync is skipped'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-start gap-2 mb-6">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : '💾 Save'}
        </button>
        {!hasChanges() && (
          <p className="text-xs text-content-tertiary self-center ml-2">
            No changes to save. Settings are already saved.
          </p>
        )}
      </div>

      {/* Repository Management */}
      <div className="bg-surface-elevated border border-outline rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Repository Management</h3>
          <button
            onClick={fetchRepositories}
            disabled={loadingRepos}
            className="text-sm px-3 py-1 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
          >
            🔄 Refresh
          </button>
        </div>

        {repoActionMessage && (
          <div className={`mb-4 p-3 rounded text-sm ${
            repoActionMessage.includes('failed') || repoActionMessage.includes('No ')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {repoActionMessage}
          </div>
        )}

        {reposError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {reposError}
          </div>
        )}

        {/* Two Tables Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Repositories to Sync (saved in database) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-sm">
                Repositories to Sync (saved in database) ({sortedSyncedRepos.length})
              </h4>
              <button
                onClick={handleRemoveSelected}
                disabled={loadingRepos || selectedSyncedRepos.size === 0}
                className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Remove Selected ({selectedSyncedRepos.size})
              </button>
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSyncedRepos.size === sortedSyncedRepos.length && sortedSyncedRepos.length > 0}
                  onChange={handleSelectAllSynced}
                  className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                />
                <span className="text-xs text-content-secondary">Select All</span>
              </label>
            </div>
            <div style={{ maxHeight: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <DataTable
                data={sortedSyncedRepos}
                loading={loadingRepos}
                error={null}
                emptyMessage="No repositories in database"
                rowKey={(row) => row.id}
                className="h-full"
                columns={[
                {
                  key: 'checkbox',
                  label: '',
                  align: 'left',
                  sortable: false,
                  width: '50px',
                  render: (_, row) => (
                    <input
                      type="checkbox"
                      checked={selectedSyncedRepos.has(row.id)}
                      onChange={() => handleToggleSyncedRepo(row.id)}
                      className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                    />
                  ),
                },
                {
                  key: 'name',
                  label: 'Repository',
                  align: 'left',
                  sortable: false,
                  render: (_, row) => (
                    <div className="font-medium">{row.name}</div>
                  ),
                },
                {
                  key: 'owner',
                  label: 'Owner',
                  align: 'left',
                  sortable: false,
                },
                {
                  key: 'language',
                  label: 'Language',
                  align: 'left',
                  sortable: false,
                  render: (value) => value || '-',
                },
                {
                  key: 'last_synced_at',
                  label: 'Last Synced',
                  align: 'left',
                  sortable: false,
                  render: (value) => formatDate(value),
                },
              ]}
              />
            </div>
          </div>

          {/* Right: Available Repositories (on remote) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-sm">
                Available Repositories (on remote) ({availableRepos.length})
              </h4>
              <button
                onClick={handleAddSelected}
                disabled={loadingRepos || selectedAvailableRepos.size === 0}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Selected ({selectedAvailableRepos.size})
              </button>
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAvailableRepos.size === availableRepos.length && availableRepos.length > 0}
                  onChange={handleSelectAllAvailable}
                  className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                />
                <span className="text-xs text-content-secondary">Select All</span>
              </label>
            </div>
            <div style={{ maxHeight: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <DataTable
                data={availableRepos}
                loading={loadingRepos}
                error={null}
                emptyMessage="No available repositories"
                rowKey={(row) => row.full_name}
                className="h-full"
                columns={[
                {
                  key: 'checkbox',
                  label: '',
                  align: 'left',
                  sortable: false,
                  width: '50px',
                  render: (_, row) => (
                    <input
                      type="checkbox"
                      checked={selectedAvailableRepos.has(row.full_name)}
                      onChange={() => handleToggleAvailableRepo(row.full_name)}
                      className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                    />
                  ),
                },
                {
                  key: 'name',
                  label: 'Repository',
                  align: 'left',
                  sortable: false,
                  render: (_, row) => (
                    <div>
                      <a
                        href={row.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        {row.name}
                      </a>
                    </div>
                  ),
                },
                {
                  key: 'owner',
                  label: 'Owner',
                  align: 'left',
                  sortable: false,
                  render: (_, row) => row.owner.login,
                },
                {
                  key: 'language',
                  label: 'Language',
                  align: 'left',
                  sortable: false,
                  render: (value) => value || '-',
                },
                {
                  key: 'updated_at',
                  label: 'Last Updated',
                  align: 'left',
                  sortable: false,
                  render: (value) => formatDate(value),
                },
              ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Sync Confirmation Modal */}
      <GoalsConfirmationModal
        isOpen={showFullSyncConfirm}
        onClose={() => setShowFullSyncConfirm(false)}
        onConfirm={confirmFullSync}
        title="Confirm Full Sync"
        message="This will re-sync all data from GitHub, ignoring the last sync timestamp. This may take several minutes and will increase API usage. Are you sure?"
        confirmButtonText="Full Sync"
        variant="info"
      />
    </div>
  );
}
