/**
 * Chart Options Utilities for GitHub Metrics
 * 
 * Extracts common chart configuration while maintaining full flexibility
 * for per-metric customization.
 */

import { ChartOptions } from 'chart.js';

/**
 * Base chart options that are common across all GitHub metric charts
 */
const baseChartOptions: Partial<ChartOptions> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
};

/**
 * Common X-axis configuration for time-series charts (with date labels)
 */
export const timeSeriesXAxis = {
  ticks: {
    maxRotation: 45,
    minRotation: 45,
  },
};

/**
 * Base datalabels configuration (styling only, formatter is always custom)
 */
const baseDatalabelsConfig = {
  anchor: 'end' as const,
  align: 'top' as const,
  color: '#4B5563',
  font: {
    weight: 'bold' as const,
    size: 10,
  },
};

/**
 * Creates base chart options with optional overrides
 * 
 * @param overrides - Custom options that will override base options
 * @param includeDatalabels - Whether to include base datalabels config (default: false)
 * @param isDark - Whether dark mode is active (default: false)
 * @returns Merged chart options
 * 
 * @example
 * ```typescript
 * const chartOptions = useMemo(() => {
 *   return createBaseChartOptions({
 *     plugins: {
 *       datalabels: {
 *         ...baseDatalabelsConfig,
 *         formatter: (value) => value.toString() // Custom formatter
 *       },
 *       tooltip: {
 *         callbacks: {
 *           label: (context) => `Custom: ${context.parsed.y}` // Custom tooltip
 *         }
 *       }
 *     },
 *     scales: {
 *       y: {
 *         title: { text: 'Custom Title' }, // Custom Y-axis
 *         max: 100
 *       },
 *       x: timeSeriesXAxis // Use common X-axis config
 *     },
 *     onClick: (event, elements) => { // Custom click handler
 *       // Handle click
 *     }
 *   }, true, isDark); // Include base datalabels config and pass isDark
 * }, [data, isDark]);
 * ```
 */
export function createBaseChartOptions(
  overrides: Partial<ChartOptions> = {},
  includeDatalabels: boolean = false,
  isDark: boolean = false
): ChartOptions {
  const base = { ...baseChartOptions };

  // Theme-aware colors for axis ticks, titles, and grid
  const axisTextColor = isDark ? '#cbd5e1' : '#374151';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  // If datalabels are requested, merge base datalabels config
  if (includeDatalabels && overrides.plugins?.datalabels) {
    base.plugins = {
      ...base.plugins,
      datalabels: {
        ...baseDatalabelsConfig,
        ...overrides.plugins.datalabels,
      },
    };
  }

  // Helper to add theme colors to an axis config
  const addThemeColors = (axisConfig: any) => {
    if (!axisConfig) return axisConfig;
    
    return {
      ...axisConfig,
      // Add color to ticks (always include ticks if axis exists)
      ticks: {
        ...(axisConfig.ticks || {}),
        color: axisTextColor,
      },
      // Add color to title if title exists
      ...(axisConfig.title ? {
        title: {
          ...axisConfig.title,
          color: axisTextColor,
        }
      } : {}),
      // Always add grid color for visibility in all themes
      grid: {
        ...(axisConfig.grid || {}),
        color: gridColor,
      },
    };
  };

  // Build scales with theme colors added
  const scales = overrides.scales ? {
    ...overrides.scales,
    // Add theme colors to x and y axes if they exist
    ...(overrides.scales.x ? { x: addThemeColors(overrides.scales.x) } : {}),
    ...(overrides.scales.y ? { y: addThemeColors(overrides.scales.y) } : {}),
  } : {};

  return {
    ...base,
    ...overrides,
    plugins: {
      ...base.plugins,
      ...overrides.plugins,
      // Ensure datalabels merge correctly if both exist
      ...(includeDatalabels && overrides.plugins?.datalabels
        ? {
            datalabels: {
              ...baseDatalabelsConfig,
              ...overrides.plugins.datalabels,
            },
          }
        : {}),
    },
    scales,
  } as ChartOptions;
}

/**
 * Helper to create time-series chart options (bar/line charts with date labels)
 * 
 * @param customOptions - Custom options specific to the metric
 * @param isDark - Whether dark mode is active (default: false)
 * @returns Chart options with time-series X-axis configured
 */
export function createTimeSeriesChartOptions(
  customOptions: Partial<ChartOptions> = {},
  isDark: boolean = false
): ChartOptions {
  const mergedScales = {
    ...customOptions.scales,
    x: {
      ...timeSeriesXAxis,
      ...(customOptions.scales?.x || {}),
    },
  } as any;

  return createBaseChartOptions(
    {
      ...customOptions,
      scales: mergedScales,
    } as Partial<ChartOptions>,
    true, // Include base datalabels config for time-series charts
    isDark
  );
}

/**
 * Helper to create scatter plot chart options (no datalabels, no X-axis rotation)
 * 
 * @param customOptions - Custom options specific to the metric
 * @param isDark - Whether dark mode is active (default: false)
 * @returns Chart options for scatter plots
 */
export function createScatterChartOptions(
  customOptions: Partial<ChartOptions> = {},
  isDark: boolean = false
): ChartOptions {
  return createBaseChartOptions(customOptions, false, isDark);
}

/**
 * Options for a count-based bar chart (histogram).
 * Y = count, X = category labels. Theme-aware.
 */
export function createHistogramChartOptions(
  customOptions: Partial<ChartOptions> = {},
  isDark: boolean = false
): ChartOptions {
  return createBaseChartOptions(
    {
      ...customOptions,
      scales: {
        x: { title: { display: true, text: 'Pickup time' }, ...customOptions.scales?.x },
        y: { beginAtZero: true, title: { display: true, text: 'PRs' }, ...customOptions.scales?.y },
      },
    },
    false,
    isDark
  );
}

