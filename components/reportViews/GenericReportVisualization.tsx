'use client';

import React, { useMemo } from 'react';
import DataTable, { Column } from '@/components/DataTable';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ResponsivePie } from '@nivo/pie';

const COLOR_PALETTE = [
  '#991b1b',
  '#fbbf24',
  '#7dd3fc',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#0ea5e9',
];

interface ReportField {
  column_name: string;
  display_name: string;
  type: string;
}

interface GenericReportVisualizationProps {
  chartType: 'table' | 'bar_chart' | 'pie_chart';
  data: any;
  loading: boolean;
  error: string | null;
  // Table props
  tableColumns?: Column<any>[];
  // Chart props
  xAxisField?: string;
  yAxisField?: string;
  // Pie chart props
  filterableFields?: ReportField[];
  // Styling
  isDark?: boolean;
  // Optional: Jira URL for table "Open all in Jira" button
  jiraUrl?: string;
  onOpenAllInJira?: () => void;
}

export default function GenericReportVisualization({
  chartType,
  data,
  loading,
  error,
  tableColumns = [],
  xAxisField = 'x_value',
  yAxisField = 'count',
  filterableFields = [],
  isDark = false,
  jiraUrl,
  onOpenAllInJira,
}: GenericReportVisualizationProps) {
  // Table rendering
  if (chartType === 'table') {
    const tableData = Array.isArray(data) ? data : [];
    const hasData = !loading && !error && tableData.length > 0;

    if (error) {
      return (
        <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
          {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading report...</div>
          </div>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-64 text-content-tertiary">
          No data available
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto">
        {/* Header with Open all in Jira button (if applicable) */}
        {jiraUrl && onOpenAllInJira && tableData.some((row: any) => row.issue_key) && (
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline">
            <div className="flex items-center gap-3">
              <p className="text-sm text-content-secondary">
                {tableData.length} {tableData.length === 1 ? 'row' : 'rows'} found
              </p>
            </div>
            <button
              onClick={onOpenAllInJira}
              className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-colors"
            >
              Open all in Jira
            </button>
          </div>
        )}
        <DataTable
          data={tableData}
          columns={tableColumns}
        />
      </div>
    );
  }

  // Bar chart rendering
  if (chartType === 'bar_chart') {
    const chartData = Array.isArray(data) ? data : [];
    const hasData = !loading && !error && chartData.length > 0;

    if (error) {
      return (
        <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
          {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading report...</div>
          </div>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-64 text-content-tertiary">
          No data available
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline">
          <p className="text-sm text-content-secondary">
            {chartData.length} {chartData.length === 1 ? 'data point' : 'data points'}
          </p>
        </div>
        <div className="flex-1 min-h-0" style={{ height: '400px' }}>
          <Chart
            type="bar"
            data={{
              labels: chartData.map(item => item.x_value || item[xAxisField] || ''),
              datasets: [{
                label: yAxisField === 'count' ? 'Count' : 'Value',
                data: chartData.map(item => item.y_value || item[yAxisField] || 0),
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  enabled: true
                },
                datalabels: {
                  display: true,
                  color: '#ffffff',
                  font: {
                    size: 12,
                    weight: 'bold' as const,
                  },
                  formatter: (value: number) => {
                    if (value === undefined || value === null || isNaN(value) || value === 0) {
                      return '';
                    }
                    return value.toString();
                  },
                  anchor: 'center' as const,
                  align: 'center' as const,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }}
            plugins={[ChartDataLabels]}
          />
        </div>
      </div>
    );
  }

  // Pie chart rendering
  if (chartType === 'pie_chart') {
    // Handle pie chart data (object with field names as keys)
    const isMultipleCharts = data && typeof data === 'object' && !Array.isArray(data);
    const chartDataMap: Record<string, Array<{x_value: any, y_value: number}>> = isMultipleCharts 
      ? data as Record<string, Array<{x_value: any, y_value: number}>>
      : { 'default': Array.isArray(data) ? (data as Array<{x_value: any, y_value: number}>) : [] };
    
    const chartFields = Object.keys(chartDataMap);
    const hasData = !loading && !error && chartFields.length > 0 && chartFields.some(field => {
      const fieldData = chartDataMap[field] || [];
      return fieldData.length > 0;
    });

    if (error) {
      return (
        <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
          {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading report...</div>
          </div>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-64 text-content-tertiary">
          No data available
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className={`grid ${chartFields.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-6 p-4`}>
          {chartFields.map((fieldName) => {
            const fieldData = chartDataMap[fieldName] || [];
            const totalCount = fieldData.reduce((sum, item) => sum + (item.y_value || 0), 0);
            const pieData = fieldData.map((item, index) => ({
              id: String(item.x_value || 'Unknown'),
              label: String(item.x_value || 'Unknown'),
              value: item.y_value || 0,
              color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            }));

            const displayName = (() => {
              if (fieldName === 'default') return 'Distribution';
              const fieldInfo = filterableFields.find(f => f.column_name === fieldName);
              return fieldInfo?.display_name || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            })();

            return (
              <div key={fieldName} className="flex flex-col bg-surface-elevated rounded-lg border border-outline p-4">
                <div className="mb-2 pb-2 border-b border-outline">
                  <h3 className="text-sm font-semibold text-content-primary">
                    {displayName}
                  </h3>
                  <p className="text-xs text-content-tertiary mt-1">
                    Total: {totalCount} {fieldData.length === 1 ? 'category' : 'categories'}
                  </p>
                </div>
                <div className="relative w-full h-[280px] overflow-visible flex-shrink-0">
                  <ResponsivePie
                    data={pieData}
                    margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
                    innerRadius={0}
                    padAngle={0.7}
                    cornerRadius={3}
                    activeOuterRadiusOffset={8}
                    borderWidth={2}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    colors={{ datum: 'data.color' }}
                    enableArcLinkLabels={true}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor={isDark ? '#f1f5f9' : '#111827'}
                    arcLinkLabelsThickness={2}
                    arcLinkLabelsColor={{ from: 'color' }}
                    arcLinkLabel={(d) => {
                      const percentage = totalCount > 0 ? ((d.value / totalCount) * 100).toFixed(1) : '0.0';
                      return `${d.value} (${percentage}%)`;
                    }}
                    theme={{
                      text: { fill: isDark ? '#cbd5e1' : '#374151' }
                    }}
                    enableArcLabels={false}
                    tooltip={({ datum }) => {
                      const percentage = totalCount > 0 ? ((datum.value / totalCount) * 100).toFixed(1) : '0.0';
                      return (
                        <div className="bg-surface p-3 border border-outline rounded-lg shadow-lg text-sm min-w-[300px]">
                          <p className="font-semibold text-content-primary mb-1">{datum.label}</p>
                          <p className="text-content-tertiary">{datum.value} {datum.value === 1 ? 'item' : 'items'} ({percentage}%)</p>
                        </div>
                      );
                    }}
                    legends={[]}
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
                  {pieData.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-content-secondary">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64 text-content-tertiary">
      Unsupported chart type: {chartType}
    </div>
  );
}

