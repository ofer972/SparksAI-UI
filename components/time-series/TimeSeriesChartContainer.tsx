'use client';

import React from 'react';
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
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">{loadingMessage}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!chartData || chartData.labels?.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]">
      <Chart ref={chartRef} type={chartType} data={chartData} options={chartOptions} />
    </div>
  );
}

