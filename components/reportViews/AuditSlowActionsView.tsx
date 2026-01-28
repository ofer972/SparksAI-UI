'use client';

import React from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditTableReport, { AuditTableColumn } from './AuditTableReport';

interface SlowAction {
  endpoint_path: string;
  action: string;
  avg_response_time: number;
  max_response_time: number;
  request_count: number;
}

interface AuditSlowActionsViewProps {
  data: SlowAction[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const columns: AuditTableColumn<SlowAction>[] = [
  { key: 'action', label: 'Action', align: 'left', width: '165px', render: (value: string) => value || '—' },
  { key: 'endpoint_path', label: 'Endpoint', align: 'left', render: (value: string) => <div className="break-words whitespace-normal">{value || '—'}</div> },
  { key: 'avg_response_time', label: 'AVG RESP\n(s)', align: 'center', width: '80px', render: (value: number) => value != null ? value.toFixed(1) : '—' },
  { key: 'max_response_time', label: 'Max RESP\n(s)', align: 'center', width: '84px', render: (value: number) => value != null ? value.toFixed(1) : '—' },
  { key: 'request_count', label: 'Count', align: 'center', width: '60px' },
];

const AuditSlowActionsView: React.FC<AuditSlowActionsViewProps> = (props) => {
  return (
    <AuditTableReport<SlowAction>
      title="Slow Actions"
      reportId="audit-slow-actions"
      columns={columns}
      defaultSortKey="avg_response_time"
      searchFields={['action', 'endpoint_path']}
      searchPlaceholder="Search action or endpoint..."
      emptyMessage="No slow actions found"
      {...props}
    />
  );
};

export default AuditSlowActionsView;
