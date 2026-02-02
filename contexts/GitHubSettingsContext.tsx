'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authFetch } from '@/lib/api';

interface GitHubSettings {
  github_enabled: string;
  github_deployments_enabled?: string;
}

interface GitHubSettingsContextType {
  settings: GitHubSettings | null;
  loading: boolean;
  error: string | null;
  isDORAEnabled: () => boolean;
  refetch: () => Promise<void>;
}

const GitHubSettingsContext = createContext<GitHubSettingsContextType | undefined>(undefined);

export function GitHubSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch('/api/v1/github-service/settings');
      
      if (!response.ok) {
        throw new Error('Failed to load GitHub settings');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load GitHub settings';
      setError(errorMessage);
      console.error('Error fetching GitHub settings:', errorMessage);
      
      // If settings fetch fails, assume disabled (fail closed - service is down)
      setSettings({ github_enabled: 'false' });
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - function is stable

  useEffect(() => {
    // Fetch settings ONCE on mount
    fetchSettings();
  }, [fetchSettings]); // Only depends on fetchSettings which is stable

  const isDORAEnabled = () => {
    // If loading or error, assume disabled (fail closed)
    if (loading || !settings) {
      return false;
    }
    
    // Both must be enabled for DORA to be available
    const githubEnabled = settings.github_enabled === 'true';
    // Default to true if not set (backward compatibility for existing installations)
    const deploymentsEnabled = settings.github_deployments_enabled !== 'false';
    
    return githubEnabled && deploymentsEnabled;
  };

  return (
    <GitHubSettingsContext.Provider value={{ settings, loading, error, isDORAEnabled, refetch: fetchSettings }}>
      {children}
    </GitHubSettingsContext.Provider>
  );
}

export function useGitHubSettings() {
  const context = useContext(GitHubSettingsContext);
  if (context === undefined) {
    throw new Error('useGitHubSettings must be used within a GitHubSettingsProvider');
  }
  return context;
}

