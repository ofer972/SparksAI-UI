'use client';

import React from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import AuditTableReport, { AuditTableColumn } from './AuditTableReport';

interface TokenUsage {
  action: string;
  total_tokens: number;
  avg_tokens: number;
  request_count: number;
}

interface AuditTokenUsageViewProps {
  data: TokenUsage[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const columns: AuditTableColumn<TokenUsage>[] = [
  { key: 'action', label: 'Action', align: 'left', width: '150px', render: (value: string) => value || '—' },
  { key: 'total_tokens', label: 'Total Tokens', align: 'center', width: '50px' },
  { key: 'avg_tokens', label: 'Avg Tokens', align: 'center', width: '80px', render: (value: number) => value != null ? value.toFixed(1) : '—' },
  { key: 'request_count', label: 'Count', align: 'center', width: '60px' },
];

const AuditTokenUsageView: React.FC<AuditTokenUsageViewProps> = (props) => {
  return (
    <AuditTableReport<TokenUsage>
      title="Token Usage Analysis"
      reportId="audit-token-usage"
      columns={columns}
      defaultSortKey="total_tokens"
      searchFields={['action']}
      searchPlaceholder="Search action..."
      emptyMessage="No token usage data found"
      {...props}
    />
  );
};

export default AuditTokenUsageView;
