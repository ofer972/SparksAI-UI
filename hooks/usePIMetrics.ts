import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/api';
import { PIStatusForTodayItem } from '@/lib/config';

interface PIMetricsData {
  epicClosure: {
    value?: number;
    color?: 'red' | 'yellow' | 'green';
    remainingEpics?: number;
    idealRemaining?: number;
    totalEpics?: number;
  };
  inProgressEpics: {
    count?: number;
    percentage?: number;
    status?: 'red' | 'yellow' | 'green';
    totalEpics?: number;
  };
}

interface UsePIMetricsReturn {
  metrics: PIMetricsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching PI metrics data including epic closure and in-progress epics.
 * 
 * @param piName - The name of the PI to fetch metrics for
 * @returns Object containing PI metrics, loading state, error state, and refetch function
 */
export function usePIMetrics(piName?: string): UsePIMetricsReturn {
  const [metrics, setMetrics] = useState<PIMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
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
      const response = await apiService.getPIStatusForToday(piName);
      
      if (response.data && response.data.length > 0) {
        const firstItem = response.data[0] as PIStatusForTodayItem;
        
        // Extract fields from response
        const statusValue = firstItem.progress_delta_pct_status;
        const progressValue = firstItem.progress_delta_pct;
        const plannedEpics = firstItem.planned_epics || 0;
        const addedEpics = firstItem.added_epics || 0;
        const removedEpics = firstItem.removed_epics || 0;
        // Calculate total epics: planned + added - removed
        const totalEpics = plannedEpics + addedEpics - removedEpics;
        const inProgressPct = firstItem.in_progress_percentage;
        // Calculate in-progress count from percentage and total epics
        const inProgressCount = totalEpics > 0 && inProgressPct !== undefined 
          ? Math.round(totalEpics * (inProgressPct / 100))
          : undefined;
        
        setMetrics({
          epicClosure: {
            value: progressValue,
            color: statusValue,
            remainingEpics: firstItem.remaining_epics,
            idealRemaining: firstItem.ideal_remaining,
            totalEpics: totalEpics,
          },
          inProgressEpics: {
            count: inProgressCount,
            percentage: inProgressPct,
            status: firstItem.count_in_progress_status,
            totalEpics: totalEpics,
          },
        });
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error('Error fetching PI metrics:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch PI metrics';
      setError(message);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [piName]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

