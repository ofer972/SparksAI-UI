'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

export interface StackedGroupedBarChartData {
  quarter: string;
  stackGroup: string;
  metricName: string;
  value: number;
}

export interface StackedGroupedBarChartProps {
  data: StackedGroupedBarChartData[];
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  colorScheme?: {
    [metricName: string]: string;
  };
  defaultColors?: string[];
  height?: string;
  loading?: boolean;
  error?: string | null;
}

export default function StackedGroupedBarChart({
  data,
  title = 'Chart',
  yAxisLabel = 'Count',
  xAxisLabel = 'Category',
  colorScheme = {},
  defaultColors = ['#0066cc', '#800080', '#00ff00', '#ff8c00', '#00ffff', '#ff0000', '#ffc0cb', '#808080'],
  height = '425px',
  loading = false,
  error = null
}: StackedGroupedBarChartProps) {
  
  // Transform data for Chart.js
  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Get unique quarters and stack groups
    const quarters = [...new Set(data.map(d => d.quarter))].sort();
    const stackGroups = [...new Set(data.map(d => d.stackGroup))].sort();
    
    // Define metric order for proper stacking
    const metricOrder = [
      'Issues Planned',
      'Issues Added', 
      'Issues Completed',
      'Issues Not Completed',
      'Issues Removed'
    ];
    
    // Get metrics in the defined order, then add any others
    const orderedMetrics = [...metricOrder.filter(m => data.some(d => d.metricName === m))];
    const otherMetrics = [...new Set(data.map(d => d.metricName))].filter(m => !metricOrder.includes(m));
    const metrics = [...orderedMetrics, ...otherMetrics];

    // Create datasets for each metric
    const datasets = metrics.map((metric, index) => {
      const color = colorScheme[metric] || defaultColors[index % defaultColors.length];
      
      return {
        label: metric,
        data: quarters.map(quarter => {
          const dataPoint = data.find(d => d.quarter === quarter && d.metricName === metric);
          return dataPoint ? dataPoint.value : 0;
        }),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        stack: stackGroups.find(group => 
          data.some(d => d.stackGroup === group && d.metricName === metric)
        ),
      };
    });

    return {
      labels: quarters,
      datasets,
    };
  }, [data, colorScheme, defaultColors]);

  const options = useMemo(() => {
    if (!chartData) return {};

    // Calculate max value for Y-axis
    const maxValue = Math.max(...chartData.datasets.flatMap(dataset => dataset.data as number[]));
    const suggestedMax = Math.ceil(maxValue * 1.4); // Increased to 1.4 for 3 more ticks after bars

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 12,
            boxWidth: 12,
            boxHeight: 12,
            font: {
              size: 9,
            },
          },
          padding: {
            top: 0,
            bottom: 5,
          },
        },
        title: {
          display: !!title,
          text: title,
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title: function(context: any) {
              return context[0].label;
            },
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}`;
            },
          },
        },
        datalabels: {
          display: true,
          color: '#000',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
          formatter: function(value: number) {
            return value > 0 ? value : '';
          },
          anchor: 'center',
          align: 'center',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: xAxisLabel,
            font: {
              size: 10,
              weight: 'bold' as const,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          barPercentage: 0.4,
          categoryPercentage: 0.7,
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 10,
              weight: 'bold' as const,
            },
          },
          beginAtZero: true,
          max: suggestedMax,
          ticks: {
            stepSize: Math.ceil(maxValue / 8), // Smaller step size for more ticks
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
    };
  }, [chartData, title, xAxisLabel, yAxisLabel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data.length || !chartData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <Chart 
        type="bar" 
        data={chartData} 
        options={options}
        plugins={[ChartDataLabels]}
      />
    </div>
  );
}
