'use client';

import { useState, useEffect } from 'react';
import { etlApiService, ETLSettings, Job } from '@/lib/etl';

export interface UseETLReturn {
  // State
  settings: ETLSettings | null;
  jobStatus: { current_job: Job | null; last_finished_job: Job | null } | null;
  customFields: { [field_id: string]: string };
  loading: boolean;
  error: string | null;
  waitingForBackend: boolean;
  refreshingStatus: boolean;

  // Functions
  etlLoadData: () => Promise<void>;
  etlRefreshJobStatus: () => Promise<void>;
  etlHandleSettingsSaved: () => void;
}

export function useETL(): UseETLReturn {
  const [settings, setSettings] = useState<ETLSettings | null>(null);
  const [jobStatus, setJobStatus] = useState<{ current_job: Job | null; last_finished_job: Job | null } | null>(null);
  const [customFields, setCustomFields] = useState<{ [field_id: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waitingForBackend, setWaitingForBackend] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const etlLoadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use allSettled to make custom fields non-blocking
      const [settingsResult, jobStatusResult, fieldsResult] = await Promise.allSettled([
        etlApiService.getSettings(),
        etlApiService.getJobStatus(),
        etlApiService.getJIRACustomFields(),
      ]);
      
      // Check if required data (settings, jobStatus) failed
      if (settingsResult.status === 'rejected') {
        throw new Error(settingsResult.reason?.message || 'Failed to load settings');
      }
      if (jobStatusResult.status === 'rejected') {
        throw new Error(jobStatusResult.reason?.message || 'Failed to load job status');
      }
      
      // Set required data
      const settingsData = settingsResult.value;
      const jobStatusData = jobStatusResult.value;
      console.log('Settings data received:', settingsData);
      console.log('History last backfill timestamp:', settingsData?.history_last_backfill_timestamp);
      setSettings(settingsData);
      setJobStatus(jobStatusData);
      
      // Custom fields is optional - if it fails, set to empty object and continue
      if (fieldsResult.status === 'fulfilled') {
        setCustomFields(fieldsResult.value);
      } else {
        console.warn('Failed to load custom fields (non-blocking):', fieldsResult.reason);
        setCustomFields({}); // Set to empty object, don't block
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const etlRefreshJobStatus = async () => {
    try {
      setRefreshingStatus(true);
      // Fetch both job status and settings in one refresh to get all three timestamps
      const [jobStatusData, settingsData] = await Promise.all([
        etlApiService.getJobStatus(),
        etlApiService.getSettings(),
      ]);
      setJobStatus(jobStatusData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading job status:', err);
    } finally {
      setRefreshingStatus(false);
    }
  };

  const etlHandleSettingsSaved = () => {
    etlLoadData();
  };

  // Wait for backend to be available before loading data
  useEffect(() => {
    const etlInitialize = async () => {
      try {
        console.log("🚀 Starting ETL Module");
        console.log("   Checking backend availability...");
        
        // Simple health check with retry
        let retries = 3;
        let available = false;
        while (retries > 0 && !available) {
          available = await etlApiService.checkHealth();
          if (!available) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
          }
        }
        
        setWaitingForBackend(false);
        if (available) {
          etlLoadData();
        } else {
          setError('ETL backend is not available');
        }
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to connect to backend');
        setWaitingForBackend(false);
      }
    };

    etlInitialize();
  }, []);

  return {
    // State
    settings,
    jobStatus,
    customFields,
    loading,
    error,
    waitingForBackend,
    refreshingStatus,

    // Functions
    etlLoadData,
    etlRefreshJobStatus,
    etlHandleSettingsSaved,
  };
}

