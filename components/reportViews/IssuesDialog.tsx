'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable, { Column, SortConfig } from '../DataTable';

export interface IssuesDialogProps<T extends Record<string, any>> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  columns: Column<T>[];
  fetchFunction: () => Promise<{ success: boolean; data?: { issues: T[] }; message?: string }>;
  jiraUrl?: string;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string;
}

export default function IssuesDialog<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  columns,
  fetchFunction,
  jiraUrl,
  emptyMessage = 'No issues found.',
  rowKey,
}: IssuesDialogProps<T>) {
  const [issues, setIssues] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  useEffect(() => {
    if (!isOpen) {
      setIssues([]);
      setError(null);
      return;
    }

    const fetchIssues = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFunction();

        if (result.success && result.data && Array.isArray(result.data.issues)) {
          setIssues(result.data.issues);
        } else {
          setIssues([]);
          setError(result.message || 'Failed to fetch issues');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch issues';
        setError(errorMessage);
        setIssues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [isOpen, fetchFunction]);

  const handleIssueKeyClick = useCallback((issueKey: string) => {
    if (jiraUrl && issueKey) {
      window.open(`${jiraUrl}/browse/${issueKey}`, '_blank');
    }
  }, [jiraUrl]);

  const handleOpenAllInJira = useCallback(() => {
    if (!jiraUrl || issues.length === 0) return;
    
    const issueKeys = issues
      .map(issue => (issue as any).issue_key)
      .filter((key): key is string => Boolean(key));
    
    if (issueKeys.length === 0) return;
    
    const keysParam = issueKeys.join(',');
    const jql = encodeURIComponent(`key IN (${keysParam})`);
    const jiraLink = `${jiraUrl}/issues/?jql=${jql}`;
    window.open(jiraLink, '_blank', 'noopener,noreferrer');
  }, [jiraUrl, issues]);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Enhance columns to make issue_key clickable if jiraUrl is provided
  // Also add row number column as the leftmost column
  const enhancedColumns = useMemo(() => {
    // Add row number column as the first column
    const rowNumberColumn: Column<T> = {
      key: '_row_number',
      label: '#',
      width: '5%',
      align: 'center' as const,
      sortable: false,
      render: (_value: any, _row: T, index: number) => {
        return index + 1;
      },
    };

    // Process existing columns
    const processedColumns = columns.map(col => {
      if (col.key === 'issue_key' && jiraUrl) {
        return {
          ...col,
          render: (value: string) => (
            <button
              onClick={() => handleIssueKeyClick(value)}
              className="text-brand hover:text-blue-800 hover:underline cursor-pointer font-medium"
            >
              {value}
            </button>
          ),
        };
      }
      return col;
    });

    // Return row number column first, then processed columns
    return [rowNumberColumn, ...processedColumns];
  }, [columns, jiraUrl, handleIssueKeyClick]);

  const defaultRowKey = useCallback((row: T, index: number) => {
    if (rowKey) {
      return rowKey(row, index);
    }
    // Default: try to use issue_key if available, otherwise use index
    return (row as any).issue_key ? `${(row as any).issue_key}-${index}` : `row-${index}`;
  }, [rowKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-outline bg-surface-elevated px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-content-primary">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-content-muted hover:text-content-secondary transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 min-h-0"
          style={{
            padding: '1.5rem',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(90vh - 260px)',
            overflow: 'hidden',
          }}
        >
          <DataTable<T>
            data={issues}
            columns={enhancedColumns}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            className="border-0 shadow-none h-full"
            rowKey={defaultRowKey}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-outline px-6 py-4 flex justify-end items-center gap-3">
          {jiraUrl && issues.length > 0 && (
            <button
              onClick={handleOpenAllInJira}
              className="px-4 py-2 border border-outline text-content-primary rounded-md hover:bg-surface-secondary transition-colors"
              disabled={!jiraUrl || issues.length === 0}
            >
              Open all in Jira
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

