'use client';

import { useDORAMetrics } from './useDORAMetrics';
import { usePRWorkflowMetrics } from './usePRWorkflowMetrics';
import { useMetricData } from './useMetricData';

interface UseDualModeMetricDataProps<T> {
  // Report mode props (optional)
  data?: T | null;
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  refresh?: () => void;
  
  // Hook mode config
  useDORA: boolean; // true for DORA, false for PR Workflow
  endpoint: string;
}

export function useDualModeMetricData<T>({
  data: propsData,
  loading: propsLoading,
  error: propsError,
  filters: propsFilters,
  refresh: propsRefresh,
  useDORA,
  endpoint,
}: UseDualModeMetricDataProps<T>) {
  // Determine mode FIRST: if any report mode prop is explicitly provided, use report mode
  const isReportMode = propsData !== undefined || propsLoading !== undefined || propsError !== undefined;
  
  // Get hook data (only used in hook mode, but we need it for filter badges even in report mode)
  const doraData = useDORAMetrics();
  const prData = usePRWorkflowMetrics();
  const hookData = useDORA ? doraData : prData;
  
  // Build dependencies array based on hook type
  const dependencies = useDORA
    ? [hookData.githubRepoIds, (hookData as any).environment, hookData.months, (hookData as any).teamName, (hookData as any).isGroup]
    : [hookData.githubRepoIds, hookData.months, (hookData as any).prState, (hookData as any).teamName, (hookData as any).isGroup];
  
  // Create a no-op fetch function for report mode to avoid errors
  const noOpFetch = async (endpoint: string) => {
    return null as T;
  };
  
  // Ensure endpoint is a string (defensive check)
  const safeEndpoint = typeof endpoint === 'string' ? endpoint : '';
  
  // Use metric data hook (only used in hook mode)
  // In report mode, use no-op function and empty repos to prevent fetching
  const { data: hookDataResult, refresh: hookRefresh } = useMetricData<T>(
    safeEndpoint,
    isReportMode ? noOpFetch : hookData.fetchData,
    dependencies,
    isReportMode ? [] : hookData.repositories // Empty repos array in report mode prevents fetching
  );
  
  // Create a refresh function that works in both modes
  const refresh = isReportMode 
    ? (propsRefresh || (() => {})) // Use props refresh in report mode, or no-op
    : hookRefresh; // Use hook refresh in hook mode (calls fetchData with endpoint internally)
  
  // Return appropriate data
  return {
    data: isReportMode ? propsData : hookDataResult,
    loading: isReportMode ? (propsLoading ?? false) : (hookData as any).loading ?? false,
    error: isReportMode ? (propsError ?? null) : (hookData as any).error ?? null,
    isReportMode,
    hookData: {
      ...hookData,
      fetchData: refresh, // Replace fetchData with the proper refresh function
    },
  };
}

