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
  initialPinnedFilters?: string[]; // Saved pinned filter keys to restore on load
  onFiltersChange?: (filters: FiltersState) => void;
  onPinnedFiltersChange?: (pinnedFilterKeys: string[]) => void;
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
  initialPinnedFilters,
  onFiltersChange,
  onPinnedFiltersChange,
  enabled = true,
  ...rendererProps
}) => {
  // Detect custom reports and route to 'custom-report' entry
  const isCustomReport = reportId.startsWith('custom-');
  const lookupReportId = isCustomReport ? 'custom-report' : reportId;
  const entry = registry[lookupReportId];

  const [localFilters, setLocalFilters] = React.useState<FiltersState>(() =>
    initialFilters ? { ...initialFilters } : {}
  );
  const [refreshKey, setRefreshKey] = React.useState(0);
  const bypassCacheRef = React.useRef(false);
  
  // Track which filter keys are pinned (custom/locked)
  // Initialize with saved pinned filters if provided
  const [pinnedFilters, setPinnedFilters] = React.useState<Set<string>>(() => 
    new Set(initialPinnedFilters || [])
  );

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

  // Emit current filters to parent whenever they change (including initial mount)
  // This ensures the parent can track the current filter state including any defaults
  const prevFiltersRef = React.useRef<string>('');
  React.useEffect(() => {
    const filtersJson = JSON.stringify(localFilters);
    // Only emit if filters have actually changed to avoid infinite loops
    if (filtersJson !== prevFiltersRef.current) {
      prevFiltersRef.current = filtersJson;
      onFiltersChange?.(localFilters);
    }
  }, [localFilters, onFiltersChange]);

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
              
              // Notify parent of pinned filters change
              onPinnedFiltersChange?.(Array.from(newPinned));
              
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
      const wasPinned = newPinned.has(filterKey);
      
      if (wasPinned) {
        newPinned.delete(filterKey);
        
        // When unpinning team_name, also unpin isGroup and team since they're related
        // This ensures the filter type (Team vs Group) updates correctly
        if (filterKey === 'team_name') {
          if (newPinned.has('isGroup')) {
            newPinned.delete('isGroup');
          }
          if (newPinned.has('team')) {
            newPinned.delete('team');
          }
        }
        
        // When unpinning, immediately apply ALL controlled filter values (not just the unpinned one)
        // This ensures related filters like team_name and isGroup stay in sync
        if (controlledFilters) {
          setLocalFilters((prevFilters) => {
            const updated = { ...prevFilters };
            
            // Apply all controlled values for unpinned filters
            Object.entries(controlledFilters).forEach(([key, value]) => {
              if (!newPinned.has(key)) {
                updated[key] = value;
              }
            });
            
            // Notify parent immediately
            onFiltersChange?.(updated);
            
            return updated;
          });
        }
      } else {
        newPinned.add(filterKey);
      }
      
      // Notify parent of pinned filters change
      const pinnedArray = Array.from(newPinned);
      onPinnedFiltersChange?.(pinnedArray);
      
      return newPinned;
    });
  }, [controlledFilters, onPinnedFiltersChange, onFiltersChange, reportId]);

  const resetBypassCache = React.useCallback(() => {
    bypassCacheRef.current = false;
  }, []);

  const refresh = React.useCallback(() => {
    bypassCacheRef.current = true;
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
            componentProps: { hideCollapse: true, ...componentProps, reportId },
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

  const bypassCache = bypassCacheRef.current;

  return (
    <div className="h-full">
      <ReportRenderer
        {...rendererProps}
        enabled={enabled}
        reportId={reportId}
        filters={currentFilters}
        refreshKey={refreshKey}
        bypassCache={bypassCache}
        onBypassCacheUsed={resetBypassCache}
        componentOverrides={overrides}
      />
    </div>
  );
};

export default ReportPanel;
