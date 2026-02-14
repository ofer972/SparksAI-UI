'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import DataTable, { Column, SortConfig } from '@/components/DataTable';
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

/** Pluralize a field display name for counts (e.g. "Priority" → "priorities", "Bug source" → "bug sources"). */
function pluralizeFieldName(displayName: string): string {
  if (!displayName) return 'categories';
  const parts = displayName.trim().split(/\s+/);
  const last = parts[parts.length - 1].toLowerCase();
  const rest = parts.slice(0, -1).join(' ');
  let plural: string;
  if (last.endsWith('y') && last.length > 1 && !/[aeiou]y$/.test(last)) {
    plural = last.slice(0, -1) + 'ies';
  } else if (last.endsWith('s') || last.endsWith('ch') || last.endsWith('sh')) {
    plural = last + 'es';
  } else {
    plural = last + 's';
  }
  const result = rest ? `${rest} ${plural}` : plural;
  return result.charAt(0).toUpperCase() + result.slice(1);
}

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
  /** Initial sort when viewing report (e.g. saved default sort) */
  initialSortConfig?: SortConfig | null;
  /** Called when a bar is clicked (report view drill-down). */
  onBarClick?: (payload: { x_value: string | number }) => void;
  /** Called when a pie slice is clicked (report view drill-down). */
  onPieSliceClick?: (payload: { x_value: string | number; fieldName?: string }) => void;
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
  initialSortConfig,
  onBarClick,
  onPieSliceClick,
}: GenericReportVisualizationProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(() =>
    initialSortConfig?.key ? { key: initialSortConfig.key, direction: initialSortConfig.direction } : { key: null, direction: 'asc' }
  );
  const [searchFilter, setSearchFilter] = useState('');
  const barChartRef = useRef<any>(null);
  const barContainerRef = useRef<HTMLDivElement>(null);
  const [barChartSize, setBarChartSize] = useState({ width: 600, height: 400 });
  useEffect(() => {
    if (chartType !== 'bar_chart' || !barContainerRef.current) return;
    const el = barContainerRef.current;
    const setSize = () => setBarChartSize({ width: el.clientWidth || 600, height: el.clientHeight || 400 });
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartType]);

  useEffect(() => {
    if (initialSortConfig?.key) {
      setSortConfig({ key: initialSortConfig.key, direction: initialSortConfig.direction });
    }
    // Do not reset to null when initialSortConfig is undefined - preserves saved default sort and avoids clearing when prop is temporarily missing (e.g. dashboard load).
  }, [initialSortConfig?.key, initialSortConfig?.direction]);

  const tableData = useMemo(
    () => (chartType === 'table' && Array.isArray(data) ? data : []),
    [chartType, data]
  );

  const filteredData = useMemo(() => {
    if (!searchFilter.trim()) return tableData;
    const q = searchFilter.trim().toLowerCase();
    return tableData.filter((row: Record<string, unknown>) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [tableData, searchFilter]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.key!];
      const bVal = (b as Record<string, unknown>)[sortConfig.key!];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  }, []);

  // Bar chart data and click handler - defined unconditionally so hook order is stable
  const chartDataBar = chartType === 'bar_chart' && Array.isArray(data) ? data : [];
  const labelsBar = useMemo(
    () => chartDataBar.map((item: any) => item.x_value ?? item[xAxisField] ?? ''),
    [chartDataBar, xAxisField]
  );
  const handleBarClick = useCallback(
    (_event: unknown, elements: { index?: number }[]) => {
      if (!onBarClick || !elements?.length || elements[0].index == null) return;
      const index = elements[0].index;
      const xVal = chartDataBar[index]?.x_value ?? chartDataBar[index]?.[xAxisField] ?? labelsBar[index];
      if (xVal !== undefined && xVal !== null) onBarClick({ x_value: xVal });
    },
    [onBarClick, chartDataBar, xAxisField, labelsBar]
  );

  // Table rendering
  if (chartType === 'table') {
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
      <div className="h-full overflow-auto flex flex-col">
        {/* Header: filter input, row count, Open all in Jira */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-outline flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search rows."
              className="px-2 py-1 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand min-w-[210px] max-w-[330px]"
              aria-label="Search table rows"
            />
            <p className="text-sm text-content-secondary whitespace-nowrap">
              {searchFilter.trim()
                ? `Showing ${sortedData.length} of ${tableData.length} ${tableData.length === 1 ? 'row' : 'rows'}`
                : `${sortedData.length} ${sortedData.length === 1 ? 'row' : 'rows'} found`}
            </p>
          </div>
          {jiraUrl && onOpenAllInJira && tableData.some((row: any) => row.issue_key) && (
            <button
              onClick={onOpenAllInJira}
              className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-colors flex-shrink-0"
            >
              Open all in Jira
            </button>
          )}
        </div>
        <DataTable
          data={sortedData}
          columns={tableColumns}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>
    );
  }

  // Bar chart rendering
  if (chartType === 'bar_chart') {
    const hasData = !loading && !error && chartDataBar.length > 0;

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
            {chartDataBar.length} {chartDataBar.length === 1 ? 'data point' : 'data points'}
          </p>
        </div>
        <div
          ref={barContainerRef}
          className="flex-1 min-h-0"
          style={{ height: '400px', cursor: onBarClick ? 'pointer' : 'default', minHeight: 0 }}
        >
          <Chart
            ref={barChartRef}
            type="bar"
            width={barChartSize.width}
            height={barChartSize.height}
            data={{
              labels: labelsBar,
              datasets: [{
                label: yAxisField === 'count' ? 'Count' : 'Value',
                data: chartDataBar.map((item: any) => item.y_value || item[yAxisField] || 0),
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              onClick: onBarClick ? handleBarClick : undefined,
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
              // Single pie chart from API uses key 'default' (no group-by field); use generic title
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
                    Total: {totalCount} {totalCount === 1 ? 'item' : 'items'} ({fieldData.length} {pluralizeFieldName(displayName)})
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
                    isInteractive={Boolean(onPieSliceClick)}
                    onClick={
                      onPieSliceClick
                        ? (datum: { id?: string | number; label?: string | number }) => {
                            const xVal = datum?.id ?? datum?.label;
                            if (xVal != null) {
                              onPieSliceClick({
                                x_value: typeof xVal === 'string' ? xVal : String(xVal),
                                fieldName: fieldName === 'default' ? undefined : fieldName,
                              });
                            }
                          }
                        : undefined
                    }
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

