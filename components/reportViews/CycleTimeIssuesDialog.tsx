'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import { getCleanJiraUrl } from '@/lib/config';
import type { CycleTimeIssue } from '@/lib/config';
import DataTable, { Column, SortConfig } from '../DataTable';

interface CycleTimeIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  periodStart: string;
  periodEnd: string;
  issuetypes: string[];
  groupBy: 'day' | 'week' | 'month';
  teamName?: string | null;
  isGroup?: boolean;
}

export default function CycleTimeIssuesDialog({
  isOpen,
  onClose,
  periodStart,
  periodEnd,
  issuetypes,
  groupBy,
  teamName,
  isGroup = false,
}: CycleTimeIssuesDialogProps) {
  const [issues, setIssues] = useState<CycleTimeIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  const apiService = React.useMemo(() => new ApiService(), []);

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
        const result = await apiService.getCycleTimeIssues(
          periodStart,
          periodEnd,
          issuetypes,
          teamName || undefined,
          isGroup
        );

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
  }, [isOpen, periodStart, periodEnd, issuetypes, teamName, isGroup, apiService]);

  const formatPeriodLabel = (): string => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (groupBy === 'day') {
      return start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else if (groupBy === 'week') {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    }
  };

  const handleIssueKeyClick = useCallback((issueKey: string) => {
    const jiraUrl = getCleanJiraUrl();
    if (jiraUrl && issueKey) {
      window.open(`${jiraUrl}/browse/${issueKey}`, '_blank');
    }
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const jiraUrl = getCleanJiraUrl();

  const columns: Column<CycleTimeIssue>[] = useMemo(() => [
    {
      key: 'issue_key',
      label: 'ISSUE KEY',
      width: '12%',
      render: (value: string) => (
        <button
          onClick={() => handleIssueKeyClick(value)}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
        >
          {value}
        </button>
      ),
    },
    {
      key: 'summary',
      label: 'SUMMARY',
      align: 'left',
      maxLength: 80,
    },
    {
      key: 'cycle_time',
      label: 'CYCLE TIME',
      width: '10%',
      align: 'center',
      render: (value: number) => value.toFixed(1),
    },
    {
      key: 'resolved_at',
      label: 'RESOLVED AT',
      width: '12%',
      render: (value: string) => value, // Display as-is (YYYY-MM-DD format from backend)
    },
    {
      key: 'issue_type',
      label: 'ISSUE TYPE',
      width: '10%',
    },
    {
      key: 'team_name',
      label: 'TEAM',
      width: '15%',
    },
  ], [handleIssueKeyClick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Cycle Time Issues - {formatPeriodLabel()}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <DataTable<CycleTimeIssue>
            data={issues}
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
            error={error}
            emptyMessage="No issues found for the selected period."
            className="border-0 shadow-none h-full"
            rowKey={(row, index) => `${row.issue_key}-${index}`}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {issues.length} {issues.length === 1 ? 'row' : 'rows'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

