'use client';

import React, { useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import IssuesDialog from '../reportViews/IssuesDialog';
import DataTable, { Column } from '../DataTable';

interface PRListItem {
  repository: string;
  number: number;
  title: string;
  author_login: string | null;
  state: string;
  updated_at: string;
  created_at?: string;
  html_url: string | null;
  requested_reviewers: string[];
  labels: string[];
  additions?: number;
  deletions?: number;
  maturity?: number;
}

interface PRListReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metric: string; // e.g., "prs-waiting-review", "prs-stale", "pr-size-by-period", "pr-maturity-by-period"
  title: string; // Metric label
  githubRepoIds?: string; // Optional filter
  period?: string; // YYYY-MM-DD format (optional)
  metricType?: 'core-kpi' | 'pr-size' | 'pr-maturity'; // Optional, for column customization
}

export default function PRListReportDialog({
  isOpen,
  onClose,
  metric,
  title,
  githubRepoIds,
  period,
  metricType,
}: PRListReportDialogProps) {
  const fetchFunction = useCallback(async () => {
    try {
      const params = new URLSearchParams({ metric });
      if (githubRepoIds) {
        params.append('github_repo_ids', githubRepoIds);
      }
      if (period) {
        params.append('period', period);
      }

      const response = await authFetch(
        `/api/v1/github-service/reports/pr-list?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          issues: data.data || [],
        },
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch PRs';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, [metric, githubRepoIds, period]);

  const columns: Column<PRListItem>[] = useMemo(
    () => {
      const baseColumns: Column<PRListItem>[] = [
        {
          key: 'repository',
          label: 'Repository',
          sortable: true,
          width: '15%',
        },
        {
          key: 'number',
          label: 'PR #',
          sortable: true,
          width: '8%',
          render: (value, row) => (
            <a
              href={row.html_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
              onClick={(e) => {
                if (!row.html_url) {
                  e.preventDefault();
                }
              }}
            >
              #{value}
            </a>
          ),
        },
        {
          key: 'title',
          label: 'Title',
          sortable: true,
          width: '30%',
        },
        {
          key: 'author_login',
          label: 'Author',
          sortable: true,
          width: '12%',
          render: (value) => value || '-',
        },
        {
          key: 'state',
          label: 'State',
          sortable: true,
          width: '8%',
          render: (value) => (
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                value === 'open'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {value}
            </span>
          ),
        },
      ];

      // Add date column - use created_at if available (for period-based queries), otherwise updated_at
      if (period && metricType) {
        baseColumns.push({
          key: 'created_at',
          label: 'Created',
          sortable: true,
          width: '12%',
          render: (value, row) => {
            const dateValue = value || row.updated_at;
            try {
              return new Date(dateValue).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            } catch {
              return dateValue;
            }
          },
        });
      } else {
        baseColumns.push({
          key: 'updated_at',
          label: 'Updated',
          sortable: true,
          width: '12%',
          render: (value) => {
            try {
              return new Date(value).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            } catch {
              return value;
            }
          },
        });
      }

      // Add metric-specific columns
      if (metricType === 'pr-size' && (period || metric.includes('pr-size'))) {
        baseColumns.push({
          key: 'additions',
          label: 'Lines Changed',
          sortable: true,
          width: '10%',
          render: (value, row) => {
            const total = (row.additions || 0) + (row.deletions || 0);
            return total > 0 ? total.toLocaleString() : '-';
          },
        });
      }

      if (metricType === 'pr-maturity' && (period || metric.includes('pr-maturity'))) {
        baseColumns.push({
          key: 'maturity',
          label: 'Maturity',
          sortable: true,
          width: '10%',
          render: (value) => {
            if (value !== undefined && value !== null) {
              return `${(value * 100).toFixed(1)}%`;
            }
            return '-';
          },
        });
      }

      // Add reviewers and labels only for core KPI metrics (not period-based)
      if (!period || metricType === 'core-kpi') {
        baseColumns.push(
          {
            key: 'requested_reviewers',
            label: 'Reviewers',
            sortable: false,
            width: '15%',
            render: (value) => {
              if (!value || value.length === 0) return '-';
              return (
                <div className="flex flex-wrap gap-1">
                  {value.map((reviewer: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {reviewer}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: 'labels',
            label: 'Labels',
            sortable: false,
            width: '15%',
            render: (value) => {
              if (!value || value.length === 0) return '-';
              return (
                <div className="flex flex-wrap gap-1">
                  {value.map((label: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              );
            },
          }
        );
      }

      return baseColumns;
    },
    [period, metricType, metric]
  );

  const rowKey = useCallback(
    (row: PRListItem, index: number) => `${row.repository}-${row.number}-${index}`,
    []
  );

  return (
    <IssuesDialog<PRListItem>
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      columns={columns}
      fetchFunction={fetchFunction}
      emptyMessage="No PRs found."
      rowKey={rowKey}
    />
  );
}
