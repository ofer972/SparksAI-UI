'use client';

import React, { useMemo, useCallback, useState } from 'react';
import DataTable, { Column, SortConfig } from '../DataTable';

export interface CommitListItem {
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

export interface CommitListData {
  issues: CommitListItem[];
  total: number;
  total_commits_on_period: number;
}

interface CommitListReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  data: CommitListData | null;
  loading: boolean;
  error: string | null;
}

const COMMIT_LIST_COLUMNS: Column<CommitListItem>[] = [
  { key: '_row_number', label: '#', width: '5%', align: 'center', sortable: false, render: (_: unknown, __: CommitListItem, i: number) => i + 1 },
  { key: 'repository', label: 'Repository', sortable: true, width: '15%' },
  {
    key: 'sha',
    label: 'Commit SHA',
    sortable: true,
    width: '12%',
    render: (value, row) => (
      <a href={row.html_url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono text-sm" onClick={e => { if (!row.html_url) e.preventDefault(); }}>
        {value.substring(0, 7)}
      </a>
    ),
  },
  { key: 'author_login', label: 'Author', sortable: true, width: '12%', render: v => v || '-' },
  {
    key: 'commit_message',
    label: 'Commit Message',
    sortable: false,
    width: '30%',
    render: v => (v && v.length > 80 ? <span title={v}>{v.substring(0, 80)}...</span> : v || '-'),
  },
  {
    key: 'committed_at',
    label: 'Date',
    sortable: true,
    width: '12%',
    render: v => { try { return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return v; } },
  },
  { key: 'files_changed', label: 'Files', sortable: true, width: '8%', render: v => v ?? 0 },
  { key: 'additions', label: 'Additions', sortable: true, width: '10%', render: v => (v ?? 0).toLocaleString() },
  { key: 'deletions', label: 'Deletions', sortable: true, width: '10%', render: v => (v ?? 0).toLocaleString() },
];

function formatPeriodDate(period: string): string {
  try {
    return new Date(period + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return period;
  }
}

export default function CommitListReportDialog({
  isOpen,
  onClose,
  period,
  data,
  loading,
  error,
}: CommitListReportDialogProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  }, []);
  const rowKey = useCallback((row: CommitListItem, i: number) => `${row.repository}-${row.sha}-${i}`, []);

  const subtitle = data && data.total_commits_on_period != null
    ? `${data.total} rework commits (of ${data.total_commits_on_period} total on this day)${data.total_commits_on_period > 0 ? ` — ${((data.total / data.total_commits_on_period) * 100).toFixed(1)}% rework` : ''}`
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="border-b border-outline bg-surface-elevated px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-content-primary">Rework Commits on {formatPeriodDate(period)}</h3>
              {subtitle && <p className="text-sm text-content-secondary mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="text-content-muted hover:text-content-secondary transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0" style={{ padding: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', maxHeight: 'calc(90vh - 260px)', overflow: 'hidden' }}>
          <DataTable<CommitListItem>
            data={data?.issues ?? []}
            columns={COMMIT_LIST_COLUMNS}
            sortConfig={sortConfig}
            onSort={handleSort}
            loading={loading}
            error={error}
            emptyMessage="No rework commits found for this period."
            className="border-0 shadow-none h-full"
            rowKey={rowKey}
          />
        </div>
        <div className="border-t border-outline px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
