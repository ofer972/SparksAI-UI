'use client';

import React, { useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import type { CycleTimeIssue } from '@/lib/config';
import IssuesDialog, { IssuesDialogProps } from './IssuesDialog';
import DataTable, { Column } from '../DataTable';

interface CycleTimeIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  periodStart: string;
  periodEnd: string;
  issuetypes: string[];
  groupBy: 'day' | 'week' | 'month';
  teamName?: string | null;
  isGroup?: boolean;
  jiraUrl?: string;
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
  jiraUrl,
}: CycleTimeIssuesDialogProps) {
  const apiService = React.useMemo(() => new ApiService(), []);

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

  const fetchFunction = useCallback(async () => {
    return await apiService.getCycleTimeIssues(
      periodStart,
      periodEnd,
      issuetypes,
      teamName || undefined,
      isGroup
    );
  }, [periodStart, periodEnd, issuetypes, teamName, isGroup, apiService]);

  const columns: Column<CycleTimeIssue>[] = useMemo(() => [
    {
      key: 'issue_key',
      label: 'ISSUE KEY',
      width: '12%',
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
  ], []);

  return (
    <IssuesDialog<CycleTimeIssue>
      isOpen={isOpen}
      onClose={onClose}
      title={`Cycle Time Issues - ${formatPeriodLabel()}`}
      columns={columns}
      fetchFunction={fetchFunction}
      jiraUrl={jiraUrl}
      emptyMessage="No issues found for the selected period."
      rowKey={(row, index) => `${row.issue_key}-${index}`}
    />
  );
}

