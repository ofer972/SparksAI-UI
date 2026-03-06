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
import { BurndownDataPoint } from '@/lib/api';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';

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
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  title?: string;
  onChartClick?: (data: { date: string; metricType: string; dataIndex: number }) => void;
}

export default function BurndownChart({ 
  data,
  loading,
  error,
  title,
  onChartClick
}: BurndownChartProps) {

  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Memoize chart data preparation to prevent unnecessary recalculations
  const chartData = React.useMemo(() => {
    if (!data.length) return null;

    // Prepare chart data
    const labels = data.map(d => format(parseISO(d.snapshot_date), 'MMM dd'));
    const actualRemaining = data.map(d => d.remaining_issues);
    const idealRemaining = data.map(d => d.ideal_remaining);
    const totalScope = data.map(d => d.total_issues);
    const today = startOfDay(new Date());
    const wipData = data.map(d => {
      const snapshotDate = startOfDay(parseISO(d.snapshot_date));
      // Set to null if date is in the future (after today) or if WIP data is missing
      if (isAfter(snapshotDate, today) || d.wip_issues_in_progress === undefined || d.wip_issues_in_progress === null) {
        return null;
      }
      return d.wip_issues_in_progress;
    });

    // Create event markers for issues removed, completed, and added
    const issuesRemovedData = data.map(d => d.issues_removed_on_day > 0 ? d.issues_removed_on_day : null);
    const issuesCompletedData = data.map(d => d.issues_completed_on_day > 0 ? d.issues_completed_on_day : null);
    const issuesAddedData = data.map(d => (d.issues_added_on_day ?? 0) as number | null);

    // Count event markers per index for heat reduce: smaller points when multiple on same day
    const eventCountPerIndex = data.map((_, i) =>
      [issuesRemovedData[i], issuesCompletedData[i], issuesAddedData[i]].filter(
        (v) => v != null && v !== 0
      ).length
    );

    return {
      labels,
      datasets: [
        {
          label: 'Actual Remaining',
          data: actualRemaining,
          borderColor: '#ff8c00',
          backgroundColor: 'rgba(255, 140, 0, 0.1)',
          borderWidth: 1.5,
          pointRadius: 5,
          pointHoverRadius: 10,
          pointBackgroundColor: '#ff8c00',
          pointBorderColor: '#ff8c00',
          pointHoverBackgroundColor: '#ff8c00',
          pointHoverBorderColor: '#ff8c00',
          pointHoverBorderWidth: 2,
          fill: false,
          tension: 0,
          datalabels: {
            display: false,
          },
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
          datalabels: {
            display: false,
          },
        },
        {
          label: 'Total Scope',
          data: totalScope,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2,
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false,
          tension: 0,
          datalabels: {
            display: false,
          },
        },
        {
          label: 'Work In Progress',
          data: wipData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 1,
          borderDash: [10, 5],
          pointRadius: 5,
          pointHoverRadius: 9,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#06b6d4',
          pointHoverBackgroundColor: '#06b6d4',
          pointHoverBorderColor: '#06b6d4',
          pointHoverBorderWidth: 1,
          fill: false,
          tension: 0,
          datalabels: {
            display: false,
          },
        },
        {
          label: 'Issues Removed',
          data: issuesRemovedData,
          borderColor: '#ff0000',
          backgroundColor: '#ff0000',
          borderWidth: 1,
          pointRadius: (ctx: { dataIndex: number }) =>
            (eventCountPerIndex[ctx.dataIndex] ?? 0) > 1 ? 4 : 5,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#ff0000',
          pointBorderColor: '#ff0000',
          pointHoverRadius: 7,
          fill: false,
          tension: 0,
          showLine: false,
          pointHoverBackgroundColor: '#ff0000',
          pointHoverBorderColor: '#ff0000',
          pointHoverBorderWidth: 1,
          datalabels: {
            display: false,
          },
        },
        {
          label: 'Issues Completed',
          data: issuesCompletedData,
          borderColor: '#00ff00',
          backgroundColor: '#00ff00',
          borderWidth: 0,
          pointRadius: (ctx: { dataIndex: number }) =>
            (eventCountPerIndex[ctx.dataIndex] ?? 0) > 1 ? 5 : 6,
          pointHoverRadius: 10,
          pointStyle: 'rectRot',
          pointBackgroundColor: '#00ff00',
          pointBorderColor: '#00ff00',
          pointHoverBackgroundColor: '#00ff00',
          pointHoverBorderColor: '#00ff00',
          pointHoverBorderWidth: 1,
          fill: false,
          tension: 0,
          showLine: false,
          datalabels: {
            display: false,
          },
        },
        {
          label: 'Issues Added',
          data: issuesAddedData,
          borderColor: '#7c3aed',
          backgroundColor: '#7c3aed',
          borderWidth: 1,
          pointRadius: (ctx: { raw: number | null; dataIndex: number }) =>
            ctx.raw === 0 || ctx.raw == null
              ? 0
              : (eventCountPerIndex[ctx.dataIndex] ?? 0) > 1
                ? 6
                : 5,
          pointStyle: 'star',
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#7c3aed',
          pointHoverRadius: 7,
          fill: false,
          tension: 0,
          showLine: false,
          pointHoverBackgroundColor: '#7c3aed',
          pointHoverBorderColor: '#7c3aed',
          pointHoverBorderWidth: 1,
          datalabels: {
            display: false,
          },
        },
      ],
    };
  }, [data]);

  // Map dataset label to metric type
  const getMetricTypeFromDataset = (datasetIndex: number): string | null => {
    const metricMap: Record<number, string> = {
      0: 'actual_remaining',
      2: 'total_scope',
      3: 'wip_in_progress',
      4: 'issues_removed',
      5: 'issues_completed',
      6: 'issues_added',
    };
    return metricMap[datasetIndex] || null;
  };

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
          color: isDark ? '#cbd5e1' : '#374151',
        },
        padding: {
          top: 0,
          bottom: 5,
        },
      },
      datalabels: {
        display: false,
      },
      title: {
        display: true,
        text: title || 'Burndown Chart',
        color: isDark ? '#cbd5e1' : '#374151',
      },
      tooltip: {
        mode: 'index' as const,
        intersect: true,
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: isDark ? '#475569' : '#333',
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
              return '';
            }
            
            // One icon (left color swatch) is enough; no emoji in text
            switch (datasetLabel) {
              case 'Actual Remaining':
                return `Actual Remaining: ${value} issues`;
              case 'Ideal Burndown':
                return `Ideal Burndown: ${value} issues`;
              case 'Total Scope':
                return `Total Scope: ${value} issues`;
              case 'Issues Removed':
                return `Issues Removed: ${value} issues`;
              case 'Issues Completed':
                return `Issues Completed: ${value} issues`;
              case 'Issues Added':
                return `Issues Added: ${value} issues`;
              case 'Work In Progress':
                return `Work In Progress: ${value} issues`;
              default:
                return `${datasetLabel}: ${value}`;
            }
          },
          filter: function(context: any) {
            return context.parsed.y !== null && context.parsed.y !== undefined;
          },
          labelColor: function(context: any) {
            const label = context.dataset?.label;
            const wipCyan = '#06b6d4';
            if (label === 'Work In Progress') {
              return { borderColor: wipCyan, backgroundColor: wipCyan };
            }
            const solid = context.dataset.pointBackgroundColor ?? context.dataset.borderColor;
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: solid ?? context.dataset.backgroundColor,
            };
          },
          // Single icon per row: only the color swatch (left). No second shape.
          labelPointStyle: function() {
            return { pointStyle: 'circle', rotation: 0, radius: 0, borderWidth: 0 };
          },
          footer: function(context: any) {
            const dataIndex = context[0]?.dataIndex;
            const n = data[dataIndex]?.issues_completed_outside_sprint;
            if (n != null && n > 0) {
              return `ℹ️ ${n} issue(s) completed before sprint start (excluded from total scope).`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
          text: 'Date',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
          color: isDark ? '#cbd5e1' : '#374151',
        },
        ticks: {
          color: isDark ? '#cbd5e1' : '#374151',
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Issue Count',
          font: {
            size: 10,
            weight: 'bold' as const,
          },
          color: isDark ? '#cbd5e1' : '#374151',
        },
        min: 0,
        max: Math.max(
          ...data.map(d => d.ideal_remaining), 
          ...data.map(d => d.total_issues),
          ...data.map(d => d.wip_issues_in_progress ?? 0),
          ...data.map(d => d.issues_added_on_day ?? 0)
        ) + 2,
        ticks: {
          stepSize: 2,
          color: isDark ? '#cbd5e1' : '#374151',
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    elements: {
      point: {
        hitRadius: 3,
      },
    },
    interaction: {
      mode: 'point' as const,
      intersect: true,
    },
    onClick: (event: any, elements: any[]) => {
      if (!onChartClick || elements.length === 0) return;
      const element = elements[0];
      const dataIndex = element.index;
      const datasetIndex = element.datasetIndex;
      const metricType = getMetricTypeFromDataset(datasetIndex);
      if (!metricType) return;
      const clickedData = data[dataIndex];
      if (clickedData && clickedData.snapshot_date) {
        onChartClick({
          date: clickedData.snapshot_date,
          metricType,
          dataIndex,
        });
      }
    },
  }), [data, onChartClick, isDark]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-tertiary">Loading burndown chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-danger-text">Error: {error}</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-content-muted">No data available</div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-content-muted">No chart data available</div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[350px]">
      <Line key={isDark ? 'dark' : 'light'} options={options} data={chartData} />
    </div>
  );
}
