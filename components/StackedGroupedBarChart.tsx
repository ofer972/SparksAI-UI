'use client';

import React, { useMemo, useRef, useEffect } from 'react';
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
import { Chart, getElementAtEvent } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { API_CONFIG } from '@/lib/config';

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
  issueKeys?: string[];
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
  height = '100%',
  loading = false,
  error = null
}: StackedGroupedBarChartProps) {
  
  const chartRef = useRef<ChartJS>(null);

  // Create lookup map for issue_keys: (quarter, metricName) -> issue_keys[]
  const issueKeysMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    data.forEach((item) => {
      if (item.issueKeys && Array.isArray(item.issueKeys) && item.issueKeys.length > 0) {
        const key = `${item.quarter}|||${item.metricName}`;
        map.set(key, item.issueKeys);
      }
    });
    
    return map;
  }, [data]);

  // Transform data for Chart.js
  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Get unique quarters and stack groups
    const quarters = Array.from(new Set(data.map(d => d.quarter))).sort();
    const stackGroups = Array.from(new Set(data.map(d => d.stackGroup))).sort();
    
    // Define metric order for proper stacking
    const metricOrder = [
      'Issues Planned',
      'Issues Added',
      'Issues Completed',
      'Issues Not Completed',
      'Issues Removed',
    ];

    const stackGroupMap: { [metric: string]: string } = {
      'Issues Planned': 'Plan/Add',
      'Issues Added': 'Plan/Add',
      'Issues Completed': 'Res/NotRes/Rem',
      'Issues Not Completed': 'Res/NotRes/Rem',
      'Issues Removed': 'Res/NotRes/Rem',
    };

    // Get metrics in the defined order, then add any others
    const metrics = Array.from(new Set(data.map((d) => d.metricName)));
    metrics.sort((a, b) => {
      const indexA = metricOrder.indexOf(a);
      const indexB = metricOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

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
        stack: stackGroupMap[metric] || 'Unknown',
      };
    });

    return {
      labels: quarters,
      datasets,
    };
  }, [data, colorScheme, defaultColors]);

  // Build Jira search URL with issue keys
  const buildJiraUrl = (issueKeys: string[]): string => {
    if (!issueKeys || issueKeys.length === 0) return '';
    
    // Check if Jira URL is configured in config.ts
    // Check if the property exists (will be added later to config.ts)
    const config = API_CONFIG as any;
    const jiraUrl = 'jiraUrl' in config ? (typeof config.jiraUrl === 'function' ? config.jiraUrl() : config.jiraUrl) : undefined;
    
    if (!jiraUrl) {
      alert('Jira URL is not configured. Contact admin.');
      return '';
    }
    
    // Format: key IN (KEY1, KEY2, KEY3)
    const jql = `key IN (${issueKeys.join(', ')})`;
    const encodedJql = encodeURIComponent(jql);
    return `${jiraUrl}/issues/?jql=${encodedJql}`;
  };

  const options = useMemo(() => {
    if (!chartData) return {};

    // Calculate max value for Y-axis
    const maxValue = Math.max(...chartData.datasets.flatMap(dataset => dataset.data as number[]));
    const suggestedMax = Math.ceil(maxValue * 1.4); // Increased to 1.4 for 3 more ticks after bars

    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event: any, activeElements: any[]) => {
        if (!activeElements || activeElements.length === 0) {
          return;
        }

        if (!chartData || !chartData.datasets || !chartData.labels) {
          return;
        }

        const chart = chartRef.current;
        if (!chart) {
          return;
        }

        // Use Chart.js built-in method to get the nearest element at click position
        const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
        
        if (!elements || elements.length === 0) {
          return;
        }

        // Get the clicked element (should be the specific segment in stacked bar)
        const clickedElement = elements[0];
        const datasetIndex = clickedElement.datasetIndex;
        const dataIndex = clickedElement.index;
        
        // Get the metric name from the dataset - this identifies the specific bar segment
        const metricName = chartData.datasets[datasetIndex]?.label || '';
        // Get the quarter from the label
        const quarter = chartData.labels[dataIndex] || '';
        
        // Look up issue_keys for this SPECIFIC data point (quarter + metric combination)
        const mapKey = `${quarter}|||${metricName}`;
        const issueKeys = issueKeysMap.get(mapKey);
        
        if (issueKeys && issueKeys.length > 0) {
          const jiraUrl = buildJiraUrl(issueKeys);
          if (jiraUrl) {
            window.open(jiraUrl, '_blank');
          }
        }
      },
      onHover: (event: any, activeElements: any[]) => {
        const canvas = event.native?.target as HTMLCanvasElement;
        if (!canvas) return;
        
        if (activeElements.length > 0) {
          const clickedElement = activeElements[0];
          const datasetIndex = clickedElement.datasetIndex;
          const dataIndex = clickedElement.index;
          
          const metricName = chartData.datasets[datasetIndex].label || '';
          const quarter = chartData.labels[dataIndex] || '';
          const mapKey = `${quarter}|||${metricName}`;
          const issueKeys = issueKeysMap.get(mapKey);
          
          // Change cursor to pointer if issue_keys exist
          if (issueKeys && issueKeys.length > 0) {
            canvas.style.cursor = 'pointer';
          } else {
            canvas.style.cursor = 'default';
          }
        } else {
          canvas.style.cursor = 'default';
        }
      },
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
          position: 'nearest' as const,
          xAlign: 'center' as const,
          yAlign: 'bottom' as const,
          padding: 8,
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
            size: 14,
            weight: 'bold' as const,
          },
          formatter: function(value: number) {
            return value > 0 ? value : '';
          },
          anchor: 'center' as const,
          align: 'center' as const,
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
  }, [chartData, title, xAxisLabel, yAxisLabel, issueKeysMap]);

  // Add direct click handler as fallback
  // MUST be called before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (!chartData) {
      return;
    }

    let canvas: HTMLCanvasElement | null = null;
    let cleanup: (() => void) | null = null;

    // Wait a bit for chart to render
    const timeoutId = setTimeout(() => {
      const chart = chartRef.current;
      if (!chart) {
        return;
      }

      canvas = chart.canvas;
      if (!canvas) {
        return;
      }


      const handleCanvasClick = (event: MouseEvent) => {
        try {
          // Use Chart.js built-in method to get the nearest element at click position
          const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
          
          if (!elements || elements.length === 0) {
            return;
          }

          // Get the clicked element (should be the specific segment in stacked bar)
          const clickedElement = elements[0];
          const datasetIndex = clickedElement.datasetIndex;
          const dataIndex = clickedElement.index;
          
          // Get the metric name from the dataset - this identifies the specific bar segment
          const metricName = chartData.datasets[datasetIndex]?.label || '';
          // Get the quarter from the label
          const quarter = chartData.labels[dataIndex] || '';
          
          // Look up issue_keys for this SPECIFIC data point (quarter + metric combination)
          const mapKey = `${quarter}|||${metricName}`;
          const issueKeys = issueKeysMap.get(mapKey);
          
          if (issueKeys && issueKeys.length > 0) {
            const jiraUrl = buildJiraUrl(issueKeys);
            if (jiraUrl) {
              window.open(jiraUrl, '_blank');
            }
          }
        } catch (error) {
          console.error('Error in canvas click handler:', error);
        }
      };

      // Use capture phase to catch clicks before plugins
      canvas.addEventListener('click', handleCanvasClick, true);
      
      cleanup = () => {
        canvas?.removeEventListener('click', handleCanvasClick, true);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [chartData, issueKeysMap]);

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

  // Additional safety check
  if (!chartData || !chartData.labels || !chartData.datasets) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Invalid chart data</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Chart 
        ref={chartRef}
        type="bar" 
        data={chartData} 
        options={options}
        plugins={[ChartDataLabels]}
      />
    </div>
  );
}
