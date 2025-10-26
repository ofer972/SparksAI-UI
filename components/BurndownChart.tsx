'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BurndownApiService, BurndownDataPoint } from '@/lib/api';
import { format, parseISO } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BurndownChartProps {
  teamName?: string;
  issueType?: string;
  sprintName?: string;
}

export default function BurndownChart({ 
  teamName = 'AutoDesign-Dev', 
  issueType = 'all',
  sprintName 
}: BurndownChartProps) {
  const [data, setData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprintInfo, setSprintInfo] = useState<{
    sprint_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  // Memoize chart data preparation to prevent unnecessary recalculations
  const chartData = React.useMemo(() => {
    if (!data.length) return null;

    // Prepare chart data
    const labels = data.map(d => format(parseISO(d.snapshot_date), 'MMM dd'));
    const actualRemaining = data.map(d => d.remaining_issues);
    const idealRemaining = data.map(d => d.ideal_remaining);
    const totalScope = data.map(d => d.total_issues);

    // Create event markers for issues removed and completed
    const issuesRemovedData = data.map(d => d.issues_removed_on_day > 0 ? d.issues_removed_on_day : null);
    const issuesCompletedData = data.map(d => d.issues_completed_on_day > 0 ? d.issues_completed_on_day : null);

    return {
      labels,
      datasets: [
        {
          label: 'Actual Remaining',
          data: actualRemaining,
          borderColor: '#ff8c00',
          backgroundColor: 'rgba(255, 140, 0, 0.1)',
          borderWidth: 2,
          pointRadius: 6,
          pointBackgroundColor: '#ff8c00',
          pointBorderColor: '#ff8c00',
          fill: false,
          tension: 0,
        },
        {
          label: 'Ideal Burndown',
          data: idealRemaining,
          borderColor: '#808080',
          backgroundColor: 'rgba(128, 128, 128, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0,
        },
        {
          label: 'Total Scope',
          data: totalScope,
          borderColor: '#0066cc',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          borderWidth: 2,
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false,
          tension: 0,
        },
        {
          label: 'Issues Removed',
          data: issuesRemovedData,
          borderColor: '#ff0000',
          backgroundColor: '#ff0000',
          borderWidth: 1,
          pointRadius: 6,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#ff0000',
          pointBorderColor: '#ff0000',
          pointHoverRadius: 8,
          fill: false,
          tension: 0,
          showLine: false,
          pointHoverBackgroundColor: '#ff0000',
          pointHoverBorderColor: '#ff0000',
          pointHoverBorderWidth: 1,
        },
        {
          label: 'Issues Completed',
          data: issuesCompletedData,
          borderColor: '#00ff00',
          backgroundColor: '#00ff00',
          borderWidth: 0,
          pointRadius: 8,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#00ff00',
          pointBorderColor: '#00ff00',
          fill: false,
          tension: 0,
          showLine: false,
        },
      ],
    };
  }, [data]);

  const options = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 0,
        bottom: 10,
        left: 10,
        right: 10,
      },
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
        display: true,
        text: sprintInfo ? `${sprintInfo.sprint_name} - Burndown Chart` : 'Sprint Burndown Chart',
        font: {
          size: 12,
          weight: 'bold' as const,
        },
        position: 'top' as const,
        align: 'start' as const,
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
            const dataIndex = context[0].dataIndex;
            const date = data[dataIndex]?.snapshot_date;
            return date ? format(parseISO(date), 'MMM dd, yyyy') : context[0].label;
          },
          label: function(context: any) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            if (value === null || value === undefined) {
              return null;
            }
            
            // Add more descriptive labels
            switch (datasetLabel) {
              case 'Actual Remaining':
                return `📊 Actual Remaining: ${value} issues`;
              case 'Ideal Burndown':
                return `📈 Ideal Burndown: ${value} issues`;
              case 'Total Scope':
                return `📋 Total Scope: ${value} issues`;
              case 'Issues Removed':
                return `🔴 Issues Removed: ${value} issues`;
              case 'Issues Completed':
                return `🟢 Issues Completed: ${value} issues`;
              default:
                return `${datasetLabel}: ${value}`;
            }
          },
          filter: function(context: any) {
            return context.parsed.y !== null && context.parsed.y !== undefined;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Issues Remaining / Scope / Event Count',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
        },
        min: 0,
        max: Math.max(...data.map(d => d.ideal_remaining), ...data.map(d => d.total_issues)) + 2,
        ticks: {
          stepSize: 2,
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
  }), [sprintInfo, data]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiService = new BurndownApiService();
        const response = await apiService.getBurndownData(teamName, issueType, sprintName);
        
        setData(response.data.burndown_data);
        setSprintInfo({
          sprint_name: response.data.sprint_name,
          start_date: response.data.start_date,
          end_date: response.data.end_date,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamName, issueType, sprintName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading burndown chart...</div>
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

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">No chart data available</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: '425px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
