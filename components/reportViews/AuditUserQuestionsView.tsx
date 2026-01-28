'use client';

import React, { useMemo, useState } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import { DataTable } from '../DataTable';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface UserQuestion {
  created_at: string;
  user_id: string;
  question: string;
  answer: string;
  tokens_used: number;
  response_time_seconds: number;
  status_code: number;
  insights_id: number | null;
}

interface AuditUserQuestionsViewProps {
  data: UserQuestion[] | null | undefined;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any> | null;
}

const AuditUserQuestionsView: React.FC<AuditUserQuestionsViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
}) => {
  const months = (filters?.months as number) ?? 1;
  const [searchQuery, setSearchQuery] = useState((filters?.search_query as string) || '');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      const question = item.question || '';
      return question.toLowerCase().includes(query);
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof UserQuestion];
      const bVal = b[sortConfig.key as keyof UserQuestion];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const columns = useMemo(
    () => [
      { key: 'created_at', label: 'Date', align: 'left' as const, sortable: true, width: '140px', render: (value: string) => {
        if (!value) return '—';
        const date = new Date(value);
        return date.toLocaleString('en-GB', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      }},
      { key: 'user_id', label: 'User ID', align: 'left' as const, sortable: true, width: '220px' },
      { key: 'question', label: 'Question', align: 'left' as const, sortable: false, render: (value: string, row: UserQuestion) => {
        const questionText = value || row?.question || '';
        if (!questionText || !questionText.trim()) {
          return '—';
        }
        return <div className="break-words whitespace-normal">{questionText}</div>;
      } },
      { key: 'answer', label: 'Answer', align: 'left' as const, sortable: false, render: (value: string) => {
        if (!value || !value.trim()) {
          return '—';
        }
        return <div className="break-words whitespace-normal">{value}</div>;
      } },
      { key: 'tokens_used', label: 'Tokens', align: 'center' as const, sortable: true, width: '60px' },
      { key: 'response_time_seconds', label: 'Response\nTime (s)', align: 'center' as const, sortable: true, render: (value: number) => value != null ? value.toFixed(1) : '—', width: '80px' },
      { key: 'status_code', label: 'Code', align: 'center' as const, sortable: true, width: '70px' },
      { key: 'insights_id', label: 'Insight ID', align: 'center' as const, sortable: true, width: '80px', render: (value: number | null) => value != null ? value : '—' },
    ],
    []
  );

  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string }[] = [];
    if (months) {
      const period = TIME_PERIOD_OPTIONS.find((opt) => opt.value === months);
      if (period) {
        badges.push({ label: 'Period', value: period.label });
      }
    }
    if (searchQuery) {
      badges.push({ label: 'Search', value: searchQuery });
    }
    return badges;
  }, [months, searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setFilters((prev) => ({ ...prev, search_query: value || undefined }));
  };

  if (loading) {
    return (
      <ReportCard title="User Questions" reportId="audit-user-questions" filterBadges={filterBadges} onRefresh={refresh} hideCollapse={true}>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-tertiary">Loading user questions...</div>
          </div>
        </div>
      </ReportCard>
    );
  }

  return (
    <ReportCard title="User Questions" reportId="audit-user-questions" filterBadges={filterBadges} onRefresh={refresh} hideCollapse={true}>
      <ReportFiltersRow>
        <ReportFilterField label="Time Period">
          <select
            value={months}
            onChange={(e) => setFilters((prev) => ({ ...prev, months: Number(e.target.value) }))}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {TIME_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
        <ReportFilterField label="Search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search questions..."
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </ReportFilterField>
      </ReportFiltersRow>

      <div className="audit-table-wrapper h-full flex flex-col">
        <style dangerouslySetInnerHTML={{
          __html: `
            .audit-table-wrapper table {
              table-layout: fixed !important;
            }
            .audit-table-wrapper table td {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          `
        }} />
        <DataTable
          data={sortedData}
          columns={columns}
          sortConfig={sortConfig}
          onSort={handleSort}
          loading={loading}
          error={error}
          emptyMessage="No user questions found"
          striped={true}
        />
      </div>
    </ReportCard>
  );
};

export default AuditUserQuestionsView;

