'use client';

import React from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditTableReport, { AuditTableColumn } from './AuditTableReport';

interface FailedEndpoint {
  action: string;
  endpoint_path: string;
  status_code: number;
  count: number;
  percentage: number;
}

interface AuditFailedEndpointsViewProps {
  data: FailedEndpoint[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const columns: AuditTableColumn<FailedEndpoint>[] = [
  { key: 'action', label: 'Action', align: 'left', width: '165px', render: (value: string) => value || '—' },
  { key: 'endpoint_path', label: 'Endpoint', align: 'left', render: (value: string) => <div className="break-words whitespace-normal">{value || '—'}</div> },
  { key: 'status_code', label: 'Code', align: 'center', width: '70px' },
  { key: 'count', label: 'Count', align: 'center', width: '60px' },
  { key: 'percentage', label: '%', align: 'center', width: '70px', render: (value: number) => value != null ? `${value.toFixed(1)}%` : '—' },
];

const AuditFailedEndpointsView: React.FC<AuditFailedEndpointsViewProps> = (props) => {
  return (
    <AuditTableReport<FailedEndpoint>
      title="Failed Endpoints"
      reportId="audit-failed-endpoints"
      columns={columns}
      defaultSortKey="count"
      searchFields={['action', 'endpoint_path']}
      searchPlaceholder="Search action or endpoint..."
      emptyMessage="No failed endpoints found"
      {...props}
    />
  );
};

export default AuditFailedEndpointsView;
