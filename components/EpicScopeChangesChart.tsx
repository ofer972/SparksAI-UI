'use client';

import React, { useEffect, useState, useMemo } from 'react';
import StackedGroupedBarChart, { StackedGroupedBarChartData } from './StackedGroupedBarChart';
import MultiPIFilter from './MultiPIFilter';
import { ApiService, ScopeChangesDataPoint } from '@/lib/api';

interface EpicScopeChangesChartProps {
  selectedQuarter: string;
}

export default function EpicScopeChangesChart({ selectedQuarter }: EpicScopeChangesChartProps) {
  const [data, setData] = useState<ScopeChangesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPIs, setSelectedPIs] = useState<string[]>([selectedQuarter]);

  // Color scheme matching the image
  const epicScopeColors = {
    'Issues Planned': '#0066cc',      // Blue
    'Issues Added': '#800080',        // Purple
    'Issues Completed': '#009900',    // Medium Green
    'Issues Not Completed': '#ff8c00', // Orange
    'Issues Removed': '#00ffff'       // Cyan
  };

  // Transform API data to chart format
  const chartData = useMemo((): StackedGroupedBarChartData[] => {
    return data.map(item => ({
      quarter: item['Quarter Name'],
      stackGroup: item['Stack Group'],
      metricName: item['Metric Name'],
      value: item.Value
    }));
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedPIs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const apiService = new ApiService();
        const response = await apiService.getScopeChanges(selectedPIs);

        setData(response.scope_data);
      } catch (err) {
        console.error('Error fetching scope changes data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch scope changes data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPIs]);

  // Update selectedPIs when selectedQuarter changes
  useEffect(() => {
    if (selectedQuarter && !selectedPIs.includes(selectedQuarter)) {
      setSelectedPIs([selectedQuarter]);
    }
  }, [selectedQuarter, selectedPIs]);

  return (
    <div className="space-y-3">
      {/* PI Filter */}
      <div className="flex justify-start">
        <MultiPIFilter
          selectedPIs={selectedPIs}
          onPIsChange={setSelectedPIs}
          maxSelections={4}
        />
      </div>
      
      {/* Chart with dynamic width based on number of quarters */}
      <div className={`${selectedPIs.length <= 2 ? 'w-1/2' : selectedPIs.length <= 3 ? 'w-2/3' : 'w-full'}`}>
        <StackedGroupedBarChart
          data={chartData}
          title="Epic Scope Changes"
          yAxisLabel="# of Epics"
          xAxisLabel="Quarter"
          colorScheme={epicScopeColors}
          height="425px"
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
