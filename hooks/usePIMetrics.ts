import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';

interface PIMetric {
  metric_id: string;
  label: string;
  value: string;
  tier_status?: 'high' | 'medium' | 'low' | null;
  metric_type?: 'dora' | 'sprint' | 'pi' | null;
  description: string;
  tooltip: string;
  trend?: any | null;
  chart_data?: any | null;
  alternative_text?: string | null;
}

interface PIMetricsData {
  kpiMetrics: PIMetric[];
}

interface UsePIMetricsReturn {
  metrics: PIMetricsData | null;
  loading: boolean;
  error: string | null;
  refetch: (bypassCache?: boolean) => Promise<void>;
}

/**
 * Custom hook for fetching PI metrics data including epic closure and in-progress epics.
 * 
 * @param piName - The name of the PI to fetch metrics for
 * @param teamName - Optional team name for filtering dependencies
 * @param isGroup - Whether the team is a group
 * @returns Object containing PI metrics, loading state, error state, and refetch function
 */
export function usePIMetrics(piName?: string, teamName?: string, isGroup?: boolean): UsePIMetricsReturn {
  const [metrics, setMetrics] = useState<PIMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (bypassCache: boolean = false) => {
    // Check if piName is empty, whitespace, or placeholder text
    const isEmptyOrPlaceholder = !piName || 
      piName.trim() === '' || 
      piName === 'Select PI' ||
      piName.trim() === 'Select PI';
    
    if (isEmptyOrPlaceholder) {
      setMetrics(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      
      console.log('[usePIMetrics] Fetching metrics with:', { piName, teamName, isGroup, bypassCache });
      
      const kpiMetrics = await apiService.getGeneralKPIs('pi', teamName || '', isGroup || false, piName, undefined, 5, bypassCache);
      
      setMetrics({
        kpiMetrics: Array.isArray(kpiMetrics) ? kpiMetrics : [],
      });
    } catch (err) {
      console.error('Error fetching PI metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch PI metrics';
      const isPINotFoundError =
        typeof message === 'string' && (
          message.includes("PI '") && message.includes("' not found") ||
          message.includes('404: PI') ||
          message.includes('PI not found')
        );

      if (isPINotFoundError) {
        setError(null);
        setMetrics(null);
      } else {
        setError(message);
        setMetrics(null);
      }
    } finally {
      setLoading(false);
    }
  }, [piName, teamName, isGroup]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

