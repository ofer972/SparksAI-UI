'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authFetch } from '@/lib/api';

interface GitHubSettings {
  github_enabled: string;
}

interface GitHubSettingsContextType {
  settings: GitHubSettings | null;
  loading: boolean;
  error: string | null;
  isDORAEnabled: () => boolean;
}

const GitHubSettingsContext = createContext<GitHubSettingsContextType | undefined>(undefined);

export function GitHubSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GitHubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch settings ONCE on mount
    fetchSettings();
  }, []); // Empty deps = only once on startup

  const fetchSettings = async () => {
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
  };

  const isDORAEnabled = () => {
    // If loading or error, assume disabled (fail closed)
    if (loading || !settings) {
      return false;
    }
    return settings.github_enabled === 'true';
  };

  return (
    <GitHubSettingsContext.Provider value={{ settings, loading, error, isDORAEnabled }}>
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

