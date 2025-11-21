'use client';

import React from 'react';
import ReportRenderer, { ReportRendererProps } from './ReportRenderer';
import {
  DEFAULT_REPORT_COMPONENT_REGISTRY,
  type ReportComponentRegistry,
  type ReportRenderContext,
} from './reportComponentsRegistry';

type PrimitiveFilterValue = string | number | boolean;
type ReportFilterValue =
  | PrimitiveFilterValue
  | PrimitiveFilterValue[]
  | null
  | undefined;

type FiltersState = Record<string, ReportFilterValue>;

type FiltersUpdater =
  | FiltersState
  | ((prev: FiltersState) => FiltersState);

interface ReportPanelProps
  extends Omit<
    ReportRendererProps,
    'componentOverrides' | 'reportId' | 'filters' | 'refreshKey'
  > {
  reportId: string;
  registry?: ReportComponentRegistry;
  componentProps?: Record<string, any>;
  initialFilters?: FiltersState;
  controlledFilters?: FiltersState;
  onFiltersChange?: (filters: FiltersState) => void;
}

const mergeFilters = (
  base: FiltersState,
  override?: FiltersState
): FiltersState => {
  if (!override) {
    return base;
  }
  const next: FiltersState = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
};

// Helper to compare filter values (handles arrays and primitives)
const areFiltersEqual = (val1: any, val2: any): boolean => {
  if (val1 === val2) return true;
  if (val1 == null || val2 == null) return val1 === val2;
  
  // Array comparison
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    return val1.every((item, index) => item === val2[index]);
  }
  
  return false;
};

const ReportPanel: React.FC<ReportPanelProps> = ({
  reportId,
  registry = DEFAULT_REPORT_COMPONENT_REGISTRY,
  componentProps,
  initialFilters,
  controlledFilters,
  onFiltersChange,
  enabled = true,
  ...rendererProps
}) => {
  const entry = registry[reportId];

  const [localFilters, setLocalFilters] = React.useState<FiltersState>(() =>
    initialFilters ? { ...initialFilters } : {}
  );
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Track which filter keys are pinned (custom/locked)
  const [pinnedFilters, setPinnedFilters] = React.useState<Set<string>>(new Set());

  const controlledKey = React.useMemo(
    () => JSON.stringify(controlledFilters || {}),
    [controlledFilters]
  );

  React.useEffect(() => {
    if (initialFilters) {
      setLocalFilters((prev) => mergeFilters(initialFilters, prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (controlledFilters) {
      setLocalFilters((prev) => {
        // Only apply controlled filters for keys that are not pinned
        const filteredControlled: FiltersState = {};
        for (const [key, value] of Object.entries(controlledFilters)) {
          if (!pinnedFilters.has(key)) {
            filteredControlled[key] = value;
          }
        }
        
        const next = mergeFilters(prev, filteredControlled);
        if (Object.keys(controlledFilters).length === 0) {
          const cleared: FiltersState = { ...next };
          for (const key of Object.keys(prev)) {
            if (!(key in (initialFilters ?? {})) && !pinnedFilters.has(key)) {
              delete cleared[key];
            }
          }
          return cleared;
        }
        return next;
      });
    }
  }, [controlledKey, controlledFilters, initialFilters, pinnedFilters]);

  const setFilters = React.useCallback(
    (updater: FiltersUpdater) => {
      setLocalFilters((prev) => {
        const updated =
          typeof updater === 'function'
            ? updater(prev)
            : mergeFilters(prev, updater);
        
        // Auto-pin filters that are changed manually (detect if controlled filters exist)
        if (controlledFilters) {
          const changedKeys = new Set<string>();
          for (const key of Object.keys(updated)) {
            if (key in controlledFilters && !areFiltersEqual(updated[key], controlledFilters[key])) {
              changedKeys.add(key);
            }
          }
          if (changedKeys.size > 0) {
            setPinnedFilters((prevPinned) => {
              const newPinned = new Set(prevPinned);
              changedKeys.forEach((key) => newPinned.add(key));
              return newPinned;
            });
          }
        }
        
        onFiltersChange?.(updated);
        return updated;
      });
    },
    [onFiltersChange, controlledFilters]
  );

  const togglePin = React.useCallback((filterKey: string) => {
    setPinnedFilters((prev) => {
      const newPinned = new Set(prev);
      if (newPinned.has(filterKey)) {
        newPinned.delete(filterKey);
        
        // When unpinning, apply the controlled filter value if available
        if (controlledFilters && filterKey in controlledFilters) {
          setLocalFilters((prevFilters) => ({
            ...prevFilters,
            [filterKey]: controlledFilters[filterKey],
          }));
        }
      } else {
        newPinned.add(filterKey);
      }
      return newPinned;
    });
  }, [controlledFilters]);

  const refresh = React.useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const currentFilters = React.useMemo(
    () => ({ ...localFilters }),
    [localFilters]
  );

  const overrides = React.useMemo(() => {
    if (!entry) {
      return undefined;
    }

    return {
      [reportId]: {
        component: entry.component,
        requiredFilters: entry.requiredFilters,
        mapProps: (context: ReportRenderContext) => {
          const baseProps = entry.mapProps
            ? entry.mapProps(context)
            : {
                data: context.result,
                loading: context.loading,
                error: context.error,
                meta: context.meta,
                definition: context.definition,
              };

          return {
            ...baseProps,
            filters: currentFilters,
            setFilters,
            refresh,
            togglePin,
            pinnedFilters: Array.from(pinnedFilters),
            componentProps: { ...componentProps, reportId },
            missingFilters: context.missingFilters,
            requiredFilters: context.requiredFilters,
          };
        },
      },
    };
  }, [componentProps, currentFilters, entry, refresh, reportId, setFilters, togglePin, pinnedFilters]);

  if (!entry) {
    const fallback = rendererProps.fallback ?? null;
    return <>{fallback}</>;
  }

  return (
    <div className="h-full">
      <ReportRenderer
        {...rendererProps}
        enabled={enabled}
        reportId={reportId}
        filters={currentFilters}
        refreshKey={refreshKey}
        componentOverrides={overrides}
      />
    </div>
  );
};

export default ReportPanel;
