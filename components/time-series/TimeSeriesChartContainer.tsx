'use client';

import React, { useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';

interface TimeSeriesChartContainerProps {
  loading: boolean;
  error: string | null;
  chartData: ChartData<'line' | 'bar'> | null;
  chartType: 'line' | 'bar';
  chartOptions: any;
  loadingMessage?: string;
  chartRef?: React.RefObject<any>;
}

export default function TimeSeriesChartContainer({
  loading,
  error,
  chartData,
  chartType,
  chartOptions,
  loadingMessage = 'Loading data...',
  chartRef,
}: TimeSeriesChartContainerProps) {
  // Dark mode detection for chart key
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-tertiary">{loadingMessage}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-danger-bg border border-danger-border rounded-lg p-4">
        <div className="text-sm text-danger-text">{error}</div>
      </div>
    );
  }

  if (!chartData || chartData.labels?.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-content-muted">
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[350px]">
      <Chart ref={chartRef} key={isDark ? 'dark' : 'light'} type={chartType} data={chartData} options={chartOptions} />
    </div>
  );
}

