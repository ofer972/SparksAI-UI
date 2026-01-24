'use client';

import React, { useMemo, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import IssuesDialog from '../reportViews/IssuesDialog';
import DataTable, { Column } from '../DataTable';

interface CommitListItem {
  repository: string;
  sha: string;
  author_login: string | null;
  commit_message: string;
  committed_at: string;
  html_url: string | null;
  files_changed: number;
  additions: number;
  deletions: number;
}

interface CommitListReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  period: string; // YYYY-MM-DD format (required)
  githubRepoIds?: string; // Optional filter
}

export default function CommitListReportDialog({
  isOpen,
  onClose,
  period,
  githubRepoIds,
}: CommitListReportDialogProps) {
  const formatDate = (period: string): string => {
    try {
      const date = new Date(period + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return period;
    }
  };

  const fetchFunction = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (githubRepoIds) {
        params.append('github_repo_ids', githubRepoIds);
      }

      const response = await authFetch(
        `/api/v1/github-service/reports/commit-list?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
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
        err instanceof Error ? err.message : 'Failed to fetch commits';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, [period, githubRepoIds]);

  const columns: Column<CommitListItem>[] = useMemo(
    () => [
      {
        key: 'repository',
        label: 'Repository',
        sortable: true,
        width: '15%',
      },
      {
        key: 'sha',
        label: 'Commit SHA',
        sortable: true,
        width: '12%',
        render: (value, row) => (
          <a
            href={row.html_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-mono text-sm"
            onClick={(e) => {
              if (!row.html_url) {
                e.preventDefault();
              }
            }}
          >
            {value.substring(0, 7)}
          </a>
        ),
      },
      {
        key: 'author_login',
        label: 'Author',
        sortable: true,
        width: '12%',
        render: (value) => value || '-',
      },
      {
        key: 'commit_message',
        label: 'Commit Message',
        sortable: false,
        width: '30%',
        render: (value) => {
          const maxLength = 80;
          if (value && value.length > maxLength) {
            return (
              <span title={value}>
                {value.substring(0, maxLength)}...
              </span>
            );
          }
          return value || '-';
        },
      },
      {
        key: 'committed_at',
        label: 'Date',
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
      },
      {
        key: 'files_changed',
        label: 'Files',
        sortable: true,
        width: '8%',
        render: (value) => value || 0,
      },
      {
        key: 'additions',
        label: 'Additions',
        sortable: true,
        width: '10%',
        render: (value) => (value || 0).toLocaleString(),
      },
      {
        key: 'deletions',
        label: 'Deletions',
        sortable: true,
        width: '10%',
        render: (value) => (value || 0).toLocaleString(),
      },
    ],
    []
  );

  const rowKey = useCallback(
    (row: CommitListItem, index: number) => `${row.repository}-${row.sha}-${index}`,
    []
  );

  return (
    <IssuesDialog<CommitListItem>
      isOpen={isOpen}
      onClose={onClose}
      title={`Rework Commits on ${formatDate(period)}`}
      columns={columns}
      fetchFunction={fetchFunction}
      emptyMessage="No rework commits found for this period."
      rowKey={rowKey}
    />
  );
}
