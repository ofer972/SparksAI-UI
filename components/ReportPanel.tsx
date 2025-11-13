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
        const next = mergeFilters(prev, controlledFilters);
        if (Object.keys(controlledFilters).length === 0) {
          const cleared: FiltersState = { ...next };
          for (const key of Object.keys(prev)) {
            if (!(key in (initialFilters ?? {}))) {
              delete cleared[key];
            }
          }
          return cleared;
        }
        return next;
      });
    }
  }, [controlledKey, controlledFilters, initialFilters]);

  const setFilters = React.useCallback(
    (updater: FiltersUpdater) => {
      setLocalFilters((prev) => {
        const updated =
          typeof updater === 'function'
            ? updater(prev)
            : mergeFilters(prev, updater);
        onFiltersChange?.(updated);
        return updated;
      });
    },
    [onFiltersChange]
  );

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
            componentProps: { ...componentProps, reportId },
            missingFilters: context.missingFilters,
            requiredFilters: context.requiredFilters,
          };
        },
      },
    };
  }, [componentProps, currentFilters, entry, refresh, reportId, setFilters]);

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
