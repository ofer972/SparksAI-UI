'use client';

import { useState, useEffect } from 'react';
import { etlApiService, JiraConfigCheckResult } from '@/lib/etl';

export interface UseJiraConfigurationCheckReturn {
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  backendAvailable: boolean;
  configData?: JiraConfigCheckResult['data'];
}

export function useJiraConfigurationCheck(): UseJiraConfigurationCheckReturn {
  const [isConfigured, setIsConfigured] = useState<boolean>(true); // Default to true to avoid blocking
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [configData, setConfigData] = useState<JiraConfigCheckResult['data'] | undefined>(undefined);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await etlApiService.checkJiraConfiguration();
        
        setBackendAvailable(result.backendAvailable);
        setIsConfigured(result.configured);
        setConfigData(result.data);
        
        if (result.error) {
          setError(result.error);
        }
      } catch (err: any) {
        // On error, treat as configured to avoid blocking UI
        setIsConfigured(true);
        setBackendAvailable(false);
        setError(err.message || 'Failed to check JIRA configuration');
      } finally {
        setIsLoading(false);
      }
    };

    checkConfiguration();
  }, []);

  return {
    isConfigured,
    isLoading,
    error,
    backendAvailable,
    configData,
  };
}

