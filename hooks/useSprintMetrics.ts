import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
  improved: boolean;
}

interface SprintMetric {
  metric_id: string;
  label: string;
  value: string;
  tier_status?: 'high' | 'medium' | 'low' | '';
  metric_type?: 'dora' | 'sprint' | 'pi';
  description: string;
  tooltip: string;
  trend?: Trend | null;
  chart_data?: any | null;
  alternative_text?: string | null;
  action?: {
    type: 'table' | 'report';
    target_id?: string;
    report_ids?: string[];
    params?: {
      metric?: string;
      [key: string]: any;
    };
  };
}

interface UseSprintMetricsReturn {
  metrics: SprintMetric[];
  loading: boolean;
  error: string | null;
  refetch: (bypassCache?: boolean) => Promise<void>;
}

/**
 * Custom hook for fetching Sprint metrics data.
 * 
 * @param teamName - The name of the team to fetch metrics for
 * @param isGroup - Whether the team is a group
 * @param refreshKey - Optional key that triggers refetch when changed
 * @returns Object containing sprint metrics, loading state, error state, and refetch function
 */
export function useSprintMetrics(
  teamName?: string, 
  isGroup?: boolean,
  refreshKey?: number
): UseSprintMetricsReturn {
  const [metrics, setMetrics] = useState<SprintMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (bypassCache: boolean = false) => {
    if (!teamName) {
      console.log('[useSprintMetrics] No teamName provided, skipping fetch');
      setMetrics([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      console.log('[useSprintMetrics] Fetching metrics for:', { teamName, isGroup, bypassCache });
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        scope: 'sprint',
        team_name: teamName,
        isGroup: (isGroup || false).toString(),
      });

      if (bypassCache) {
        params.append('bypass_cache', 'true');
      }

      const url = `/api/v1/team-metrics/general-kpis?${params.toString()}`;
      console.log('[useSprintMetrics] Fetching from:', url);
      
      const response = await authFetch(url);

      console.log('[useSprintMetrics] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useSprintMetrics] Received metrics:', data);
      setMetrics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[useSprintMetrics] Error fetching metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch sprint metrics';
      setError(message);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [teamName, isGroup]);

  // Auto-refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log('[useSprintMetrics] Refetching metrics with bypass_cache due to refreshKey change:', refreshKey);
      fetchMetrics(true);
    }
  }, [refreshKey, fetchMetrics]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

