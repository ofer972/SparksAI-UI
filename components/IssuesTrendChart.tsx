'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { ApiService, IssuesTrendDataPoint, IssuesTrendResponse } from '@/lib/api';
import { format, parseISO } from 'date-fns';

// Register all controllers
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface IssuesTrendChartProps {
  teamName?: string;
  issueType?: string;
  months?: number;
}

export default function IssuesTrendChart({ 
  teamName = 'AutoDesign-Dev',
  issueType = 'Bug',
  months = 6
}: IssuesTrendChartProps) {
  const [data, setData] = useState<IssuesTrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState(issueType);
  const [selectedMonths, setSelectedMonths] = useState(months);
  const [chartTitle, setChartTitle] = useState('Bug Trends');

  // Sync internal state with props when they change
  useEffect(() => {
    setSelectedIssueType(issueType);
  }, [issueType]);

  useEffect(() => {
    setSelectedMonths(months);
  }, [months]);

  // Update chart title based on issue type
  useEffect(() => {
    const title = selectedIssueType === 'all' ? 'Issues Trends' : `${selectedIssueType} Trends`;
    setChartTitle(title);
  }, [selectedIssueType]);

  // Calculate dynamic chart width based on number of months
  const chartWidth = useMemo(() => {
    // Base width for minimum months
    const baseWidth = 350;
    // Additional width per month
    const widthPerMonth = 80;
    
    // Calculate width: Base + (Number of months * width per month)
    const calculatedWidth = Math.min(1200, baseWidth + (selectedMonths - 1) * widthPerMonth);
    
    // Increase by 20%
    return `${Math.round(calculatedWidth * 1.2)}px`;
  }, [selectedMonths]);

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Group data by month
    const monthlyData: { [key: string]: { created: number; resolved: number; open: number } } = {};
    
    data.forEach(point => {
      const month = point.report_month;
      if (!monthlyData[month]) {
        monthlyData[month] = { created: 0, resolved: 0, open: 0 };
      }
      monthlyData[month].created += point.issues_created;
      monthlyData[month].resolved += point.issues_resolved;
      // Use the last value for cumulative open issues
      monthlyData[month].open = point.cumulative_open_issues;
    });

    // Sort by month
    const sortedMonths = Object.keys(monthlyData).sort();
    
    const labels = sortedMonths.map(month => format(parseISO(month), 'MMM yyyy'));
    const createdData = sortedMonths.map(month => monthlyData[month].created);
    const resolvedData = sortedMonths.map(month => monthlyData[month].resolved);
    const openData = sortedMonths.map(month => monthlyData[month].open);

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Issues Created',
          data: createdData,
          backgroundColor: 'rgba(204, 0, 0, 0.6)',
          borderColor: '#cc0000',
          borderWidth: 1,
          order: 2,
        },
        {
          type: 'bar' as const,
          label: 'Issues Resolved',
          data: resolvedData,
          backgroundColor: 'rgba(0, 153, 0, 0.6)',
          borderColor: '#009900',
          borderWidth: 1,
          order: 3,
        },
        {
          type: 'line' as const,
          label: 'Issues Left Open (Trend)',
          data: openData,
          borderColor: '#4169E1',
          backgroundColor: '#4169E1',
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 6,
          pointBackgroundColor: '#4169E1',
          pointBorderColor: '#4169E1',
          yAxisID: 'y1',
          order: 1,
        },
      ],
    };
  }, [data]);

  const options = useMemo(() => {
    // Calculate suggested max for Y axis based on data
    if (!chartData || !chartData.datasets) {
      return {};
    }
    
    // Get max from both Issues Created and Issues Resolved
    const createdData = chartData.datasets.find(d => d.label === 'Issues Created')?.data || [];
    const resolvedData = chartData.datasets.find(d => d.label === 'Issues Resolved')?.data || [];
    const allBarData = [...(Array.isArray(createdData) ? createdData : []), ...(Array.isArray(resolvedData) ? resolvedData : [])];
    const maxCreatedResolved = allBarData.length > 0 ? Math.max(...allBarData) : 0;
    // Add 2 ticks above the highest bar
    const suggestedMaxLeft = maxCreatedResolved > 0 ? Math.ceil(maxCreatedResolved) + 2 : undefined;
    
    const rightYMax = chartData.datasets.find(d => d.label === 'Issues Left Open (Trend)')?.data || [];
    const maxOpenIssues = Math.max(...(Array.isArray(rightYMax) ? rightYMax : []));
    const suggestedMaxRight = maxOpenIssues > 0 ? Math.ceil(maxOpenIssues * 1.15) : undefined;
    
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
            
            switch (label) {
              case 'Issues Created':
                return `🔴 Issues Created: ${value}`;
              case 'Issues Resolved':
                return `🟢 Issues Resolved: ${value}`;
              case 'Issues Left Open (Trend)':
                return `🔵 Issues Left Open: ${value}`;
              default:
                return `${label}: ${value}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        categoryPercentage: 0.95,
        barPercentage: 1.0,
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '# of Issues',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
        },
        beginAtZero: true,
        max: suggestedMaxLeft,
        ticks: {
          stepSize: 1,
          callback: function(value: any) {
            if (value % 1 === 0) {
              return value;
            }
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '# of Issues',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
          color: '#4169E1',
        },
        beginAtZero: true,
        max: suggestedMaxRight,
        ticks: {
          color: '#4169E1',
          stepSize: 1,
          callback: function(value: any) {
            if (value % 1 === 0) {
              return value;
            }
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
  }, [chartData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!teamName) return;

      try {
        setLoading(true);
        setError(null);

        const apiService = new ApiService();
        const response = await apiService.getIssuesTrend(teamName, selectedIssueType, selectedMonths);

        setData(response.trend_data);
      } catch (err) {
        console.error('Error fetching issues trend data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamName, selectedIssueType, selectedMonths]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">Loading trend chart...</div>
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

  if (!data.length || !chartData || !chartData.labels || !chartData.datasets) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Issue Type:</label>
          <select
            value={selectedIssueType}
            onChange={(e) => setSelectedIssueType(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Bug">Bug</option>
            <option value="Story">Story</option>
            <option value="Task">Task</option>
            <option value="Epic">Epic</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Months:</label>
          <select
            value={selectedMonths}
            onChange={(e) => setSelectedMonths(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="1">1 Month</option>
            <option value="2">2 Months</option>
            <option value="3">3 Months</option>
            <option value="4">4 Months</option>
            <option value="6">6 Months</option>
            <option value="9">9 Months</option>
            <option value="12">12 Months</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto" style={{ height: '425px' }}>
        <div style={{ width: chartWidth, height: '425px' }}>
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}

