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
  dependencies: {
    outbound?: Array<{ team: string; uncompletedIssues: number }>;
    inbound?: Array<{ team: string; uncompletedIssues: number }>;
  };
  averageCycleTime: {
    value?: number;
    color?: 'red' | 'yellow' | 'green';
    epicCount?: number;
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
      
      // Fetch all metrics in parallel
      const [piStatusResponse, dependenciesResponse, cycleTimeResponse] = await Promise.allSettled([
        apiService.getPIStatusForToday(piName),
        apiService.getTopDependenciesSummary(piName),
        apiService.getAverageEpicCycleTime(6),
      ]);
      
      // Process PI Status data
      let epicClosureData: PIMetricsData['epicClosure'] = {};
      let inProgressData: PIMetricsData['inProgressEpics'] = {};
      
      if (piStatusResponse.status === 'fulfilled' && piStatusResponse.value.data && piStatusResponse.value.data.length > 0) {
        const firstItem = piStatusResponse.value.data[0] as PIStatusForTodayItem;
        
        const statusValue = firstItem.progress_delta_pct_status;
        const progressValue = firstItem.progress_delta_pct;
        const plannedEpics = firstItem.planned_epics || 0;
        const addedEpics = firstItem.added_epics || 0;
        const removedEpics = firstItem.removed_epics || 0;
        const totalEpics = plannedEpics + addedEpics - removedEpics;
        const inProgressPct = firstItem.in_progress_percentage;
        const inProgressCount = totalEpics > 0 && inProgressPct !== undefined 
          ? Math.round(totalEpics * (inProgressPct / 100))
          : undefined;
        
        epicClosureData = {
          value: progressValue,
          color: statusValue,
          remainingEpics: firstItem.remaining_epics,
          idealRemaining: firstItem.ideal_remaining,
          totalEpics: totalEpics,
        };
        
        inProgressData = {
          count: inProgressCount,
          percentage: inProgressPct,
          status: firstItem.count_in_progress_status,
          totalEpics: totalEpics,
        };
      }
      
      // Process Dependencies data
      let dependenciesData: PIMetricsData['dependencies'] = {};
      if (dependenciesResponse.status === 'fulfilled' && dependenciesResponse.value.success && dependenciesResponse.value.data) {
        const outbound = dependenciesResponse.value.data.top_outbound_dependencies.map(dep => ({
          team: dep.owned_team,
          uncompletedIssues: dep.uncompleted_issues
        }));
        const inbound = dependenciesResponse.value.data.top_inbound_dependencies.map(dep => ({
          team: dep.assignee_team,
          uncompletedIssues: dep.uncompleted_issues
        }));
        dependenciesData = { outbound, inbound };
      }
      
      // Process Cycle Time data
      let cycleTimeData: PIMetricsData['averageCycleTime'] = {};
      if (cycleTimeResponse.status === 'fulfilled' && cycleTimeResponse.value.success && cycleTimeResponse.value.data) {
        cycleTimeData = {
          value: cycleTimeResponse.value.data.average_epic_cycle_time,
          color: cycleTimeResponse.value.data.average_epic_cycle_time_status,
          epicCount: cycleTimeResponse.value.data.epic_count,
        };
      }
      
      setMetrics({
        epicClosure: epicClosureData,
        inProgressEpics: inProgressData,
        dependencies: dependenciesData,
        averageCycleTime: cycleTimeData,
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
  }, [piName]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

