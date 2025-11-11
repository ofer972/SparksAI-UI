'use client';

import React from 'react';
import { ApiService } from '@/lib/api';
import type { ReportDefinition, ReportInstancePayload } from '@/lib/config';
import {
  DEFAULT_REPORT_COMPONENT_REGISTRY,
  type ReportComponentConfig,
  type ReportComponentRegistry,
  type ReportRenderContext,
} from './reportComponentsRegistry';

type PrimitiveFilterValue = string | number | boolean;
type FilterValue =
  | PrimitiveFilterValue
  | PrimitiveFilterValue[]
  | null
  | undefined;

export interface ReportRendererProps {
  reportId: string;
  filters?: Record<string, FilterValue>;
  enabled?: boolean;
  componentOverrides?: ReportComponentRegistry;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: (errorMessage: string) => React.ReactNode;
  onResolved?: (payload: ReportInstancePayload) => void;
  refreshKey?: number;
}

const valueProvided = (value: FilterValue): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => {
      if (item === null || item === undefined) {
        return false;
      }
      if (typeof item === 'string') {
        return item.trim().length > 0;
      }
      return true;
    });
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};

const sanitizeFilters = (filters?: Record<string, FilterValue>): Record<string, FilterValue> => {
  if (!filters) {
    return {};
  }

  const sanitized: Record<string, FilterValue> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (valueProvided(value)) {
      if (Array.isArray(value)) {
        const normalized = value
          .map((item) => {
            if (item === null || item === undefined) {
              return null;
            }
            if (typeof item === 'string') {
              const trimmed = item.trim();
              return trimmed.length > 0 ? trimmed : null;
            }
            return item;
          })
          .filter((item): item is PrimitiveFilterValue => item !== null);
        if (normalized.length) {
          sanitized[key] = normalized;
        }
      } else if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

const buildFilterCacheKey = (filters: Record<string, FilterValue>): string => {
  const entries = Object.entries(filters)
    .filter(([, value]) => valueProvided(value))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        const normalized = value
          .map((item) => (item === null || item === undefined ? '' : String(item)))
          .filter((item) => item !== '');
        normalized.sort();
        return [key, normalized.join('|')];
      }
      return [key, value === undefined || value === null ? '' : String(value)];
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(entries);
};

const defaultMapProps = (context: ReportRenderContext) => ({
  data: context.result,
  loading: context.loading,
  error: context.error,
  meta: context.meta,
  definition: context.definition,
  filters: context.filters,
});

const ReportRenderer: React.FC<ReportRendererProps> = ({
  reportId,
  filters,
  enabled = true,
  componentOverrides,
  fallback = null,
  loadingFallback = null,
  errorFallback,
  onResolved,
  refreshKey = 0,
}) => {
  const registry = React.useMemo<ReportComponentRegistry>(() => {
    if (!componentOverrides) {
      return DEFAULT_REPORT_COMPONENT_REGISTRY;
    }
    return {
      ...DEFAULT_REPORT_COMPONENT_REGISTRY,
      ...componentOverrides,
    };
  }, [componentOverrides]);

  const reportConfig: ReportComponentConfig | undefined = registry[reportId];

  const sanitizedFilters = React.useMemo(() => sanitizeFilters(filters), [filters]);
  const filterCacheKey = React.useMemo(() => buildFilterCacheKey(sanitizedFilters), [sanitizedFilters]);

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [definition, setDefinition] = React.useState<ReportDefinition | null>(null);
  const [result, setResult] = React.useState<any>([]);
  const [meta, setMeta] = React.useState<Record<string, any> | null>(null);

  const requiredFilters = reportConfig?.requiredFilters ?? [];
  const missingFilters = requiredFilters.filter((filterKey) => !valueProvided(sanitizedFilters[filterKey]));

  const refresh = React.useCallback(() => {
    // This is a placeholder. The actual refresh is triggered by changing refreshKey.
    // The ReportPanel component is responsible for this.
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      return () => {
        isMounted = false;
      };
    }

    if (!reportConfig) {
      return () => {
        isMounted = false;
      };
    }

    if (missingFilters.length > 0) {
      setLoading(false);
      setError(null);
      setResult([]);
      setMeta(null);
      return () => {
        isMounted = false;
      };
    }

    const apiService = new ApiService();

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const payload = await apiService.getReport(reportId, sanitizedFilters);

        if (!isMounted) {
          return;
        }

        setDefinition(payload.definition);
        setResult(payload.result ?? []);
        setMeta(payload.meta ?? {});
        setLoading(false);

        if (onResolved) {
          onResolved(payload);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        console.error(`Error fetching report '${reportId}':`, err);
        const message =
          err instanceof Error ? err.message : `Failed to fetch report '${reportId}'`;
        setError(message);
        setLoading(false);
        setResult([]);
        setMeta(null);
      }
    };

    fetchReport();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, filterCacheKey, enabled, refreshKey]);

  if (!reportConfig) {
    return <>{fallback}</>;
  }

  if (!enabled) {
    return null;
  }

  if (loading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  if (error && errorFallback) {
    return <>{errorFallback(error)}</>;
  }

  const Component = reportConfig.component;

  const context: ReportRenderContext = {
    loading,
    error,
    result,
    meta,
    definition,
    filters: sanitizedFilters as Record<string, any>,
    missingFilters,
    requiredFilters,
    refresh,
  };

  const componentProps =
    reportConfig.mapProps?.(context) ?? defaultMapProps(context);

  return <Component {...componentProps} />;
};

export default ReportRenderer;


