'use client';

import React from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditTableReport, { AuditTableColumn } from './AuditTableReport';

interface FrequentlyUsedAction {
  action: string;
  endpoint_path: string;
  count: number;
  percentage: number;
  avg_response_time: number;
}

interface AuditFrequentlyUsedActionsViewProps {
  data: FrequentlyUsedAction[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const columns: AuditTableColumn<FrequentlyUsedAction>[] = [
  { key: 'action', label: 'Action', align: 'left', width: '165px', render: (value: string) => value || '—' },
  { key: 'endpoint_path', label: 'Endpoint', align: 'left', render: (value: string) => <div className="break-words whitespace-normal">{value || '—'}</div> },
  { key: 'count', label: 'Count', align: 'center', width: '60px' },
  { key: 'percentage', label: '%', align: 'center', width: '70px', render: (value: number) => value != null ? `${value.toFixed(1)}%` : '—' },
  { key: 'avg_response_time', label: 'AVG RESP', align: 'center', width: '80px', render: (value: number) => value != null ? value.toFixed(1) : '—' },
];

const AuditFrequentlyUsedActionsView: React.FC<AuditFrequentlyUsedActionsViewProps> = (props) => {
  return (
    <AuditTableReport<FrequentlyUsedAction>
      title="Frequently Used Actions"
      reportId="audit-frequently-used-actions"
      columns={columns}
      defaultSortKey="count"
      searchFields={['action', 'endpoint_path']}
      searchPlaceholder="Search action or endpoint..."
      emptyMessage="No actions found"
      {...props}
    />
  );
};

export default AuditFrequentlyUsedActionsView;
